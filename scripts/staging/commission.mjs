#!/usr/bin/env node
// ============================================================================
// تشغيل قاعدة staging — أمرٌ واحد، من قاعدة نظيفة إلى بيئة مُثبَتة
// ============================================================================
// [STAGING-COMMISSIONING §4 · §15 · §20]
//
// ═══ لماذا وُجد هذا الملف ═══
// كان الطريق إلى بيئة تجريبية عاملة **وثيقةً يقرؤها إنسان ويطبّقها بيده**:
// اثنتان وثلاثون هجرة بترتيب مُلزَم · بذرة ملح لا تنشئها أي هجرة (لأنها سرّ) ·
// إسناد دور مؤسس · ثم لا شيء يقول «نجح». والخطوة المنسيّة لا تشتكي: تُطبَّق
// الهجرات كاملةً، ويبدو كل شيء سليمًا، ثم ترفع **كل** دالّة كتابة
// `identity_pepper: no active version` عند أول مستخدم حقيقي.
//
// ═══ وما يميّزه عن «تطبيق الهجرات» ═══
// يُنهي عمله بـ**تحقّق من الكتالوج الحيّ لا من عدّ الملفات**: كم جدولًا يحمل
// RLS فعلًا · كم سياسة · هل يملك العميل منحة كتابة على جدول تجاري · هل الملح
// مبذور · هل المؤسس موجود. عدُّ الملفات يقول «طُبِّق»، والكتالوج يقول «يعمل».
//
// ═══ ولماذا يقبل أي وصلة Postgres ═══
// لا يعرف هذا السكربت شيئًا عن Supabase تحديدًا — يأخذ وصلة. فيُشغَّل **اليوم**
// على عنقود محلّي حقيقي (فيُثبَت أنه صحيح)، ويُشغَّل **بلا حرف تغيير** على
// staging لحظة توفّر وصلتها. أي أن الفارق بين «مُثبَت محلّيًا» و«مُشغَّل على
// staging» صار متغيّر بيئة، لا برنامجًا يُكتب تحت الضغط.
//
// ─────────────────────────────────────────────────────────────────────────────
// الاستعمال:
//   DATABASE_URL=postgres://…            node scripts/staging/commission.mjs
//   DATABASE_URL=…  FOUNDER_EMAIL=…      node scripts/staging/commission.mjs
//   …                                    node scripts/staging/commission.mjs --verify-only
//
// ⚠️ **الحارس أوّلًا:** إن كان المرجع مُعلَنًا مشروعَ إنتاج في
// `scripts/staging/environment.json` رُفض التشغيل **قبل أي اتصال**. ولا يُمرَّر
// سرٌّ في سطر الأوامر — الوصلة من البيئة، والملح يُولَّد هنا ولا يُطبع كاملًا.
// ============================================================================
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { preflightOffline, refFromUrl, loadConfig } from './preflight.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const MIGRATIONS = join(ROOT, 'supabase/migrations')

const VERIFY_ONLY = process.argv.includes('--verify-only')
const DB_URL = (process.env.DATABASE_URL || '').trim()
const FOUNDER_EMAIL = (process.env.FOUNDER_EMAIL || '').trim()

let pass = 0
const fails = []
const ok = (label, cond, detail = '') => {
  if (cond) { pass += 1; console.log(`  ✓ ${label}${detail ? `  — ${detail}` : ''}`) }
  else { fails.push(label); console.log(`  ✗ ${label}${detail ? `  — ${detail}` : ''}`) }
  return cond
}
const step = (t) => console.log(`\n${t}`)

function die(code, msg, hint = '') {
  console.error(`\n⛔ ${msg}`)
  if (hint) console.error(`   ${hint}`)
  process.exit(code)
}

if (DB_URL === '') {
  die(2, 'لا وصلة قاعدة: اضبط DATABASE_URL.',
    'مثال محلّي: DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres')
}

