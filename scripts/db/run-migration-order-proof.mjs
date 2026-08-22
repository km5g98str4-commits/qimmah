// ============================================================================
// test:migration-order — ترتيب الهجرات وتبعياتها، **منفَّذًا لا مقروءًا**.
// [ADMIN-R4] · حارة لوحة المؤسس.
// ============================================================================
// ثلاثة عشر هجرة تنتظر التطبيق على قاعدة حيّة لم تُطبَّق عليها واحدة منها.
// وأخطر ما في ذلك ليس فشلًا صاخبًا بل **نجاحًا بالترتيب الخاطئ**: هجرة تعيد
// تعريف دالة `create or replace` إن سبقت الهجرة التي أنشأتها، تُكتب النسخة
// القديمة فوق الجديدة **بلا خطأ واحد** — فتبدو القاعدة سليمة وهي ناقصة.
//
// هذا الملف يفحص أربعة أشياء:
//   ① لا نسخة مكرّرة في أسماء الملفات (طابعان زمنيان متطابقان).
//   ② الترتيب المعجمي = الترتيب الزمني (ما يطبّقه Supabase CLI فعلًا).
//   ③ كل دالة معرَّفة في أكثر من ملف: الملفّ الأخير هو صاحب النسخة النهائية،
//      **ويُثبت ذلك بالتنفيذ** لا بالقراءة.
//   ④ التأكيد المضادّ: ترتيبٌ معكوس لملفّين متعاقبين يُنتج قاعدة **ناقصة بصمت**
//      — فيُثبت أن الترتيب حاكم وأن التحذير في وثيقة التطبيق ليس زخرفًا.
//
// التشغيل: npm run test:migration-order
// ============================================================================
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { createSandbox, migrationFiles, readMigration } from './lib/supabase-sandbox.mjs'

let pass = 0
const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  if (ok) pass += 1
  console.log(`  ${ok ? '✓' : '✗ FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  return ok
}

console.log('\nإثبات ترتيب الهجرات — منفَّذ')

const files = migrationFiles()
check(`الهجرات مقروءة من القرص (${files.length})`, files.length > 0)

// ═══════════════ ① لا نسخة مكرّرة ═══════════════
const versions = files.map((f) => f.slice(0, 14))
const dupes = versions.filter((v, i) => versions.indexOf(v) !== i)
check('لا طابع زمني مكرّر بين الهجرات', dupes.length === 0, [...new Set(dupes)].join(' '))
const malformed = files.filter((f) => !/^\d{14}_[a-z0-9_]+\.sql$/.test(f))
check('كل اسم ملف يطابق نمط <14 رقمًا>_<اسم>.sql', malformed.length === 0, malformed.join(' '))

// ═══════════════ ② المعجمي = الزمني ═══════════════
// Supabase CLI يطبّق بالترتيب المعجمي لأسماء الملفات. فإن كان طابع أحدها أصغر
// من سابقه معجميًا، طُبِّق قبله — ولو كُتب بعده.
const sortedByVersion = [...files].sort((a, b) => (a.slice(0, 14) < b.slice(0, 14) ? -1 : 1))
check('الترتيب المعجمي يطابق ترتيب الطوابع الزمنية', JSON.stringify(files) === JSON.stringify(sortedByVersion))

// ═══════════════ ③ الدوال المُعاد تعريفها — من صاحب النسخة النهائية ═══════════════
const definitionsOf = new Map()
for (const f of files) {
  const sql = readMigration(f)
  for (const m of sql.matchAll(/create or replace function ((?:public|private)\.[a-z0-9_]+)\s*\(/g)) {
    const name = m[1]
    if (!definitionsOf.has(name)) definitionsOf.set(name, [])
    if (!definitionsOf.get(name).includes(f)) definitionsOf.get(name).push(f)
  }
}
const redefined = [...definitionsOf.entries()].filter(([, fs]) => fs.length > 1)
check(`دوال معرَّفة في أكثر من هجرة (${redefined.length}) — تُفحَص بالتنفيذ`, redefined.length > 0)

const { db, failed } = await createSandbox()
check('كل الهجرات تُطبَّق بالترتيب الصحيح من قاعدة نظيفة', failed.length === 0, failed.map((f) => `${f.file}: ${f.message}`).join(' | '))

// النسخة الحيّة لكل دالة مُعاد تعريفها يجب أن تطابق **آخر** ملف يعرّفها.
const mismatched = []
for (const [name, fs] of redefined) {
  const last = fs[fs.length - 1]
  const [schema, fn] = name.split('.')
  const live = await db.query(
    `select p.prosrc from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = $1 and p.proname = $2`,
    [schema, fn],
  )
  if (live.rows.length === 0) continue
  const lastSql = readMigration(last)
  // ⚠️ **مقارنة الجسم حرفيًا لا ببصمة كلمة.**
  // أوّل صيغة بحثت عن «كلمة مميّزة» في نطاق ٤٠٠٠ حرف من الملف، فكان النطاق
  // يعبر إلى الدالة التالية ويلتقط كلماتها — فحصٌ يمرّ ويسقط بلا علاقة بمقصده.
  // و`prosrc` في Postgres هو **نصّ الجسم بين `$$` و`$$` حرفيًا**، فالمقارنة به
  // مباشرة أدقّ وأرخص معًا.
  const bodyStart = lastSql.indexOf(`create or replace function ${name}`)
  const dollarStart = lastSql.indexOf('as $$', bodyStart)
  const dollarEnd = lastSql.indexOf('$$;', dollarStart + 5)
  if (dollarStart < 0 || dollarEnd < 0) continue
  const expected = lastSql.slice(dollarStart + 5, dollarEnd)
  const squash = (t) => t.replace(/\s+/g, ' ').trim()
  const found = live.rows.some((r) => squash(r.prosrc) === squash(expected))
  if (!found) mismatched.push(`${name} ← ${last}`)
}
check('كل دالة حيّة تطابق آخر هجرة تعرّفها', mismatched.length === 0, mismatched.join(' | '))

// اللقطة التنفيذية تحديدًا: الحقول التي أضافتها آخر هجرة موجودة في الجسم الحيّ.
const snapSrc = await db.query(`select prosrc from pg_proc where proname = 'founder_executive_snapshot'`)
check('اللقطة الحيّة تحمل حقول آخر هجرة (webhookProcessed)', snapSrc.rows.some((r) => r.prosrc.includes('webhookProcessed')))
await db.close()

// ═══════════════ ④ التأكيد المضادّ — الترتيب المعكوس ينقص بصمت ═══════════════
console.log('\nالتأكيد المضادّ — ترتيبٌ معكوس ينتج قاعدة ناقصة بلا خطأ واحد')
const LATE = files.find((f) => f.includes('founder_snapshot_commerce_detail'))
const EARLY = files.find((f) => f.includes('founder_dashboard_reads'))
check('الملفّان المتعاقبان موجودان', Boolean(LATE) && Boolean(EARLY), `${EARLY} → ${LATE}`)

const swapped = files.filter((f) => f !== LATE)
const idx = swapped.indexOf(EARLY)
swapped.splice(idx, 0, LATE) // اللاحقة قبل السابقة

const badDb = await PGlite.create({ extensions: { pgcrypto } })
await badDb.exec(`
  create role anon; create role authenticated; create role service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text unique,
                           email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}'::jsonb);
  create or replace function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
