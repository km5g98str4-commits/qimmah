#!/usr/bin/env node
// ============================================================================
// إثبات حِزَم اللصق — [STAGING-COMMISSIONING]
// ============================================================================
// الحِزَم نسخةٌ مشتقّة من الهجرات، ونسخةٌ مشتقّة **تشيخ بصمت**: تُعدَّل هجرة
// ولا تُعاد الحزم، فيلصق المؤسس مخطَّطًا لا يطابق المستودع ولا يشتكي أحد.
// فيُحرَس أمران: ألّا تنحرف، وأن تعمل فعلًا.
//
// ⚠️ **وأهمّها الثالث:** ترويسة كل حزمة تَعِد بأن «إعادة اللصق آمنة». وأوّل
// صيغة كانت تطبع «تخطٍّ» ثم تطبّق الهجرة على أي حال، فسقطت الإعادة بـ
// `cannot change return type of existing function`. الوعد المكتوب يُقرأ
// ويُعتمد عليه — فيُقاس هنا لا يُفترض.
// ============================================================================
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = join(ROOT, 'docs/execution/qimmah-sovereign-closure/staging-sql')
const MIGRATIONS = join(ROOT, 'supabase/migrations')
const HOST = '127.0.0.1'
const PORT = process.env.QIMMAH_PG_PORT || '55432'
const SUPER = `postgres://postgres@${HOST}:${PORT}/postgres`

let pass = 0
const fails = []
const check = (l, c, d = '') => {
  if (c) { pass += 1; console.log(`  ✓ ${l}${d ? `  — ${d}` : ''}`) }
  else { fails.push(l); console.log(`  ✗ FAIL: ${l}${d ? `  — ${d}` : ''}`) }
}
const psql = (url, args) => execFileSync('psql', [url, '-X', '-q', '-t', '-A', ...args],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const sql = (url, s) => psql(url, ['-v', 'ON_ERROR_STOP=1', '-c', s])

console.log('\n══ حِزَم اللصق ══')

// ── ١) لا انحراف عن الهجرات ───────────────────────────────────────────────
const before = readdirSync(OUT).filter((f) => f.endsWith('.sql')).sort()
  .map((f) => readFileSync(join(OUT, f), 'utf8')).join('\n')
execFileSync('node', [join(ROOT, 'scripts/staging/build-sql-bundle.mjs')], { cwd: ROOT, stdio: 'ignore' })
const after = readdirSync(OUT).filter((f) => f.endsWith('.sql')).sort()
  .map((f) => readFileSync(join(OUT, f), 'utf8')).join('\n')
check('الحِزَم المُسلَّمة مطابقة لما يولّده المستودع الآن — لا انحراف صامت',
  before === after, before === after ? '' : 'أعِد التوليد: node scripts/staging/build-sql-bundle.mjs')

const migCount = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).length
const bundles = readdirSync(OUT).filter((f) => f.endsWith('.sql')).sort()
const covered = bundles.reduce((a, f) => a + (readFileSync(join(OUT, f), 'utf8').match(/schema_migrations \(version, name\)/g) || []).length, 0)
check(`وكل هجرة مُغطّاة بحزمة (${migCount})`, covered === migCount, `${covered}/${migCount}`)
// ⚠️ المطابقة على **عبارة البذر** لا على ورود الاسم: جدول `identity_pepper`
// تنشئه هجرة في حزمة أخرى، فالبحث عن الاسم وحده يعدّ حزمتين ويُسقط الفحص بلا سبب.
const seeders = bundles.filter((f) =>
  /insert into private\.identity_pepper \(version, pepper\)/.test(readFileSync(join(OUT, f), 'utf8')))
check('وبذرة الملح في حزمة واحدة — الأخيرة',
  seeders.length === 1 && seeders[0] === bundles[bundles.length - 1], seeders.join(' '))

try { execFileSync('pg_isready', ['-h', HOST, '-p', PORT], { stdio: 'ignore' }) } catch {
  console.log('\n⛔ EXTERNALLY_BLOCKED: لا عنقود Postgres — فحوص التطبيق لم تُشغَّل.')
  console.log(`\n${fails.length === 0 ? '✅' : '❌'} حِزَم اللصق: ${pass} فحصًا · ${fails.length} فشل`)
  process.exit(fails.length ? 1 : 2)
}