// ── ٠) الحارس قبل أي اتصال ────────────────────────────────────────────────
// ⚠️ **قبل الاتصال لا بعده.** حارسٌ يعمل بعد فتح الوصلة يكون قد لمس الهدف.
{
  // المرجع يُشتقّ من الوصلة إن كانت وصلة Supabase؛ ومن `SUPABASE_PROJECT_REF`
  // إن مُرّر. والوصلة المحلّية لا مرجع لها — فتُعامَل هدفًا محلّيًا معلَنًا.
  const ref = (process.env.SUPABASE_PROJECT_REF || '').trim()
    || refFromUrl(process.env.SUPABASE_URL || '')
    || (DB_URL.match(/db\.([a-z0-9]{20})\.supabase\.co/) || [])[1]
    || ''
  const isLocal = /(^|@)(127\.0\.0\.1|localhost)[:/]/.test(DB_URL)
  if (ref !== '') {
    const verdict = preflightOffline({
      targetRef: ref, env: { ...process.env, QIMMAH_ENV: process.env.QIMMAH_ENV || 'staging' },
      config: loadConfig(),
    })
    if (!verdict.ok) die(3, `رُفض قبل أي اتصال — [${verdict.code}]`, verdict.message)
    console.log(`  ⚙ الحارس: المرجع ${ref} مسموح.`)
  } else if (isLocal) {
    console.log('  ⚙ الحارس: هدف محلّي (127.0.0.1) — لا مرجع مشروع، ولا إنتاج يمكن بلوغه.')
  } else {
    die(3, 'وصلة غير محلّية بلا مرجع مشروع معروف.',
      'مرّر SUPABASE_PROJECT_REF كي يعمل حارس المنع.')
  }
}

// ── أداة تنفيذ ────────────────────────────────────────────────────────────
const tmp = mkdtempSync(join(tmpdir(), 'qimmah-commission-'))
function psql(sql, { quiet = true } = {}) {
  const f = join(tmp, 'q.sql')
  writeFileSync(f, sql)
  return execFileSync('psql', [DB_URL, '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-t', '-A', '-f', f], {
    encoding: 'utf8', stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  })
}
/**
 * ⚠️ **لا يرمي.** فحصٌ يسقط باستثناءٍ تقنيّ يوقف السكربت عند أول مفاجأة
 * ويحرم القارئ من بقيّة الصورة — والأسوأ أنه يطبع أثر مكدّس بدل سببٍ مفهوم.
 * الخطأ يعود قيمةً موسومة، فيسقط الفحص المعنيّ **باسمه** ويكمل الباقي.
 */
const one = (sql) => {
  try { return psql(sql).trim().split('\n')[0] } catch (e) {
    const line = String(e.stderr || e.message || '').split('\n').find((l) => /ERROR/.test(l)) || 'خطأ'
    return `!${line.replace(/^.*ERROR:\s*/, '').slice(0, 90)}`
  }
}

// ── ١) الهجرات، بترتيب اسمها، **وبسجلّ لما طُبِّق** ───────────────────────
/**
 * ═══ لماذا سجلّ وليس «أعِد تشغيل الكل» ═══
 * `scripts/db/apply-guide.md` كان يقول إن الهجرات **متكافئة القوى** (آمنة
 * للإعادة). **وهذا غير صحيح، ومقيس:** إعادة التشغيل على قاعدة مطبَّقة تسقط عند
 * `20260822120002` بـ`cannot change return type of existing function` — لأن
 * `20260824120002` تحذف `founder_code_page` وتعيد بناءها بأعمدة أزيد، فتصطدم
 * `create or replace` الأقدم بالتوقيع الأحدث.
 *
 * وأثرُ ذلك تشغيليّ لا نظريّ: الإعادة بعد فشلٍ جزئيّ — وهي أوّل ما يفعله إنسان —
 * تموت في المنتصف وتترك القاعدة نصف مطبَّقة.
 *
 * والحلّ سجلٌّ لا إصلاحُ تاريخ: `supabase_migrations.schema_migrations` هو
 * **نفس الجدول الذي يستعمله Supabase CLI**، فيتّفق السكربتان ولا يطبّق أحدهما
 * ما طبّقه الآخر. وكل هجرة تُطبَّق **داخل معاملة** مع سطر سجلّها، فإمّا أن
 * تنجح وتُسجَّل معًا أو لا يحدث شيء — فلا وجود لهجرة «طُبِّقت ولم تُسجَّل».
 */
