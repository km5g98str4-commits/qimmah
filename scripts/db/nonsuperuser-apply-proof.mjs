#!/usr/bin/env node
// ============================================================================
// إثبات: الهجرات تُطبَّق **بلا صلاحية superuser** — [STAGING-COMMISSIONING §4]
// ============================================================================
// ═══ الواقعة التي أوجبت هذا الملف ═══
// أُنشئ مشروع staging حقيقي، فسقط أول تشغيل بـ:
//
//   42501: permission denied to alter role
//   DETAIL: Only superusers can alter privileged roles.
//
// وتبيّن سببان، والثاني هو الخطير:
//
//   ① `supabase-shim.sql` شُغِّل على القاعدة الحقيقية. وهو يُنشئ أدوار Supabase
//      ويمنحها امتيازات — أي أنه يجعل Postgres عاديًّا **يشبه** Supabase، لا
//      شيئًا يُشغَّل **على** Supabase. صار له حارسٌ يرفض ذلك بسببٍ مسمّى.
//
//   ② **وكل إثباتاتنا كانت تعمل بصلاحية superuser.** وSupabase لا يعطيها:
//      دور `postgres` هناك `nosuperuser`. فكان يمكن أن تحمل هجراتُنا عبارةً
//      تحتاج superuser ولا نعرف حتى ليلة التشغيل — وهو أسوأ وقت للاكتشاف.
//
// ═══ وما كشفه هذا الفحص فعلًا ═══
// `20260809120003_public_execute_hardening.sql` كان **يسقط** بدور غير متميّز:
// شيمنا يضع `pgcrypto` في `public` (افتراض Postgres)، فتظهر دوالّه هناك
// ويحاول نزع `execute` عنها — وهي مملوكة للامتداد فلا ينزعها إلا superuser.
// وSupabase يضعه في `extensions`، فلا وجود له في `public` أصلًا.
//
// أي أن الصندوق كان يختبر **شكل مخطّط لا وجود له في الإنتاج**. نُقل الامتداد
// في الشيم إلى `extensions`، فصارت الهجرات الثلاث والثلاثون تمرّ بلا superuser.
//
// ⚠️ **حدٌّ معلَن:** هذه محاكاةٌ أمينة لا Supabase. تُثبت أن **هجراتنا** لا
// تطلب superuser؛ ولا تُثبت أن كل ما تفعله المنصّة يطابق هذا. تبقى النتيجة
// أقوى دليلٍ متاح قبل التشغيل الفعلي — لا بديلًا عنه.
// ============================================================================
import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const MIGRATIONS = join(ROOT, 'supabase/migrations')
const SHIM = join(ROOT, 'scripts/db/lib/supabase-shim.sql')
const HOST = '127.0.0.1'
const PORT = process.env.QIMMAH_PG_PORT || '55432'
const SUPER = `postgres://postgres@${HOST}:${PORT}/postgres`
const DB = `qimmah_nonsuper_${Date.now().toString(36)}`
const ROLE = `sb_pg_${Date.now().toString(36)}`

let pass = 0
const fails = []
const check = (l, c, d = '') => {
  if (c) { pass += 1; console.log(`  ✓ ${l}${d ? `  — ${d}` : ''}`) }
  else { fails.push(l); console.log(`  ✗ FAIL: ${l}${d ? `  — ${d}` : ''}`) }
}
const psql = (url, args) => execFileSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-t', '-A', ...args],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const sql = (url, s) => psql(url, ['-c', s])

try { execFileSync('pg_isready', ['-h', HOST, '-p', PORT], { stdio: 'ignore' }) } catch {
  console.log(`\n⛔ EXTERNALLY_BLOCKED: لا عنقود Postgres على ${HOST}:${PORT} — الإثبات لم يُشغَّل.`)
  process.exit(2)
}

console.log('\n══ الهجرات بلا superuser — محاكاة دور postgres في Supabase ══')

try {
  // دورٌ يحاكي `postgres` في Supabase: ينشئ ويملك، **ولا يملك superuser**.
  sql(SUPER, `create role ${ROLE} login nosuperuser createrole createdb;`)
  sql(SUPER, `create database ${DB} owner ${ROLE};`)
  const asSuper = `postgres://postgres@${HOST}:${PORT}/${DB}`
  const asRole = `postgres://${ROLE}@${HOST}:${PORT}/${DB}`

  // المنصّة تُنشئ الأدوار والمخطّطات قبل أن يصلها أحد — وهذا ما يفعله الشيم.
  psql(asSuper, ['-f', SHIM])
  check('الدور المحاكي ليس superuser — وإلا كان الإثبات تحصيل حاصل',
    sql(SUPER, `select rolsuper from pg_roles where rolname='${ROLE}';`).trim() === 'f')

  for (const g of [
    `grant usage, create on schema public to ${ROLE}`,
    `grant usage, create on schema private to ${ROLE}`,
    `grant usage on schema auth to ${ROLE}`,
    `grant all on all tables in schema auth to ${ROLE}`,
    `grant usage on schema extensions to ${ROLE}`,
    `grant anon, authenticated, service_role to ${ROLE}`,
  ]) { try { sql(asSuper, `${g};`) } catch { /* ما لا يلزم لا يُشترط */ } }

  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()
  let applied = 0
  let firstFail = null
  for (const f of files) {
    try { psql(asRole, ['-f', join(MIGRATIONS, f)]); applied += 1 } catch (e) {
      firstFail = { f, msg: String(e.stderr || e.message || '').split('\n').find((l) => /ERROR/.test(l)) || '' }
      break
    }
  }
  check(`كل الهجرات تُطبَّق بلا superuser (${files.length})`,
    applied === files.length,
    firstFail ? `سقطت عند ${firstFail.f}: ${firstFail.msg.slice(0, 150)}` : `${applied}/${files.length}`)

  // ⟲ **التأكيد المضادّ:** الفحص قادر على الرسوب. عبارةٌ تحتاج superuser
  // تُجرَّب بنفس الدور فتُرفض — فلو مرّت الهجرات لأنها لا تُنفَّذ أصلًا لظهر ذلك.
  let refused = ''
  try { sql(asRole, `alter role authenticated bypassrls;`) }
  catch (e) { refused = String(e.stderr || e.message || '') }
  check('⟲ ونفس الدور يُرفض عند عبارةٍ تحتاج superuser — فالبيئة تقيّد فعلًا',
    /permission denied|must be superuser/i.test(refused), refused.split('\n')[0].slice(0, 110))

  // ⟲ وpgcrypto حيث تضعه Supabase، لا حيث يضعه Postgres افتراضًا.
  check('⟲ وpgcrypto في `extensions` — مطابقةً للإنتاج لا لافتراض Postgres',
    sql(asSuper, `select n.nspname from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgcrypto';`).trim() === 'extensions')
  check('  ولا دالّة pgcrypto واحدة في `public` — وهو ما يجعل تحصين public يمرّ',
    sql(asSuper, `select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('digest','hmac','gen_random_bytes','crypt');`).trim() === '0')
} finally {
  try { sql(SUPER, `drop database if exists ${DB};`) } catch { /* تنظيف */ }
  try { sql(SUPER, `drop role if exists ${ROLE};`) } catch { /* تنظيف */ }
}

console.log(`\n${fails.length === 0 ? '✅' : '❌'} تطبيق بلا superuser: ${pass} فحصًا · ${fails.length} فشل`)
if (fails.length) { fails.forEach((f) => console.log(`   • ${f}`)); process.exit(1) }
