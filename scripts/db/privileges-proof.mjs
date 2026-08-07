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
//   المرحلة ب — «بعد التحصين» — **تهبط مع هجرة التحصين، لا قبلها.**
//
// لماذا تُفصَل المرحلتان: فحص يقول «TRUNCATE ممنوع» بلا شاهد على أنه كان
// مسموحًا قد يكون ممنوعًا لسبب آخر تمامًا (دور بلا منح أصلًا). المرحلة أ هي
// التأكيد المضادّ الذي سيجعل المرحلة ب مستحقّة (§4.2).
//
// **RLS لا تحرس TRUNCATE.** صلاحية جدول لا صفّ، ولا سياسة تراها. لذلك لا يجوز
// الاتّكال على RLS في عملية ليست على مستوى الصفّ — وهذا محور هذه الحزمة.
//
// التشغيل: npm run test:privileges
// ============================================================================
import { createSandbox, asRole, makeUser, publicTables, privilegeMatrix, canTruncate } from './lib/supabase-sandbox.mjs'

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

// ── الخلاصة ────────────────────────────────────────────────────────────────
const failed = results.filter((r) => !r.pass)
console.log(`\n${failed.length === 0 ? '🎉' : '⛔'} ${results.length - failed.length} نجحت / ${failed.length} فشلت\n`)
if (failed.length) { failed.forEach((f) => console.log(`   ✗ ${f.name}`)); process.exit(1) }
