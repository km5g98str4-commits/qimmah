// ============================================================================
// test:privileges — صلاحيات الجداول: تصوير الثغرة، ثم إثبات إغلاقها.
// ============================================================================
// يشغّل **كل** هجرات المستودع من قاعدة Postgres نظيفة (PGlite) مرّتين:
//
//   المرحلة أ — «ما قبل التحصين»: كل الهجرات **عدا** هجرة التحصين.
//       تُصوِّر الثغرة وتثبتها بالتنفيذ: TRUNCATE ينجح فعلًا فتُمحى بيانات
//       مستخدم آخر. هذه المرحلة **شاهد انحدار دائم**: إن حُذفت هجرة التحصين
//       يومًا، يبقى هنا وصفٌ منفَّذ لما يعود بالضبط.
//
//   المرحلة ب — «بعد التحصين»: السلسلة كاملة.
//       تُثبت المصفوفة الأقلّ صلاحيةً: TRUNCATE ممنوع لكل دور عميل، وسلوك
//       CRUD المقصود سليم، والعزل بين حسابين قائم، ودوال SECURITY DEFINER تعمل.
//
//   المرحلة ج — انتهاك مزروع: يُعاد المنح الافتراضي القديم فوق السلسلة
//       المحصَّنة، ويجب أن تسقط فحوص المرحلة ب. حارس لا يسقط عند إعادة العلّة
//       ليس حارسًا (§4.2).
//
// لماذا ثلاث مراحل: فحص يقول «TRUNCATE ممنوع» بلا شاهد على أنه كان مسموحًا قد
// يكون ممنوعًا لسبب آخر تمامًا (دور بلا منح أصلًا).
//
// **RLS لا تحرس TRUNCATE.** صلاحية جدول لا صفّ، ولا سياسة تراها. لذلك لا يجوز
// الاتّكال على RLS في عملية ليست على مستوى الصفّ — وهذا محور هذه الحزمة.
//
// التشغيل: npm run test:privileges
// ============================================================================
import { createSandbox, asRole, makeUser, publicTables, privilegeMatrix, canTruncate, CLIENT_ROLES } from './lib/supabase-sandbox.mjs'

/**
 * الجداول التي يكتب فيها العميل مباشرةً (طبقة المزامنة) — تحتاج CRUD كاملًا،
 * وRLS هي التي تحصر كل عملية في صفوف المالك.
 */
const SYNC_TABLES = [
  'profiles', 'workout_sessions', 'exercise_history', 'measurement_logs',
  'daily_logs', 'nutrition_logs', 'water_logs', 'supplement_logs',
  'medication_logs', 'step_logs', 'achievements', 'custom_plans', 'todos',
  'nutrition_ledger', 'recovery_logs', 'workout_schedule', 'plan_templates',
]
/** جداول الوصول: قراءة المالك فقط، ولا كتابة عميل إطلاقًا (كل كتابة عبر RPC). */
const READ_ONLY_TABLES = ['entitlements', 'access_code_redemptions']
/** جداول لا يراها عميل إطلاقًا. */
const INVISIBLE_TABLES = ['access_codes', 'trial_ledger', 'purchase_ledger', 'code_redemption_ledger']

async function mustFail(name, fn, expect) {
  try {
    await fn()
    return check(name, false, 'لم يُرفع أي استثناء — المسار مفتوح')
  } catch (e) {
    const m = String(e.message || e)
    return check(name, m.includes(expect), m.includes(expect) ? '' : `توقّعنا "${expect}" فجاء: ${m.slice(0, 110)}`)
  }
}

const HARDENING = '20260806120003_table_privileges_hardening.sql'

/** صلاحيات لا يجوز لدور عميل امتلاكها على أي جدول، مهما كان. */
const FORBIDDEN_FOR_CLIENTS = ['TRUNCATE', 'REFERENCES', 'TRIGGER']