`)
let sawError = false
for (const f of swapped) {
  try {
    await badDb.exec(readMigration(f))
  } catch {
    sawError = true
  }
}
// ⚠️ **جوهر التأكيد**: لا خطأ يُرفع — الفشل صامت تمامًا.
check('الترتيب المعكوس لا يرفع خطأً واحدًا — الفشل صامت', !sawError)
const badSnap = await badDb.query(`select prosrc from pg_proc where proname = 'founder_executive_snapshot'`)
check(
  'وبالترتيب المعكوس تختفي حقول الهجرة الأخيرة — قاعدة ناقصة تبدو سليمة',
  badSnap.rows.length > 0 && !badSnap.rows.some((r) => r.prosrc.includes('webhookProcessed')),
)
await badDb.close()

// ═══════════════ ⑤ الوثيقة تطابق الشجرة — رباط لا نيّة ═══════════════
// ⚠️ **الرباط على الوثيقة لا على الوسم.**
// أوّل صيغة فرضت وسم `APPLY_PENDING` في رأس كل هجرة غير مطبَّقة، فسقطت على
// عشرة ملفات كُتبت قبل أن يوجد الوسم. وفرضُ تعديلٍ على عشرة ملفات ليست ملك
// هذه الحارة ليس إصلاحًا بل توسيع نطاق. والعقد الحقيقي أصلًا ليس الوسم:
// **الوثيقة التي يقرأها المؤسس قبل أن يطبّق**. فالرباط عليها.
const PENDING_PREFIXES = ['20260806', '20260809', '20260812', '20260816', '20260822']
const pending = files.filter((f) => PENDING_PREFIXES.some((p) => f.startsWith(p)))
const APPLY_DOC = 'docs/execution/qimmah-sovereign-closure/MIGRATIONS-APPLY-PENDING.md'
const { readFileSync, existsSync } = await import('node:fs')
const { resolve } = await import('node:path')
const { ROOT } = await import('./lib/supabase-sandbox.mjs')
const docPath = resolve(ROOT, APPLY_DOC)
check('وثيقة التطبيق موجودة', existsSync(docPath), APPLY_DOC)
const doc = existsSync(docPath) ? readFileSync(docPath, 'utf8') : ''
const missingFromDoc = pending.filter((f) => !doc.includes(f))
check(`الوثيقة تسمّي كل هجرة منتظرة (${pending.length})`, missingFromDoc.length === 0, missingFromDoc.join(' '))
// وترتيبها في الوثيقة هو ترتيب التطبيق نفسه — وثيقةٌ ترتّب خطأً أخطر من لا وثيقة.
const docOrder = pending.map((f) => doc.indexOf(f))
check('ترتيب الوثيقة = ترتيب التطبيق', docOrder.every((v, i) => i === 0 || v > docOrder[i - 1]))
// وخطوة الملح اليدوية مذكورة: بدونها **كل** دالة كتابة ترفع استثناءً.
check('الوثيقة تذكر خطوة بذر الملح اليدوية', doc.includes('identity_pepper'))
check('الوثيقة تحمل استعلام تحقّق بعد كل خطوة', (doc.match(/select /gi) ?? []).length >= pending.length)
// وسمٌ على ملفّ **مطبَّق** يكذب في الاتجاه الآخر — يُفحَص أيضًا.
const markedButApplied = files.filter((f) => !pending.includes(f) && readMigration(f).includes('APPLY_PENDING'))
check('لا وسم APPLY_PENDING على هجرة مطبَّقة', markedButApplied.length === 0, markedButApplied.join(' '))

const failedCount = results.filter((r) => !r.ok).length
console.log(`\n${failedCount === 0 ? '✅' : '❌'} ${pass}/${results.length} فحصًا — ترتيب الهجرات\n`)
if (failedCount > 0) {
  for (const r of results.filter((x) => !x.ok)) console.error(`   ✗ ${r.name}`)
  console.error(`FAIL: ${failedCount} فحصًا سقط في إثبات ترتيب الهجرات`)
  process.exit(1)
}