// ── ٢) تعمل فعلًا — بدور غير متميّز، كما في لوحة Supabase ─────────────────
const DB = `qimmah_bundle_${Date.now().toString(36)}`
const ROLE = `sb_b_${Date.now().toString(36)}`
try {
  sql(SUPER, `create role ${ROLE} login nosuperuser createrole createdb;`)
  sql(SUPER, `create database ${DB} owner ${ROLE};`)
  const asSuper = `postgres://postgres@${HOST}:${PORT}/${DB}`
  const asRole = `postgres://${ROLE}@${HOST}:${PORT}/${DB}`
  psql(asSuper, ['-v', 'ON_ERROR_STOP=1', '-f', join(ROOT, 'scripts/db/lib/supabase-shim.sql')])
  for (const g of [
    `grant usage, create on schema public to ${ROLE}`, `grant usage, create on schema private to ${ROLE}`,
    `grant usage on schema auth to ${ROLE}`, `grant all on all tables in schema auth to ${ROLE}`,
    `grant usage on schema extensions to ${ROLE}`, `grant anon, authenticated, service_role to ${ROLE}`,
  ]) { try { sql(asSuper, `${g};`) } catch { /* ما لا يلزم لا يُشترط */ } }

  let firstFail = null
  for (const f of bundles) {
    try { psql(asRole, ['-v', 'ON_ERROR_STOP=1', '-f', join(OUT, f)]) } catch (e) {
      firstFail = `${f}: ${String(e.stderr || '').split('\n').find((l) => /ERROR/.test(l)) || ''}`
      break
    }
  }
  check(`الحِزَم تُطبَّق على قاعدة نظيفة بدور غير متميّز (${bundles.length})`,
    firstFail === null, firstFail ? firstFail.slice(0, 150) : '')

  if (firstFail === null) {
    const row = sql(asRole, `select
      (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'),
      (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity),
      (select count(*) from information_schema.role_table_grants where grantee='anon' and table_schema='public' and privilege_type in ('INSERT','UPDATE','DELETE')),
      (select count(*) from private.identity_pepper),
      (select count(*) from supabase_migrations.schema_migrations);`).trim().split('|')
    const [tables, withRls, anonWrites, pepper, migs] = row
    check('وصفّ التحقّق يقول ما يجب: RLS على كل جدول', tables === withRls, `${withRls}/${tables}`)
    check('  ولا منحة كتابة للزائر', anonWrites === '0', anonWrites)
    check('  والملح مبذور — وبدونه ترفع كل دالّة كتابة', pepper === '1', pepper)
    check(`  وكل الهجرات مسجَّلة (${migCount})`, migs === String(migCount), migs)

    // ── ٣) الوعد المكتوب: إعادة اللصق آمنة ──────────────────────────────
    let reFail = null
    let skips = 0
    for (const f of bundles) {
      try {
        // ⚠️ `NOTICE` يخرج على **stderr** لا stdout، و`-q` يكتم ما عداه. فتُدمج
        // القناتان هنا وإلا عُدّ التخطّي صفرًا وسقط الفحص على أداته لا على شأنه.
        const out = execFileSync('psql',
          [asRole, '-X', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-f', join(OUT, f)],
          { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
        const errOut = execFileSync('bash',
          ['-c', `psql "${asRole}" -X -t -A -v ON_ERROR_STOP=1 -f "${join(OUT, f)}" 2>&1 1>/dev/null`],
          { encoding: 'utf8' })
        skips += ((out + errOut).match(/تخطٍّ/g) || []).length
      } catch (e) {
        reFail = `${f}: ${String(e.stderr || '').split('\n').find((l) => /ERROR/.test(l)) || ''}`
        break
      }
    }
    check('⚔️ وإعادة لصق الحِزَم كلّها لا تسقط — الوعد المكتوب في ترويستها صحيح',
      reFail === null, reFail ? reFail.slice(0, 150) : '')
    check(`  والتخطّي **حقيقي** لا إشعارٌ يدّعيه (${migCount} تخطٍّ)`,
      skips === migCount, `${skips}/${migCount}`)
    // ⟲ لو كان التخطّي إشعارًا فقط لأعادت الحزم التطبيق فسقطت — وهو ما وقع فعلًا
    //    في أوّل صيغة. فبقاء العدد مطابقًا هو الدليل على أنها لم تُنفَّذ.
    check('⟲ ولا هجرة سُجِّلت مرّتين', sql(asRole, `select count(*) from supabase_migrations.schema_migrations;`).trim() === String(migCount))
  }
} finally {
  try { sql(SUPER, `drop database if exists ${DB};`) } catch { /* تنظيف */ }
  try { sql(SUPER, `drop role if exists ${ROLE};`) } catch { /* تنظيف */ }
}

console.log(`\n${fails.length === 0 ? '✅' : '❌'} حِزَم اللصق: ${pass} فحصًا · ${fails.length} فشل`)
if (fails.length) { fails.forEach((f) => console.log(`   • ${f}`)); process.exit(1) }