const results = []
function check(name, pass, detail = '') {
  results.push({ name, pass })
  console.log(`  ${pass ? '✓' : '✗ FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  return pass
}
process.on('uncaughtException', (e) => {
  console.error(`\n⛔ توقّف باستثناء غير متوقّع:\n   ${String(e.message || e).split('\n')[0]}`)
  if (e.query) console.error(`   عند: ${String(e.query).trim().split('\n')[0]}`)
  process.exit(1)
})

// ════════════════════════════════════════════════════════════════════════════
console.log('\n🔓 المرحلة أ — تصوير الثغرة (السلسلة بلا هجرة التحصين)\n')
// ════════════════════════════════════════════════════════════════════════════
{
  const { db, applied, failed } = await createSandbox({ exclude: [HARDENING] })
  check('كل الهجرات تُطبَّق من قاعدة نظيفة', failed.length === 0,
    failed.length ? failed.map((f) => f.file).join(', ') : `${applied.length} هجرة`)

  const tables = await publicTables(db)
  const matrix = await privilegeMatrix(db)

  // ── الجرد الكامل ────────────────────────────────────────────────────────
  console.log('\n  الجرد — جدول × دور × صلاحيات:\n')
  console.log('  ' + 'TABLE'.padEnd(26) + 'OWNER'.padEnd(10) + 'RLS'.padEnd(12) + 'anon'.padEnd(6) + 'authenticated')
  const exposed = []
  for (const t of tables) {
    const anon = matrix[t.table_name]?.anon ?? []
    const auth = matrix[t.table_name]?.authenticated ?? []
    const rls = `${t.rls_enabled ? 'on' : 'OFF'}/${t.rls_forced ? 'forced' : 'plain'}`
    const bad = auth.filter((p) => FORBIDDEN_FOR_CLIENTS.includes(p))
    if (bad.length) exposed.push(t.table_name)
    console.log('  ' + t.table_name.padEnd(26) + String(t.owner).padEnd(10) + rls.padEnd(12) +
      String(anon.length).padEnd(6) + (auth.join(',') || '(none)'))
  }
  console.log(`\n  جداول عليها صلاحية محظورة لدور عميل: ${exposed.length} من ${tables.length}`)

  check('RLS مفعّل على كل جدول', tables.every((t) => t.rls_enabled), tables.filter((t) => !t.rls_enabled).map((t) => t.table_name).join(', '))
  check('الثغرة قائمة قبل التحصين (جداول مكشوفة > 0)', exposed.length > 0, `${exposed.length} جدولًا`)

  // ── الاستغلال الفعلي: مستخدم يمحو بيانات مستخدم آخر ────────────────────
  const A = await makeUser(db, 'victim@example.com')
  const B = await makeUser(db, 'attacker@example.com')
  await asRole(db, null)
  await db.query(`insert into public.workout_sessions (user_id, local_id, date, data)
                  values ($1, 'victim-1', '2026-08-01', '{}'::jsonb)`, [A])
  const before = (await db.query(`select count(*)::int n from public.workout_sessions`)).rows[0].n

  await asRole(db, 'authenticated', B)
  // RLS تمنعه من رؤية صفّ الضحية…
  const seen = (await db.query(`select count(*)::int n from public.workout_sessions`)).rows[0].n
  check('RLS تخفي صفّ الضحية عن المهاجم (SELECT)', seen === 0, `${seen} صفًّا مرئيًا`)
  // …ثم لا تمنعه من محو الجدول كلّه.
  let truncated = false
  try { await db.exec(`truncate public.workout_sessions`); truncated = true } catch { truncated = false }
  await asRole(db, null)
  const after = (await db.query(`select count(*)::int n from public.workout_sessions`)).rows[0].n
  check('⚠️ الاستغلال: مهاجم يمحو صفوف الضحية بـTRUNCATE', truncated && before === 1 && after === 0,
    `قبل=${before} بعد=${after}`)

  // نطاق الثغرة على كل الجداول، بالتنفيذ لا بالاستنتاج
  const truncatable = []
  for (const t of tables) if (await canTruncate(db, 'authenticated', t.table_name)) truncatable.push(t.table_name)
  check('نطاق الثغرة مقيس بالتنفيذ', truncatable.length === exposed.length,
    `${truncatable.length} جدولًا قابلًا للمحو`)
  console.log(`\n  ⚠️  قابلة للمحو من أي مستخدم مسجَّل: ${truncatable.length} جدولًا`)
  console.log('     ' + truncatable.join(', ') + '\n')
  await db.close()
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n🔒 المرحلة ب — بعد التحصين (السلسلة كاملة)\n')
// ════════════════════════════════════════════════════════════════════════════
{
  const { db, applied, failed } = await createSandbox()
  check('السلسلة كاملة تُطبَّق من قاعدة نظيفة', failed.length === 0,
    failed.length ? failed.map((f) => f.file).join(', ') : `${applied.length} هجرة`)

  const tables = await publicTables(db)
  const matrix = await privilegeMatrix(db)

  console.log('\n  المصفوفة بعد التحصين:\n')
  console.log('  ' + 'TABLE'.padEnd(26) + 'anon'.padEnd(8) + 'authenticated'.padEnd(30) + 'service_role')
  for (const t of tables) {
    const anon = (matrix[t.table_name]?.anon ?? []).join(',') || '—'
    const auth = (matrix[t.table_name]?.authenticated ?? []).join(',') || '—'
    const svc = (matrix[t.table_name]?.service_role ?? []).length
    console.log('  ' + t.table_name.padEnd(26) + anon.padEnd(8) + auth.padEnd(30) + `${svc} priv`)
  }
  console.log('')

  // ── ١) لا صلاحية محظورة لأي دور عميل، على أي جدول ──────────────────────
  const violations = []
  for (const t of tables) {
    for (const role of CLIENT_ROLES) {
      const bad = (matrix[t.table_name]?.[role] ?? []).filter((p) => FORBIDDEN_FOR_CLIENTS.includes(p))
      if (bad.length) violations.push(`${t.table_name}.${role}=${bad.join('/')}`)
    }
  }
  check('لا TRUNCATE/REFERENCES/TRIGGER لأي دور عميل على أي جدول',
    violations.length === 0, violations.join(' '))

  // ── ٢) TRUNCATE ممنوع بالتنفيذ لا بالمصفوفة وحدها ──────────────────────
  const stillTruncatable = []
  for (const t of tables) {
    for (const role of CLIENT_ROLES) {
      if (await canTruncate(db, role, t.table_name)) stillTruncatable.push(`${t.table_name}/${role}`)
    }
  }
  check('TRUNCATE مرفوض فعليًا على كل جدول × كل دور عميل',
    stillTruncatable.length === 0, stillTruncatable.join(', ') || `${tables.length * 2} تركيبة`)

  // ── ٣) anon بلا أي صلاحية جدول ─────────────────────────────────────────
  const anonHas = tables.filter((t) => (matrix[t.table_name]?.anon ?? []).length > 0).map((t) => t.table_name)
  check('anon بلا أي صلاحية جدول', anonHas.length === 0, anonHas.join(', '))

  // ── ٤) الشكل المقصود لكل فئة ───────────────────────────────────────────
  const shape = (name) => (matrix[name]?.authenticated ?? []).slice().sort().join(',')
  const syncWrong = SYNC_TABLES.filter((t) => shape(t) !== 'DELETE,INSERT,SELECT,UPDATE')
  check('جداول المزامنة: CRUD فقط لا أكثر', syncWrong.length === 0, syncWrong.join(', '))
  const roWrong = READ_ONLY_TABLES.filter((t) => shape(t) !== 'SELECT')
  check('جداول الوصول المقروءة: SELECT فقط', roWrong.length === 0, roWrong.join(', '))
  const invWrong = INVISIBLE_TABLES.filter((t) => shape(t) !== '')
  check('الأكواد والسجلّات: لا صلاحية إطلاقًا', invWrong.length === 0, invWrong.join(', '))

  // ── ٥) service_role يبقى قادرًا على الإدارة ────────────────────────────
  const svcMissing = tables.filter((t) => !(matrix[t.table_name]?.service_role ?? []).includes('SELECT')).map((t) => t.table_name)
  check('service_role يحتفظ بصلاحياته الإدارية', svcMissing.length === 0, svcMissing.join(', '))

  // ── ٦) سلوك العميل المقصود لم يُكسَر ───────────────────────────────────
  const A = await makeUser(db, 'own@example.com')
  const B = await makeUser(db, 'other@example.com')

  await asRole(db, 'authenticated', A)
  await db.query(`insert into public.workout_sessions (user_id, local_id, date, data)
                  values ($1,'a-1','2026-08-01','{}'::jsonb)`, [A])
  check('المالك ما زال يُدرِج صفّه', true)
  const own = await db.query(`select count(*)::int n from public.workout_sessions`)
  check('المالك يقرأ صفّه', own.rows[0].n === 1)
  await db.query(`update public.workout_sessions set data='{"x":1}'::jsonb where user_id=$1`, [A])
  check('المالك يعدّل صفّه', true)

  await asRole(db, 'authenticated', B)
  await db.query(`insert into public.workout_sessions (user_id, local_id, date, data)
                  values ($1,'b-1','2026-08-01','{}'::jsonb)`, [B])
  const crossSel = await db.query(`select count(*)::int n from public.workout_sessions`)
  check('عزل حسابين: B يرى صفّه فقط', crossSel.rows[0].n === 1)
  const crossUpd = await db.query(`update public.workout_sessions set data='{"h":1}'::jsonb where user_id=$1 returning id`, [A])
  check('تعديل صفّ الغير لا يمسّ شيئًا', crossUpd.rows.length === 0)
  const crossDel = await db.query(`delete from public.workout_sessions where user_id=$1 returning id`, [A])
  check('حذف صفّ الغير لا يمسّ شيئًا', crossDel.rows.length === 0)
  await asRole(db, null)
  const survived = await db.query(`select count(*)::int n from public.workout_sessions where user_id=$1`, [A])
  check('صفّ A نجا من محاولات B كلّها', survived.rows[0].n === 1)

  // المالك يحذف صفّه هو — السلوك المقصود يبقى
  await asRole(db, 'authenticated', A)
  const ownDel = await db.query(`delete from public.workout_sessions where user_id=$1 returning id`, [A])
  check('المالك ما زال يحذف صفّه هو', ownDel.rows.length === 1)

  // ── ٧) دوال SECURITY DEFINER ما زالت تعمل ──────────────────────────────
  await asRole(db, null)
  await db.exec(`insert into private.identity_pepper (version, pepper)
                 values (1, 'pepper-hardening-0123456789abcdef0123')`)
  await asRole(db, 'authenticated', A)
  const st = await db.query(`select public.start_trial() as s`)
  check('start_trial() يعمل بعد التحصين', st.rows[0].s === 'trialActive')
  const me = await db.query(`select state from public.my_entitlement()`)
  check('my_entitlement() يعمل بعد التحصين', me.rows[0].state === 'trialActive')
  await mustFail('العميل ما زال ممنوعًا من الكتابة المباشرة على المنح',
    () => db.query(`update public.entitlements set no_expiry = true where user_id=$1`, [A]), 'permission denied')

  await asRole(db, 'service_role')
  const gp = await db.query(`select public.admin_grant_premium('other@example.com','manual','ORD-H1',1999,null) as s`)
  check('admin_grant_premium() يعمل بـservice_role', gp.rows[0].s === 'premiumActive')
  await asRole(db, 'authenticated', B)
  const bState = await db.query(`select state from public.my_entitlement()`)
  check('المنحة الإدارية تصل المستخدم', bState.rows[0].state === 'premiumActive')

  // ── ٨) delete_own_account ما زال يعمل بعد سحب الصلاحيات ────────────────
  await asRole(db, 'authenticated', B)
  await db.query(`select public.delete_own_account()`)
  await asRole(db, null)
  const gone = await db.query(`select count(*)::int n from auth.users where id=$1`, [B])
  check('delete_own_account() يعمل بعد التحصين', gone.rows[0].n === 0)
  const ledgerKept = await db.query(`select count(*)::int n from public.purchase_ledger`)
  check('سجلّ الشراء ما زال ينجو من الحذف', ledgerKept.rows[0].n === 1)

  await db.close()
}


// ════════════════════════════════════════════════════════════════════════════
console.log('\n🧪 المرحلة ج — انتهاك مزروع: هل يسقط الحارس إن عادت العلّة؟\n')
// ════════════════════════════════════════════════════════════════════════════
{
  const { db } = await createSandbox()
  // نُعيد بالضبط ما كانت تفعله امتيازات Supabase الافتراضية قبل التحصين.
  await db.exec(`grant all on public.workout_sessions to authenticated;`)

  const m = await privilegeMatrix(db)
  const bad = (m['workout_sessions']?.authenticated ?? []).filter((p) => FORBIDDEN_FOR_CLIENTS.includes(p))
  check('الانتهاك المزروع يظهر في المصفوفة', bad.length > 0, bad.join(','))

  const truncatable = await canTruncate(db, 'authenticated', 'workout_sessions')
  check('الانتهاك المزروع يعيد الثغرة فعليًا (TRUNCATE ينجح)', truncatable === true)

  // نفس منطق المرحلة ب حرفيًا — لو مرّ هنا لكان الفحص زينة.
  const shape = (m['workout_sessions']?.authenticated ?? []).slice().sort().join(',')
  check('فحص المرحلة ب يسقط على الانتهاك المزروع', shape !== 'DELETE,INSERT,SELECT,UPDATE', shape)
  await db.close()
}

// ── الخلاصة ────────────────────────────────────────────────────────────────
const failed = results.filter((r) => !r.pass)
console.log(`\n${failed.length === 0 ? '🎉' : '⛔'} ${results.length - failed.length} نجحت / ${failed.length} فشلت\n`)
if (failed.length) { failed.forEach((f) => console.log(`   ✗ ${f.name}`)); process.exit(1) }