const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()
const versionOf = (f) => (f.match(/^(\d+)/) || [])[1] || f
if (!VERIFY_ONLY) {
  step(`① تطبيق الهجرات (${files.length})`)
  psql(`create schema if not exists supabase_migrations;
        create table if not exists supabase_migrations.schema_migrations (
          version text primary key, name text, inserted_at timestamptz not null default now());`)
  const doneRaw = psql(`select version from supabase_migrations.schema_migrations;`).trim()
  const done = new Set(doneRaw === '' ? [] : doneRaw.split('\n').map((v) => v.trim()).filter(Boolean))
  let applied = 0
  let skipped = 0
  for (const f of files) {
    const v = versionOf(f)
    if (done.has(v)) { skipped += 1; continue }
    const body = readFileSync(join(MIGRATIONS, f), 'utf8')
    try {
      psql(`begin;\n${body}\n
            insert into supabase_migrations.schema_migrations (version, name)
            values ('${v}', '${f.replace(/'/g, "''")}');\ncommit;`)
      applied += 1
    } catch (e) {
      const msg = String(e.stderr || e.message || '').split('\n').find((l) => /ERROR/.test(l)) || String(e.message)
      die(4, `سقطت الهجرة ${f} — ولم يُسجَّل شيء (المعاملة تراجعت)`, msg.slice(0, 200))
    }
  }
  ok(`الهجرات مكتملة: ${applied} جديدة · ${skipped} مسجَّلة سلفًا`,
    applied + skipped === files.length, `${applied + skipped}/${files.length}`)
} else {
  step('① (تخطّي التطبيق — وضع التحقّق فقط)')
}

// ── ٢) الخطوتان التشغيليّتان اللتان لا تنشئهما أي هجرة ───────────────────
if (!VERIFY_ONLY) {
  step('② التهيئة التشغيلية')
  // ⚠️ **الملح سرّ، ولذلك لا تبذره هجرة.** هجرةٌ تحمل ملحًا تعني أن ملح كل
  // بيئة مكتوبٌ في Git — فيُولَّد هنا ولا يُطبع إلا طرفه.
  const seeded = one(`select count(*) from private.identity_pepper;`)
  if (seeded === '0') {
    const pepper = randomBytes(32).toString('hex')
    psql(`insert into private.identity_pepper (version, pepper) values (1, '${pepper}');`)
    ok('بُذر ملح الهوية (إصدار ١)', true, `…${pepper.slice(-6)}`)
  } else {
    ok('ملح الهوية مبذور سلفًا — لا يُستبدل', true, `${seeded} إصدارًا`)
    // ⚠️ استبدالُ ملحٍ قائم يُبطل **كل** بصمة مسجَّلة: التجارب والأكواد
    // والمشتريات. فلا يُلمس هنا أبدًا.
  }
  if (FOUNDER_EMAIL !== '') {
    const exists = one(`select count(*) from auth.users where email = '${FOUNDER_EMAIL.replace(/'/g, "''")}';`)
    if (exists === '0') {
      console.log(`  ⚠ لا حساب بالبريد ${FOUNDER_EMAIL} بعد — أنشئه بتسجيل عادي ثم أعد التشغيل.`)
      console.log('    (الدور يُسنَد لحسابٍ قائم؛ ولا يُنشئ هذا السكربت حسابات ولا يولّد كلمات مرور.)')
    } else {
      psql(`select public.admin_set_role('${FOUNDER_EMAIL.replace(/'/g, "''")}', 'founder', 'staging commissioning');`)
      ok(`أُسنِد دور المؤسس إلى ${FOUNDER_EMAIL}`, true)
    }
  } else {
    console.log('  ⚠ لم يُمرَّر FOUNDER_EMAIL — لا دور مؤسس أُسنِد.')
  }
}

// ── ٣) التحقّق من الكتالوج الحيّ — لا من عدّ الملفات ──────────────────────
step('③ التحقّق من الحالة الفعلية (الكتالوج لا الملفات)')

const tables = one(`select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
                    where n.nspname='public' and c.relkind='r';`)
const rls = one(`select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
                 where n.nspname='public' and c.relkind='r' and c.relrowsecurity;`)
ok('RLS مفعّل على كل جداول public', tables === rls && Number(tables) > 0, `${rls}/${tables}`)

const naked = one(`select coalesce(string_agg(c.relname, ', ' order by c.relname), '(لا شيء)')
                   from pg_class c join pg_namespace n on n.oid=c.relnamespace
                   where n.nspname='public' and c.relkind='r' and not c.relrowsecurity;`)
ok('ولا جدول بلا RLS', naked === '(لا شيء)', naked)

const policies = one(`select count(*) from pg_policies where schemaname='public';`)
ok('توجد سياسات فعليّة لا RLS فارغ', /^\d+$/.test(policies) && Number(policies) > 0, `${policies} سياسة`)

const anonWrites = one(`select count(*) from information_schema.role_table_grants
                        where grantee='anon' and table_schema='public'
                          and privilege_type in ('INSERT','UPDATE','DELETE');`)
ok('الزائر لا يملك أي منحة كتابة', anonWrites === '0', `${anonWrites}`)

const commerceWrites = one(`select coalesce(string_agg(distinct table_name||':'||privilege_type, ', '), '(لا شيء)')
  from information_schema.role_table_grants
  where grantee='authenticated' and table_schema='public'
    and table_name in ('entitlements','access_codes','purchase_ledger','salla_webhook_events',
                       'revocation_ledger','admin_roles','email_outbox','trial_ledger')
    and privilege_type in ('INSERT','UPDATE','DELETE');`)
ok('والمستخدم المصادَق لا يكتب في أي جدول تجاري مباشرةً',
  commerceWrites === '(لا شيء)', commerceWrites)

const pepper = one(`select count(*) from private.identity_pepper;`)
ok('ملح الهوية مبذور — وبدونه ترفع كل دالّة كتابة',
  Number(pepper) > 0, `${pepper} إصدارًا`)

// ⚠️ الدور يعيش في `auth.users.raw_app_meta_data` **لا في جدول** — وهذا مقصود:
// `user_metadata` يعدّله المستخدم بنفسه، و`app_metadata` لا يعدّله إلا الخادم.
const founders = one(`select count(*) from auth.users where raw_app_meta_data->>'qimmah_role' = 'founder';`)
ok('يوجد مؤسس واحد على الأقل', /^\d+$/.test(founders) && Number(founders) > 0,
  founders === '0' ? 'لا مؤسس — مرّر FOUNDER_EMAIL لحسابٍ قائم' : founders)

const definers = one(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                      where n.nspname='public' and p.prosecdef;`)
ok('دوالّ SECURITY DEFINER موجودة (سلطة الكتابة كلّها فيها)', Number(definers) > 10, `${definers}`)

// ⚠️ الدوالّ التي **يجب** أن يبلغها العميل — غيابُها يعني تطبيقًا مقفلًا.
const CLIENT_RPCS = ['my_entitlement', 'start_trial', 'redeem_access_code_v2',
                     'claim_pending_grants', 'submit_missing_food', 'delete_own_account']
const granted = one(`select coalesce(string_agg(distinct routine_name, ','order by routine_name), '')
  from information_schema.role_routine_grants
  where grantee='authenticated' and routine_schema='public'
    and routine_name in (${CLIENT_RPCS.map((r) => `'${r}'`).join(',')});`)
const grantedSet = new Set(granted === '' ? [] : granted.split(','))
const missing = CLIENT_RPCS.filter((r) => !grantedSet.has(r))
ok('كل دوالّ العميل ممنوحة — التطبيق يستطيع العمل', missing.length === 0, missing.join(' ') || 'الست كاملة')

// ⚠️ والمسار القديم غير المحدود بالمعدّل **يجب أن يكون مغلقًا**.
const legacy = one(`select count(*) from information_schema.role_routine_grants
                    where grantee in ('anon','authenticated') and routine_schema='public'
                      and routine_name='redeem_access_code';`)
ok('والمسار القديم بلا حدّ معدّل مغلق على العميل', legacy === '0', legacy)

// ── ٤) الخلاصة ────────────────────────────────────────────────────────────
console.log('\n──────────────────────────────────────────────────────────────')
if (fails.length) {
  console.log(`❌ التشغيل غير مكتمل: ${pass} نجحت · ${fails.length} فشلت`)
  fails.forEach((f) => console.log(`   • ${f}`))
  process.exit(1)
}
console.log(`✅ القاعدة مُشغَّلة ومُتحقَّق منها — ${pass} فحصًا · ٠ فشل`)
console.log('   الخطوة التالية: ابنِ التطبيق على هذه القاعدة —')
console.log('   VITE_SUPABASE_URL=… VITE_SUPABASE_ANON_KEY=… npm run build')
