// ============================================================================
// test:entitlements — إثبات **منفَّذ** لنظام الوصول على Postgres حقيقي.
// ============================================================================
// يشغّل ملفَّي الهجرة **كما هما من القرص** (لا نسخة ولا إعادة كتابة) على قاعدة
// PostgreSQL حقيقية داخل العملية (PGlite/WASM)، ثم يمارس السلوك فعليًا.
//
// لماذا لا يكفي إثبات نصّي: فحص النصّ يثبت أن السطر مكتوب، لا أن Postgres يقبله
// ولا أن السلوك هو المقصود. حدّ التزامن، ودلالات الحذف، وحدود الوقت — كلّها
// تُثبَت بالتشغيل أو لا تُثبَت (§4 من الميثاق: ممنوع ادّعاء اكتمال بلا اختبار).
//
// ما لا يستطيعه هذا الإثبات ويُعلنه صراحةً: PGlite جلسة واحدة، فلا جلستان
// متوازيتان حقيقيتان. لذلك يُثبَت أمان التزامن بثلاث طبقات: وجود `for update`
// نصًّا · تسلسل الاستردادات فعليًا · و**رفض قاعدة البيانات** لتجاوز الحدّ حتى
// لو كُتب مباشرةً (القيد البنيوي هو شبكة الأمان لا القفل وحده).
//
// التشغيل: npm run test:entitlements
// ============================================================================
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import {
  createSandbox,
  asRole as sandboxAsRole,
  makeUser as sandboxMakeUser,
} from './lib/supabase-sandbox.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const mig = (f) => readFileSync(join(root, 'supabase/migrations', f), 'utf8')

const CORE = '20260806120001_entitlements_core.sql'
const RPCS = '20260806120002_entitlement_rpcs.sql'
const DEL = '20260713120007_delete_own_account.sql'
const REVK = '20260809120001_revocation_ledger.sql'
const RECV = '20260809120002_code_grant_recovery.sql'
const PUBX = '20260809120003_public_execute_hardening.sql'
const FIX = '20260809120004_entitlement_security_remediation.sql'
// كشفه حارس النطاق أدناه: كان مُغفَلًا هو الآخر، ولم يشتكِ أحد لأن القائمة يدويّة.
const PRIV = '20260806120003_table_privileges_hardening.sql'
// [CTO-SALLA-002] طبقة سلة تعيد تعريف `admin_grant_premium` **بنفس ثوابت** FIX
// (توسعةً بأعمدة أثر). فبيئة الـcounter-proof «القديمة» يجب أن تستبعد الاثنتين:
// استبعاد FIX وحدها يترك طبقة سلة تعيد التحصين، فتنجح البيئة «القديمة» في
// الفحوص التي يُفترض أن تسقط فيها — ويتحوّل الإثبات المضادّ إلى ضجيج يخفي
// نفسه. أي هجرة تحصين قادمة تُضاف هنا كذلك.
const SALLA_INGEST = '20260812120001_salla_webhook_ingest.sql'
const INTEGRITY = '20260816120001_commerce_integrity_fixes.sql'
// [COMMISSIONING] وهذه تعيد تعريف `admin_create_access_code` كذلك (تعبئة عمودَي
// قياس الإنتروبيا)، فتُعيد معها **التطبيع** إلى البيئة «القديمة» فيُرفَض
// `SHORT-1` — وينقلب الإثبات المضادّ ﺟ إلى ضجيج يخفي نفسه، تمامًا كما تصف
// الفقرة أعلاه. فتُضاف إلى السلالة كما تأمر تلك الفقرة صراحةً.
const ACTIVATION_HARDENING = '20260824120004_activation_hardening.sql'
const HARDENING_LINEAGE = [FIX, SALLA_INGEST, INTEGRITY, ACTIVATION_HARDENING]

/**
 * [OVERNIGHT-5] السلسلة **المطبَّقة فعلًا** في هذا الإثبات — بالترتيب.
 *
 * كانت السلسلة سبع هجرات مكتوبة يدويًّا **تُغفل `SALLA_INGEST`**، وهي الهجرة
 * التي تعيد تعريف `admin_grant_premium` — أي أن الإثبات كان يصادق على مخطّط
 * **لا وجود له في أي بيئة**. والقائمة اليدوية لا تشتكي حين تشيخ، فأُلحق بها
 * حارس أدناه يقارنها بمجلّد الهجرات نفسه.
 */
const APPLIED_CHAIN = [DEL, CORE, RPCS, REVK, RECV, PUBX, FIX, SALLA_INGEST, INTEGRITY]

/**
 * استثناءات **معلَنة** — والمعلَن مسموح، والصامت هو الممنوع (الميثاق §٤).
 * كلٌّ بسببه، ويُطبع في المخرجات فلا يمرّ أحدها بلا قارئ.
 */
const DECLARED_EXCLUSIONS = new Map([
  [PRIV, 'يشترط جداول الأساس (public.profiles) ولا يبنيها هذا الصندوق — يغطّيه test:privileges بصندوق كامل'],
])

const results = []
function check(name, pass, detail = '') {
  results.push({ name, pass })
  console.log(`  ${pass ? '✓' : '✗ FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  return pass
}
/** ينجح إذا رُفعت رسالة تطابق `expect`. الفشل بلا استثناء = فشل مسمّى. */
async function mustFail(name, fn, expect) {
  try {
    await fn()
    return check(name, false, 'لم يُرفع أي استثناء — المسار مفتوح')
  } catch (e) {
    const m = String(e.message || e)
    return check(name, m.includes(expect), m.includes(expect) ? '' : `توقّعنا "${expect}" فجاء: ${m.slice(0, 120)}`)
  }
}

/**
 * Red side of the four security regressions.  This uses the same repository
 * migrations and PGlite harness while excluding only FIX, so each assertion
 * proves the exact pre-remediation behavior rather than a mocked substitute.
 */
async function runLegacyCounterProofs() {
  const { db: legacy, failed } = await createSandbox({ exclude: HARDENING_LINEAGE })
  const ready = check(
    '⚔️ بيئة counter-proof القديمة تُبنى بلا هجرة الإصلاح فقط',
    failed.length === 0,
    failed.map((f) => `${f.file}: ${f.message}`).join(' | '),
  )
  if (!ready) {
    await legacy.close()
    throw new Error('legacy_counterproof_setup_failed')
  }

  const lq = (sql, params) => legacy.query(sql, params)
  try {
    await legacy.exec(`insert into private.identity_pepper (version, pepper)
                       values (1, 'legacy-counter-proof-0123456789abcdef')`)

    // A — the old order replay reaches Bob instead of raising the named error.
    await sandboxMakeUser(legacy, 'legacy-alice@example.com')
    const legacyBob = await sandboxMakeUser(legacy, 'legacy-bob@example.com')
    await sandboxAsRole(legacy, 'service_role')
    await lq(`select public.admin_grant_premium(
      'legacy-alice@example.com','salla','LEGACY-ORDER-123',1999,'{"receipt":"original"}'::jsonb)`)
    await sandboxAsRole(legacy, null)
    const purchaseBefore = await lq(`select email_hash, amount_minor, currency, raw
                                       from public.purchase_ledger
                                      where provider='salla' and provider_order_id='LEGACY-ORDER-123'`)
    let replayError = ''
    await sandboxAsRole(legacy, 'service_role')
    try {
      await lq(`select public.admin_grant_premium(
        'legacy-bob@example.com','salla','LEGACY-ORDER-123',999,'{"receipt":"replay"}'::jsonb)`)
    } catch (error) {
      replayError = String(error.message || error)
    }
    await sandboxAsRole(legacy, null)
    const purchaseAfter = await lq(`select email_hash, amount_minor, currency, raw
                                      from public.purchase_ledger
                                     where provider='salla' and provider_order_id='LEGACY-ORDER-123'`)
    const legacyBobGrant = await lq(`select entitlement_type from public.entitlements where user_id=$1`, [legacyBob])
    check(
      '⚔️ counter-proof A: القديم يُسقط purchase_identity_mismatch بمنح Bob',
      replayError === '' && legacyBobGrant.rows[0]?.entitlement_type === 'premium' &&
        JSON.stringify(purchaseAfter.rows[0]) === JSON.stringify(purchaseBefore.rows[0]),
      replayError,
    )

    // B — the ledger remains active, yet the old admin path clears row revocation.
    const legacyRevoked = await sandboxMakeUser(legacy, 'legacy-revoked@example.com')
    await sandboxAsRole(legacy, 'service_role')
    await lq(`select public.admin_grant_premium(
      'legacy-revoked@example.com','manual','LEGACY-RV-1',1999,null)`)
    await lq(`select public.admin_revoke($1,'counter-proof')`, [legacyRevoked])
    const legacyGrantAfterRevoke = await lq(`select public.admin_grant_premium(
      'legacy-revoked@example.com','manual','LEGACY-RV-2',1999,null) as state`)
    await sandboxAsRole(legacy, 'authenticated', legacyRevoked)
    const legacyEffective = await lq(`select state from public.my_entitlement()`)
    await sandboxAsRole(legacy, null)
    const activeLegacyRevocation = await lq(`select count(*)::int n
      from public.revocation_ledger
      where lifted_at is null
        and email_hash in (select email_hash from private.identity_hashes('legacy-revoked@example.com'))`)
    check(
      '⚔️ counter-proof B: القديم يُسقط durable-revocation assertion تحديدًا',
      legacyGrantAfterRevoke.rows[0]?.state === 'premiumActive' &&
        legacyEffective.rows[0]?.state === 'premiumActive' && activeLegacyRevocation.rows[0]?.n === 1,
    )

    // C — SHORT-1 is accepted by the old server-side creator.
    await sandboxAsRole(legacy, 'service_role')
    let legacyShortId = null
    let shortError = ''
    try {
      legacyShortId = (await lq(`select public.admin_create_access_code(
        'SHORT-1','counter-proof','old entropy contract') as id`)).rows[0]?.id
    } catch (error) {
      shortError = String(error.message || error)
    }
    await sandboxAsRole(legacy, null)
    const legacyShortCount = await lq(`select count(*)::int n from public.access_codes where id=$1`, [legacyShortId])
    check(
      '⚔️ counter-proof C: القديم يُسقط SHORT-1 rejection assertion تحديدًا',
      shortError === '' && legacyShortId != null && legacyShortCount.rows[0]?.n === 1,
      shortError,
    )

    // D — an explicitly manual durable purchase is falsely surfaced as Salla.
    const legacyManual = await sandboxMakeUser(legacy, 'legacy-manual@example.com')
    await sandboxAsRole(legacy, 'service_role')
    await lq(`select public.admin_grant_premium(
      'legacy-manual@example.com','manual','LEGACY-MANUAL-1',null,null)`)
    await sandboxAsRole(legacy, null)
    const legacyProvenance = await lq(`select e.source, p.provider
      from public.entitlements e cross join public.purchase_ledger p
      where e.user_id=$1 and p.provider_order_id='LEGACY-MANUAL-1'`, [legacyManual])
    check(
      '⚔️ counter-proof D: القديم يُسقط manual-source assertion تحديدًا',
      legacyProvenance.rows[0]?.provider === 'manual' && legacyProvenance.rows[0]?.source === 'salla',
    )
  } finally {
    await legacy.close()
  }
}

process.on('uncaughtException', (e) => {
  console.error(`\n⛔ توقّف الإثبات باستثناء غير متوقّع:\n   ${String(e.message || e).split('\n')[0]}`)
  if (e.query) console.error(`   عند: ${String(e.query).trim().split('\n')[0]}`)
  process.exit(1)
})

const db = await PGlite.create()
const asRole = async (role, uid) => {
  await db.exec(`reset role;`)
  if (uid !== undefined) await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? ''])
  if (role) await db.exec(`set role ${role};`)
}
const q = (sql, params) => db.query(sql, params)

console.log('\n🔐 إثبات نظام الوصول — Postgres منفَّذ (PGlite)\n')

await runLegacyCounterProofs()

// ── ٠) بيئة شبيهة بـSupabase: الأدوار + auth.uid() من الـGUC ────────────────
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  grant usage on schema public to anon, authenticated, service_role;
  -- ⚠ محاكاة سلوك Supabase الحقيقي: المشروع يمنح anon/authenticated صلاحيات
  -- **كاملة** على جداول public افتراضيًا. بدون هذا السطر يمرّ كل فحص «ممنوع»
  -- مجّانًا — لأن الدور لم يُمنح شيئًا أصلًا — فيبدو الـREVOKE فعّالًا وهو غير
  -- مُختبَر. القاعدة: الاستثناء يُحرَس بتأكيد يثبت أنه لم يصر قاعدة (§4.2).
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    email_confirmed_at timestamptz
  );
  create or replace function auth.uid() returns uuid
  language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
`)
const ver = await q(`select version() as v`)
check('قاعدة بيانات حقيقية', /PostgreSQL/.test(ver.rows[0].v), ver.rows[0].v.split(' on ')[0])

// ── ١) إنشاء المخطّط من قاعدة نظيفة ────────────────────────────────────────
let created = true
try {
  for (const m of APPLIED_CHAIN) await db.exec(mig(m))
} catch (e) {
  created = false
  console.error('\n  المهاجرة فشلت:', e.message, '\n')
}
if (!check('إنشاء المخطّط من قاعدة نظيفة', created)) {
  console.log('\n⛔ توقّف: فشل الهجرة يمنع بقية الإثبات.\n')
  process.exit(1)
}

// idempotency: إعادة التشغيل لا تكسر
let rerun = true
try { for (const m of APPLIED_CHAIN.filter((x) => x !== DEL)) await db.exec(mig(m)) } catch (e) { rerun = false; console.error('   ', e.message) }
check('الهجرة idempotent (تشغيل ثانٍ)', rerun)

// ── ١-ب) حارس النطاق: لا هجرة تجارة تُغفَل بصمت ────────────────────────────
// الاستثناء يُحرَس (الميثاق §4.2): قائمة مكتوبة يدويًّا **تصير قاعدة** بالنسيان،
// وهو ما حدث فعلًا مع `SALLA_INGEST`. فيقارن الحارس القائمةَ بالمجلّد نفسه.
{
  const { readdirSync } = await import('node:fs')
  const dir = new URL('../../supabase/migrations/', import.meta.url)
  const commerce = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .filter((f) => /entitlement|revocation|code_grant|public_execute|salla|integrity|privileges/.test(f))
    .sort()
  const missing = commerce.filter((f) => !APPLIED_CHAIN.includes(f) && !DECLARED_EXCLUSIONS.has(f))
  check('★ كل هجرات التجارة مطبَّقة أو مستثناة **بإعلان** — لا واحدة مُغفَلة بصمت',
    missing.length === 0, missing.join(', ') || `${APPLIED_CHAIN.length - 1} مطبَّقة · ${DECLARED_EXCLUSIONS.size} مستثناة بإعلان`)
  for (const [file, why] of DECLARED_EXCLUSIONS) {
    check(`استثناء معلَن: ${file}`, commerce.includes(file), why)
  }
  // ولو أُسقطت أيّ واحدة لسقط الفحص أعلاه — يُهاجَم بحذف كلٍّ منها بدورها.
  const applied = commerce.filter((f) => !DECLARED_EXCLUSIONS.has(f))
  const everyOmissionCaught = applied.every((victim) => {
    const crippled = APPLIED_CHAIN.filter((x) => x !== victim)
    return applied.filter((f) => !crippled.includes(f) && !DECLARED_EXCLUSIONS.has(f)).length > 0
  })
  check('ولو حُذفت أيّ هجرة مطبَّقة لسقط الفحص أعلاه — بمحاكاة حذف كلٍّ منها بدورها',
    everyOmissionCaught && applied.length > 0, `${applied.length} هجرة مهاجَمة`)
  // ولا يكفي أن يكون الاستثناء معلَنًا: لو صار الإعلان غطاءً لكل شيء لسقط هذا.
  check('والاستثناءات أقلّية معلَنة لا قاعدة',
    DECLARED_EXCLUSIONS.size < applied.length)
}

// ── ٢) الملح المُرقَّم ─────────────────────────────────────────────────────
await db.exec(`insert into private.identity_pepper (version, pepper)
               values (1, 'pepper-v1-0123456789abcdef0123456789abcdef')`)

const h1 = await q(`select private.hash_identity('A@Example.COM ', 1) as h`)
const h2 = await q(`select private.hash_identity('a@example.com', 1) as h`)
check('البصمة تُطبَّع (حالة أحرف/مسافات)', h1.rows[0].h === h2.rows[0].h)
check('البصمة ليست البريد نصًّا', !h1.rows[0].h.includes('@') && h1.rows[0].h.length === 64)

await mustFail('رفض إصدار ملح مجهول', () => q(`select private.hash_identity('a@example.com', 99)`), 'unknown pepper version')
await mustFail('رفض هوية فارغة', () => q(`select private.hash_identity('   ', 1)`), 'empty identity')

// لا رجوع صامت: إصدار ٢ يعطي بصمة مختلفة، ولا يُخدَم أحدهما مكان الآخر
await db.exec(`insert into private.identity_pepper (version, pepper)
               values (2, 'pepper-v2-fedcba9876543210fedcba9876543210')`)
const hv2 = await q(`select private.hash_identity('a@example.com', 2) as h`)
check('كل إصدار بصمة مستقلّة (لا رجوع صامت)', hv2.rows[0].h !== h1.rows[0].h)
const act = await q(`select private.active_pepper_version() as v`)
check('الإصدار النشط = الأحدث غير المتقاعد', act.rows[0].v === 2)
await db.exec(`update private.identity_pepper set retired_at = now() where version = 2`)
const act2 = await q(`select private.active_pepper_version() as v`)
check('التقاعد يعيد النشط للإصدار السابق', act2.rows[0].v === 1)
const lookup = await q(`select count(*)::int as n from private.identity_hashes('a@example.com')`)
check('البحث يمسح الإصدارات المتقاعدة أيضًا', lookup.rows[0].n === 2, `${lookup.rows[0].n} إصدارين`)

// ── ٣) المستخدمون ─────────────────────────────────────────────────────────
// إنشاء مستخدم = عمل مالك القاعدة (Supabase Auth)، لا عمل دور عميل.
// `reset role` هنا مقصود: مخطّط auth ممنوع على anon/authenticated — وهذا
// جزء من الضمان لا عائق فيه.
const mkUser = async (email, confirmed = true) => {
  await db.exec(`reset role;`)
  const r = await q(
    `insert into auth.users (email, email_confirmed_at) values ($1, $2) returning id`,
    [email, confirmed ? new Date().toISOString() : null],
  )
  return r.rows[0].id
}
const A = await mkUser('a@example.com')
const B = await mkUser('b@example.com')
const U = await mkUser('unconfirmed@example.com', false)

// ── ٣.٥) تأكيد مضادّ: المنح الافتراضي حيّ فعلًا ────────────────────────────
// لولا هذا لكانت كل نتيجة «permission denied» أدناه مجّانية. نُنشئ جدولًا لم
// تمسّه الهجرة، ونثبت أن `authenticated` يقرؤه — فما مُنع بعده مُنع بالـREVOKE.
await asRole(null)
await db.exec(`create table public.grant_probe (id int); insert into public.grant_probe values (1);`)
await asRole('authenticated', A)
let probeOk = false
try { probeOk = (await q(`select count(*)::int n from public.grant_probe`)).rows[0].n === 1 } catch { probeOk = false }
check('المنح الافتراضي حيّ (فحوص المنع ليست مجّانية)', probeOk)

// ── ٤) لا كتابة من العميل ─────────────────────────────────────────────────
await asRole('authenticated', A)
await mustFail('العميل لا يُدرِج منحة لنفسه', () =>
  q(`insert into public.entitlements (user_id, email, entitlement_type, source, no_expiry)
     values ($1,'a@example.com','premium','manual',true)`, [A]), 'permission denied')
await mustFail('العميل لا يقرأ جدول الأكواد', () => q(`select * from public.access_codes`), 'permission denied')
await mustFail('العميل لا يقرأ سجلّ التجربة', () => q(`select * from public.trial_ledger`), 'permission denied')
await mustFail('العميل لا يقرأ سجلّ الشراء', () => q(`select * from public.purchase_ledger`), 'permission denied')
await mustFail('العميل لا يقرأ سجلّ الحظر', () => q(`select * from public.revocation_ledger`), 'permission denied')
await mustFail('العميل لا ينادي دالة الإدارة', () =>
  q(`select public.admin_revoke($1,'x')`, [A]), 'permission denied')
await mustFail('العميل لا ينادي دالة البصمة الداخلية', () =>
  q(`select private.hash_identity('a@example.com',1)`), 'permission denied')

// TRUNCATE **لا تحرسها RLS** — صلاحية جدول لا صفّ. سحب insert/update/delete
// وحدها كان يترك للعميل محو منح كل المستخدمين بأمر واحد (أُثبت عمليًا).
for (const t of ['entitlements', 'access_code_redemptions', 'access_codes',
                 'trial_ledger', 'purchase_ledger', 'code_redemption_ledger', 'revocation_ledger']) {
  await mustFail(`العميل لا يستطيع TRUNCATE على ${t}`,
    () => db.exec(`truncate public.${t}`), 'permission denied')
}
// وصلاحيات `authenticated` على الجدولين المقروءين = SELECT وحدها، لا أكثر.
await asRole(null)
const grants = await q(`select table_name, string_agg(distinct privilege_type, ',' order by privilege_type) pr
                        from information_schema.role_table_grants
                        where table_schema='public' and grantee='authenticated'
                          and table_name in ('entitlements','access_code_redemptions')
                        group by table_name order by table_name`)
check('authenticated يملك SELECT فقط على الجدولين المقروءين',
  grants.rows.length === 2 && grants.rows.every((r) => r.pr === 'SELECT'),
  grants.rows.map((r) => `${r.table_name}=${r.pr}`).join(' '))
const anyGrant = await q(`select count(*)::int n from information_schema.role_table_grants
                          where table_schema='public' and grantee in ('anon','authenticated')
                            and table_name in ('access_codes','trial_ledger','purchase_ledger','code_redemption_ledger','revocation_ledger')`)
check('لا صلاحية إطلاقًا على الأكواد والسجلّات لأي دور عميل', anyGrant.rows[0].n === 0, `${anyGrant.rows[0].n}`)

await asRole('anon')
await mustFail('anon لا يقرأ المنح', () => q(`select * from public.entitlements`), 'permission denied')
await mustFail('anon لا ينادي my_entitlement', () => q(`select * from public.my_entitlement()`), 'permission denied')

// ── ٥) التجربة ────────────────────────────────────────────────────────────
await asRole('authenticated', U)
await mustFail('بريد غير مؤكَّد لا يبدأ تجربة', () => q(`select public.start_trial()`), 'email_not_verified')

await asRole('authenticated', A)
const t1 = await q(`select public.start_trial() as s`)
check('بدء التجربة ينجح لحساب مُوثَّق', t1.rows[0].s === 'trialActive')

const span = await q(`select (expires_at - activated_at) = interval '72 hours' as ok
                      from public.entitlements where user_id = $1`, [A])
check('مدّة التجربة ٧٢ ساعة بالضبط', span.rows[0].ok === true)

await mustFail('تجربة ثانية لنفس الهوية مرفوضة بسبب السجلّ الدائم',
  () => q(`select public.start_trial()`), 'trial_already_used')

// حدّ الانتهاء مُشتقّ من وقت القاعدة — يُختبر على الحدّ نفسه.
// يُنادى بدور المالك: `private` ممنوع على كل دور عميل (أُثبت أعلاه)، والمسار
// الشرعي للعميل هو my_entitlement() وحدها.
await asRole(null)
const der = await q(`
  select private.derive_state('trial', false, now() + interval '1 second', null) as before,
         private.derive_state('trial', false, now(),                        null) as at_boundary,
         private.derive_state('trial', false, now() - interval '1 second',  null) as after`)
check('قبل الـ٧٢ ساعة: trialActive', der.rows[0].before === 'trialActive')
check('عند الحدّ تمامًا: trialExpired (حصري)', der.rows[0].at_boundary === 'trialExpired')
check('بعد الحدّ: trialExpired', der.rows[0].after === 'trialExpired')

// ── ٦) عزل حسابين ─────────────────────────────────────────────────────────
await asRole('authenticated', B)
const bSees = await q(`select count(*)::int as n from public.entitlements`)
check('B لا يرى صفّ A (RLS بلا where)', bSees.rows[0].n === 0)
const bMine = await q(`select state from public.my_entitlement()`)
check('B يرى حالته هو فقط', bMine.rows[0].state === 'noAccess')
await asRole('authenticated', A)
const aSees = await q(`select count(*)::int as n from public.entitlements`)
check('A يرى صفّه هو', aSees.rows[0].n === 1)
const aMine = await q(`select state from public.my_entitlement()`)
check('A يرى trialActive عبر الدالة المعتمدة', aMine.rows[0].state === 'trialActive')

// ── ٧) الأكواد: الحدّ والانتهاء والتزامن ──────────────────────────────────
await asRole('service_role')
await mustFail('⚔️ SHORT-1 المزروع يُرفض عند الإنشاء (لا عودة للقبول القديم)',
  () => q(`select public.admin_create_access_code('SHORT-1','founder','اختبار التفاف')`),
  'invalid_access_code')
await mustFail('٩ رموز تُرفض عند الإنشاء',
  () => q(`select public.admin_create_access_code('A2B3C4D5E','founder','حد أدنى')`),
  'invalid_access_code')
await mustFail('رمز خارج أبجدية الـ32 يُرفض عند الإنشاء',
  () => q(`select public.admin_create_access_code('A2B3C4D5E-','founder','رمز محظور')`),
  'invalid_access_code')
await mustFail('فراغ داخلي لا يُفسَّر كتطبيع ويُرفض باسمه',
  () => q(`select public.admin_create_access_code('A2B3 C4D5E6','founder','فراغ داخلي')`),
  'invalid_access_code')
await mustFail('Unicode lookalike يُرفض عند الإنشاء',
  () => q(`select public.admin_create_access_code('A2B3C4D5Ｅ6','founder','محاكاة Unicode')`),
  'invalid_access_code')
await mustFail('Unicode long-s لا يلتفّ عبر upper() عند الإنشاء',
  () => q(`select public.admin_create_access_code('A2B3C4D5ſ6','founder','محاكاة case-fold')`),
  'invalid_access_code')
await asRole('authenticated', A)
await mustFail('Unicode long-s يُرفض برسالة الاسترداد العامة',
  () => q(`select public.redeem_access_code('A2B3C4D5ſ6')`), 'invalid_code')
await asRole('service_role')
const trimmed = await q(`select public.admin_create_access_code('  a2b3c4d5e6  ','founder','تطبيع صريح') as id`)
await asRole(null)
const trimmedHash = await q(`select count(*)::int n from public.access_codes
                              where id=$1 and code_hash=private.hash_identity('A2B3C4D5E6',1)`, [trimmed.rows[0].id])
check('رمز صالح من 10 أحرف يُقبل؛ الفراغ الطرفي والحالة يُطبَّعان بعقد واحد',
  trimmedHash.rows[0].n === 1)
await asRole('service_role')
const code = await q(`select public.admin_create_access_code(
  'Q7M2K9R4TX','founder','حملة مؤثّر تجريبية',14,2,'influencer-x',null) as id`)
const codeId = code.rows[0].id
await q(`select public.admin_create_access_code('D3F4U7LT9Q','founder','فحص الافتراضي') as id`)
await asRole(null)
const dflt = await q(`select duration_days from public.access_codes where id=$1`, [codeId])
const ddur = await q(`select duration_days from public.access_codes
                      where code_hash = private.hash_identity('D3F4U7LT9Q',1)`)
check('مدّة الكود الافتراضية ١٤ يومًا', ddur.rows[0].duration_days === 14)
check('الكود المُنشأ يحمل مدّته المطلوبة', dflt.rows[0].duration_days === 14)

const audit = await q(`select created_by, created_reason, created_at is not null as ts
                       from public.access_codes where id=$1`, [codeId])
check('أثر إداري مسجَّل (created_by/reason/at)',
  audit.rows[0].created_by === 'founder' && audit.rows[0].created_reason.length > 0 && audit.rows[0].ts)

await asRole('authenticated', B)
const r1 = await q(`select public.redeem_access_code('q7m2k9r4tx') as s`)
check('استرداد كود ينجح (وغير حسّاس لحالة الأحرف)', r1.rows[0].s === 'specialAccessActive')
await mustFail('نفس الهوية لا تستردّ نفس الكود مرّتين',
  () => q(`select public.redeem_access_code('Q7M2K9R4TX')`), 'code_already_redeemed')

// المستخدم الثالث يستهلك الحصّة الثانية، والرابع يُرفض
const C = await mkUser('c@example.com')
const D = await mkUser('d@example.com')
await asRole('authenticated', C)
const r2 = await q(`select public.redeem_access_code('Q7M2K9R4TX') as s`)
check('الاسترداد الثاني ضمن الحدّ ينجح', r2.rows[0].s === 'specialAccessActive')
await asRole('authenticated', D)
await mustFail('الاسترداد الثالث يتجاوز الحدّ فيُرفض',
  () => q(`select public.redeem_access_code('Q7M2K9R4TX')`), 'invalid_code')

// شبكة الأمان البنيوية: حتى الكتابة المباشرة لا تتجاوز الحدّ
await asRole(null)
await mustFail('القيد البنيوي يرفض تجاوز الحدّ حتى بكتابة مباشرة',
  () => q(`update public.access_codes set redemption_count = max_redemptions + 1 where id=$1`, [codeId]),
  'access_codes_within_limit')
const effectiveRedeem = await q(`select pg_get_functiondef(
  'public.redeem_access_code(text)'::regprocedure) as definition`)
check('قفل الصفّ `for update` موجود في دالة الاسترداد الفعّالة',
  /for update/i.test(effectiveRedeem.rows[0].definition))

// كود معطّل ومنتهٍ
await asRole('service_role')
await q(`select public.admin_create_access_code('D5S4BL3D9Q','founder','فحص التعطيل')`)
await asRole(null)
await q(`update public.access_codes set enabled=false where code_hash = private.hash_identity('D5S4BL3D9Q',1)`)
await asRole('authenticated', D)
await mustFail('كود معطّل يُرفض برسالة عامّة', () => q(`select public.redeem_access_code('D5S4BL3D9Q')`), 'invalid_code')
// كود منتهٍ: يُنشأ صحيحًا ثم **يُشيَّخ**. القيد `access_codes_window` يمنع ولادة
// كود ميت (expires_at <= starts_at) — وهو حارس مقصود ضدّ خطأ إداري، فالانتهاء
// في الإنتاج يأتي بمرور الوقت لا بالإنشاء.
await asRole('service_role')
await q(`select public.admin_create_access_code('E7P4R3D9QX','founder','فحص الانتهاء',14,1,null, now() + interval '1 day')`)
await asRole(null)
await mustFail('القيد يرفض كودًا يُولَد منتهيًا',
  () => q(`update public.access_codes set expires_at = starts_at - interval '1 day'
           where code_hash = private.hash_identity('E7P4R3D9QX',1)`), 'access_codes_window')
await q(`update public.access_codes
            set starts_at = now() - interval '10 days', expires_at = now() - interval '1 day'
          where code_hash = private.hash_identity('E7P4R3D9QX',1)`)
await asRole('authenticated', D)
await mustFail('كود خارج نافذته يُرفض بنفس الرسالة', () => q(`select public.redeem_access_code('E7P4R3D9QX')`), 'invalid_code')
await mustFail('كود غير موجود يُرفض بنفس الرسالة (لا تعداد)', () => q(`select public.redeem_access_code('NOPE-404')`), 'invalid_code')

// انتهاء صلاحية الكود الممنوح
await asRole(null)
const sp = await q(`select private.derive_state('special', false, now() - interval '1 second', null) as expired,
                           private.derive_state('special', false, now() + interval '1 day',    null) as active`)
check('منحة الكود تنتهي بانقضاء مدّتها', sp.rows[0].expired === 'noAccess' && sp.rows[0].active === 'specialAccessActive')

// ── ٨) أسبقية Premium والإلغاء ────────────────────────────────────────────
await asRole('service_role')
const g1 = await q(`select public.admin_grant_premium('b@example.com','salla','ORD-1',1999,'{}'::jsonb) as s`)
check('منح Premium ينجح', g1.rows[0].s === 'premiumActive')
const g2 = await q(`select public.admin_grant_premium('b@example.com','salla','ORD-1',1999,'{}'::jsonb) as s`)
await asRole(null)
const dup = await q(`select count(*)::int as n from public.purchase_ledger where provider_order_id='ORD-1'`)
check('تكرار حدث المزوّد idempotent (صفّ واحد)', dup.rows[0].n === 1 && g2.rows[0].s === 'premiumActive')

// طلب مزوّد واحد مربوط بهوية شراء واحدة: إعادة الإرسال لنفس الهوية لا تغيّر
// سجلّ الشراء، وإرساله لهوية أخرى يفشل باسمه ولا يخلق منحة ثانية.
const PA = await mkUser('alice-order@example.com')
const PB = await mkUser('bob-order@example.com')
await asRole('service_role')
await q(`select public.admin_grant_premium('alice-order@example.com','salla','ORDER-123',1999,
                                             '{"receipt":"original"}'::jsonb)`)
await asRole(null)
const beforeReplay = await q(`select id, email_hash, hash_version, amount_minor, currency, granted_at, raw
                               from public.purchase_ledger
                              where provider='salla' and provider_order_id='ORDER-123'`)
const aliceBeforeReplay = await q(`select id, entitlement_type, source, activated_at, updated_at
                                     from public.entitlements where user_id=$1`, [PA])
await asRole('service_role')
const sameReplay = await q(`select public.admin_grant_premium('alice-order@example.com','salla','ORDER-123',999,
                                                                '{"receipt":"replay"}'::jsonb) as s`)

// Same identity remains the same identity after pepper rotation; the purchase
// row's stamped hash_version is the comparison authority, not today's version.
await asRole(null)
await db.exec(`insert into private.identity_pepper (version, pepper)
               values (4, 'pepper-v4-0123456789abcdef0123456789abcdef')`)
await asRole('service_role')
const rotatedReplay = await q(`select public.admin_grant_premium(
  'alice-order@example.com','salla','ORDER-123',1,'{"receipt":"rotated-replay"}'::jsonb) as s`)
await asRole(null)
await db.exec(`update private.identity_pepper set retired_at=now() where version=4`)
await asRole('service_role')
await mustFail('⚔️ نفس ORDER-123 لهوية أخرى يُرفض باسم واضح',
  () => q(`select public.admin_grant_premium('bob-order@example.com','salla','ORDER-123',1999,null)`),
  'purchase_identity_mismatch')
await mustFail('⚔️ فراغات ORDER-123 لا تخلق طلبًا ثانيًا لهوية أخرى',
  () => q(`select public.admin_grant_premium('bob-order@example.com','salla','  ORDER-123  ',1999,null)`),
  'purchase_identity_mismatch')
await asRole(null)
const afterReplay = await q(`select id, email_hash, hash_version, amount_minor, currency, granted_at, raw
                              from public.purchase_ledger
                             where provider='salla' and provider_order_id='ORDER-123'`)
const aliceAfterReplay = await q(`select id, entitlement_type, source, activated_at, updated_at
                                    from public.entitlements where user_id=$1`, [PA])
const bobGrant = await q(`select count(*)::int n from public.entitlements where user_id=$1`, [PB])
const aliceGrants = await q(`select count(*)::int n from public.entitlements where user_id=$1`, [PA])
check('نفس الطلب ونفس الهوية idempotent بلا شراء أو منحة مكرّرة',
  sameReplay.rows[0].s === 'premiumActive' && aliceGrants.rows[0].n === 1)
check('نفس الهوية تبقى idempotent عبر دوران pepper', rotatedReplay.rows[0].s === 'premiumActive')
check('إعادة التشغيل لا تغيّر هوية/مبلغ/عملة/حمولة الشراء الدائم',
  JSON.stringify(afterReplay.rows[0]) === JSON.stringify(beforeReplay.rows[0]))
check('إعادة التشغيل لا تعيد تأريخ أو تبديل منحة Premium القائمة',
  JSON.stringify(aliceAfterReplay.rows[0]) === JSON.stringify(aliceBeforeReplay.rows[0]))
check('إعادة تشغيل الطلب المرفوضة لا تمنح Bob شيئًا', bobGrant.rows[0].n === 0)

// المصدر ليس تسمية عرض: manual وSalla يُحفظان ويُستعادان كما وقعا.
const PM = await mkUser('manual-order@example.com')
await asRole('service_role')
await q(`select public.admin_grant_premium('manual-order@example.com','manual','MANUAL-123',null,null)`)
await asRole(null)
const manualSource = await q(`select source from public.entitlements where user_id=$1`, [PM])
const sallaSource = await q(`select source from public.entitlements where user_id=$1`, [B])
check('المنحة اليدوية تحفظ المصدر manual', manualSource.rows[0].source === 'manual')
check('منحة Salla تحفظ المصدر salla', sallaSource.rows[0].source === 'salla')

// حذف الحساب لا يبرّر اختلاق Salla: الاسترجاع يحمل مصدر الشراء الأصلي.
await asRole('authenticated', PM)
await q(`select public.delete_own_account()`)
const PM2 = await mkUser('manual-order@example.com')
await asRole('authenticated', PM2)
const manualClaim = await q(`select public.claim_pending_grants() as s`)
const manualRecovered = await q(`select state, source from public.my_entitlement()`)
check('استرجاع الشراء اليدوي يبقى manual',
  manualClaim.rows[0].s === 'premiumActive' &&
  manualRecovered.rows[0].state === 'premiumActive' && manualRecovered.rows[0].source === 'manual')

await asRole('authenticated', B)
const bState = await q(`select state, no_expiry, expires_at from public.my_entitlement()`)
check('B صار premiumActive بلا تاريخ انتهاء',
  bState.rows[0].state === 'premiumActive' && bState.rows[0].no_expiry === true && bState.rows[0].expires_at === null)

// كود لاحق لا يخفض Premium
await asRole('service_role')
await q(`select public.admin_create_access_code('AFT3RPR3M9','founder','أسبقية Premium',7,5)`)
await asRole('authenticated', B)
const afterCode = await q(`select public.redeem_access_code('AFT3RPR3M9') as s`)
check('كود بعد Premium لا يخفض المنحة', afterCode.rows[0].s === 'premiumActive')
const stillPrem = await q(`select state from public.my_entitlement()`)
check('الحالة بقيت premiumActive بعد الاسترداد', stillPrem.rows[0].state === 'premiumActive')

// الإلغاء يعلو على كل شيء
await asRole('service_role')
await q(`select public.admin_revoke($1,'اختبار') as s`, [B])
await asRole('authenticated', B)
const revoked = await q(`select state from public.my_entitlement()`)
check('الإلغاء يعلو حتى على Premium', revoked.rows[0].state === 'revoked')

// ── ٨.٥) مراجعة الكود: أربعة عيوب حقيقية، لكلٍّ فحصه ──────────────────────

// (أ) الإلغاء لاصق — كانت المسارات الثلاثة تُصفّر revoked_at فتُعيد الوصول ذاتيًا.
await asRole('service_role')
const R1 = await mkUser('revoked@example.com')
await asRole(null)
await q(`insert into public.entitlements (user_id,email,entitlement_type,source,activated_at,expires_at,no_expiry,revoked_at,revoked_reason)
         values ($1,'revoked@example.com','trial','trial',now(),now()+interval '72 hours',false,now(),'اختبار')`, [R1])
await asRole('authenticated', R1)
await mustFail('مُلغىً لا يبدأ تجربة ليرفع الإلغاء', () => q(`select public.start_trial()`), 'access_revoked')
await mustFail('مُلغىً لا يستردّ كودًا ليرفع الإلغاء', () => q(`select public.redeem_access_code('AFT3RPR3M9')`), 'access_revoked')
await mustFail('مُلغىً لا يطالب بشراء ليرفع الإلغاء', () => q(`select public.claim_pending_grants()`), 'access_revoked')
const stillRevoked = await q(`select state from public.my_entitlement()`)
check('الحالة بقيت revoked بعد المحاولات الثلاث', stillRevoked.rows[0].state === 'revoked')

// (ب) دوران الملح لا يُعطّل كودًا قائمًا — الكود أُنشئ تحت الإصدار ١.
await asRole(null)
await db.exec(`insert into private.identity_pepper (version, pepper)
               values (3, 'pepper-v3-aaaabbbbccccddddeeeeffff00001111')`)
const V3 = await mkUser('rotate@example.com')
await asRole('authenticated', V3)
const afterRotate = await q(`select public.redeem_access_code('AFT3RPR3M9') as s`)
check('كود أُنشئ قبل دوران الملح يبقى قابلًا للاسترداد', afterRotate.rows[0].s === 'specialAccessActive')
await asRole(null)
await db.exec(`update private.identity_pepper set retired_at = now() where version = 3`)

// (ج) كود أقصر لا يقصّ منحة سارية أطول.
await asRole('service_role')
await q(`select public.admin_create_access_code('L8NG3R3D9Q','founder','منحة طويلة',30,5)`)
await q(`select public.admin_create_access_code('M2N7V4L8QX','founder','منحة قصيرة',1,5)`)
const S1 = await mkUser('shorten@example.com')
await asRole('authenticated', S1)
await q(`select public.redeem_access_code('L8NG3R3D9Q')`)
const longExp = (await q(`select expires_at from public.my_entitlement()`)).rows[0].expires_at
await q(`select public.redeem_access_code('M2N7V4L8QX')`)
const afterShort = (await q(`select expires_at, state from public.my_entitlement()`)).rows[0]
check('كود ليوم واحد لا يقصّ منحة ٣٠ يومًا سارية',
  new Date(afterShort.expires_at).getTime() === new Date(longExp).getTime() &&
  afterShort.state === 'specialAccessActive')

// (د) لا فهرس مكرّر على user_id (قيد unique يكفي).
await asRole(null)
const idx = await q(`select count(*)::int n from pg_indexes
                     where schemaname='public' and tablename='entitlements'
                       and indexdef ilike '%(user_id)%'`)
check('فهرس واحد فقط على entitlements.user_id', idx.rows[0].n === 1, `${idx.rows[0].n}`)

// ── ٩) حذف الحساب — أخطر بند ──────────────────────────────────────────────
// رفع حظر §٨ يمرّ عبر العقد الرسمي لا بتعديل مباشر: admin_revoke صار يكتب
// سجلًّا دائمًا، والتصفير اليدوي لصفّ المستخدم وحده لم يعد يرفع شيئًا.
await asRole('service_role')
const unrev = await q(`select public.admin_unrevoke($1,'اختبار: رفع حظر §٨') as s`, [B])
check('admin_unrevoke يرفع الحظر عبر العقد الرسمي', unrev.rows[0].s === 'unrevoked')
await asRole(null)
const liftShape = await q(`select count(*)::int total,
                                  count(*) filter (where lifted_at is null)::int active,
                                  count(*) filter (where lifted_at is not null and lifted_by is not null and lifted_reason is not null)::int lifted
                           from public.revocation_ledger`)
check('الرفع وسمٌ لا حذف: الصفّ باقٍ ومكتمل النسب',
  liftShape.rows[0].total >= 1 && liftShape.rows[0].active === 0 &&
  liftShape.rows[0].lifted === liftShape.rows[0].total,
  `total=${liftShape.rows[0].total} active=${liftShape.rows[0].active}`)
await asRole('authenticated', B)
const beforeDel = {
  ent: (await q(`select count(*)::int n from public.entitlements`)).rows[0].n,
}
await q(`select public.delete_own_account()`)
await asRole(null)
const afterDel = {
  ent: (await q(`select count(*)::int n from public.entitlements where user_id=$1`, [B])).rows[0].n,
  red: (await q(`select count(*)::int n from public.access_code_redemptions where user_id=$1`, [B])).rows[0].n,
  usr: (await q(`select count(*)::int n from auth.users where id=$1`, [B])).rows[0].n,
  trial: (await q(`select count(*)::int n from public.trial_ledger`)).rows[0].n,
  purch: (await q(`select count(*)::int n from public.purchase_ledger`)).rows[0].n,
  codeled: (await q(`select count(*)::int n from public.code_redemption_ledger`)).rows[0].n,
}
check('حذف الحساب يمحو منحة المستخدم', beforeDel.ent === 1 && afterDel.ent === 0)
check('حذف الحساب يمحو استرداداته المنسوبة', afterDel.red === 0)
check('حذف الحساب يزيل الهوية', afterDel.usr === 0)
check('سجلّ التجربة ينجو من حذف الحساب', afterDel.trial >= 1)
check('سجلّ الشراء ينجو من حذف الحساب', afterDel.purch >= 1)
check('سجلّ حدود الأكواد ينجو من حذف الحساب', afterDel.codeled >= 1)

// إعادة التسجيل بنفس البريد: التجربة لا تتكرّر، وPremium يُسترجَع
const B2 = await mkUser('b@example.com')
await asRole('authenticated', B2)
const reclaim = await q(`select public.claim_pending_grants() as s`)
const reclaimedSalla = await q(`select state, source from public.my_entitlement()`)
check('Premium Salla يُسترجَع بعد الحذف بمصدره الأصلي',
  reclaim.rows[0].s === 'premiumActive' && reclaimedSalla.rows[0].state === 'premiumActive' &&
    reclaimedSalla.rows[0].source === 'salla')

const A_del = A
await asRole('authenticated', A_del)
await q(`select public.delete_own_account()`)
const A2 = await mkUser('a@example.com')
await asRole('authenticated', A2)
await mustFail('التجربة لا تتكرّر بحذف الحساب وإعادة التسجيل',
  () => q(`select public.start_trial()`), 'trial_already_used')

// حدّ الكود ينجو كذلك: C حُذف ثم عاد ⇒ لا استرداد ثانٍ لنفس الكود
await asRole('authenticated', C)
await q(`select public.delete_own_account()`)
const C2 = await mkUser('c@example.com')
await asRole('authenticated', C2)
await mustFail('حدّ الكود ينجو من حذف الحساب',
  () => q(`select public.redeem_access_code('Q7M2K9R4TX')`), 'invalid_code')

// ── ٩.٥) استرجاع منح الأكواد — code_redemption_ledger بالاتجاهين ──────────
// السجلّ الذي يمنع الاسترداد الثاني هو نفسه الذي يثبت الحقّ. سياسة الأهلية
// الكاملة في رأس 20260809120002 — هنا تُثبَت بالتشغيل بندًا بندًا.

// (أ) الحالة الأساسية: حذف ← إعادة تسجيل ← استرجاع المنحة **الأصلية** بلا تمديد.
// S1 يحمل LONG-30 (انتهاؤها الأصلي محفوظ في longExp أعلاه).
await asRole('authenticated', S1)
await q(`select public.delete_own_account()`)
const S2 = await mkUser('shorten@example.com')
await asRole('authenticated', S2)
const recov = await q(`select public.claim_pending_grants() as s`)
check('منحة كود سارية تُسترجَع بعد الحذف وإعادة التسجيل', recov.rows[0].s === 'specialAccessActive')
const recovRow = await q(`select expires_at, activated_at, state from public.my_entitlement()`)
check('الاسترجاع يعيد الانتهاء الأصلي — حذف الحساب ليس زرّ تمديد',
  new Date(recovRow.rows[0].expires_at).getTime() === new Date(longExp).getTime(),
  `المسترجَع=${recovRow.rows[0].expires_at}`)
const recovRed = await q(`select count(*)::int n from public.access_code_redemptions`)
check('صفّ الاسترداد المنسوب يعود مع المنحة (رؤية المستخدم)', recovRed.rows[0].n >= 1)

// (ب) الاستنفاد لا يُسقط الاسترجاع: صفّ السجلّ *هو* الحصّة المستهلَكة.
// ONE-SHOT بحدّ ١: استرداده بعينه يستنفده — فلو أسقط الاستنفادُ الاسترجاعَ
// لصار كل كود فردي (الافتراضي) غير قابل للاسترجاع أبدًا.
await asRole('service_role')
await q(`select public.admin_create_access_code('W8N3S2T9QX','founder','فحص الاستنفاد',30,1)`)
const X1 = await mkUser('exhaust@example.com')
await asRole('authenticated', X1)
await q(`select public.redeem_access_code('W8N3S2T9QX')`)
await q(`select public.delete_own_account()`)
const X2 = await mkUser('exhaust@example.com')
await asRole('authenticated', X2)
const exhClaim = await q(`select public.claim_pending_grants() as s`)
check('كود مستنفَد: منحة صاحب الحصّة تُسترجَع (الحصّة استُهلكت أصلًا)',
  exhClaim.rows[0].s === 'specialAccessActive')
await asRole(null)
const exhCount = await q(`select redemption_count, max_redemptions from public.access_codes
                          where code_hash = private.hash_identity('W8N3S2T9QX',1)`)
check('الاسترجاع لا يستهلك حصّة جديدة ولا يلمس العدّاد',
  exhCount.rows[0].redemption_count === 1 && exhCount.rows[0].max_redemptions === 1)
// ومحاولة استرداد *جديدة* لهوية أخرى على المستنفَد تبقى مرفوضة كما كانت.
const X3 = await mkUser('exhaust-other@example.com')
await asRole('authenticated', X3)
await mustFail('استرداد جديد على كود مستنفَد يبقى مرفوضًا',
  () => q(`select public.redeem_access_code('W8N3S2T9QX')`), 'invalid_code')

// (ج) منحة منتهية لا تُسترجَع — تُشيَّخ بيد المالك كما شُيّخ كود EXPIRED-1.
await asRole('service_role')
await q(`select public.admin_create_access_code('E7PR3C9QX2','founder','فحص انتهاء المنحة',2,5)`)
const E1 = await mkUser('exp-rec@example.com')
await asRole('authenticated', E1)
await q(`select public.redeem_access_code('E7PR3C9QX2')`)
await q(`select public.delete_own_account()`)
await asRole(null)
await q(`update public.code_redemption_ledger set redeemed_at = now() - interval '3 days'
         where code_id = (select id from public.access_codes
                          where code_hash = private.hash_identity('E7PR3C9QX2',1))`)
const E2 = await mkUser('exp-rec@example.com')
await asRole('authenticated', E2)
const expClaim = await q(`select public.claim_pending_grants() as s`)
check('منحة كود منتهية لا تُسترجَع', expClaim.rows[0].s === 'noAccess')

// (د) كود عطّلته الإدارة = إبطال — منحته لا تُسترجَع (مفتاح طوارئ الكود المسرَّب).
await asRole('service_role')
await q(`select public.admin_create_access_code('D5R3C9QX2A','founder','فحص الإبطال الإداري',30,5)`)
const I1 = await mkUser('dis-rec@example.com')
await asRole('authenticated', I1)
await q(`select public.redeem_access_code('D5R3C9QX2A')`)
await q(`select public.delete_own_account()`)
await asRole(null)
await q(`update public.access_codes set enabled=false
         where code_hash = private.hash_identity('D5R3C9QX2A',1)`)
const I2 = await mkUser('dis-rec@example.com')
await asRole('authenticated', I2)
const disClaim = await q(`select public.claim_pending_grants() as s`)
check('كود مُبطَل إداريًا لا تُسترجَع منحته', disClaim.rows[0].s === 'noAccess')

// (هـ) الأسبقية: هوية تحمل شراءً واسترداد كود معًا ⇒ Premium لا special.
await asRole('authenticated', B2)
await q(`select public.redeem_access_code('L8NG3R3D9Q')`) // تُسجَّل ولا تُخفَّض (أُثبت أعلاه)
await q(`select public.delete_own_account()`)
const B3 = await mkUser('b@example.com')
await asRole('authenticated', B3)
const both = await q(`select public.claim_pending_grants() as s`)
check('عند اجتماع شراء وكود: الاسترجاع يقدّم Premium', both.rows[0].s === 'premiumActive')

// (و) الاستدعاء المتكرّر لحساب حيّ لا يمدّد ولا يقصّ — idempotent.
await asRole('authenticated', S2)
const before9 = (await q(`select expires_at from public.my_entitlement()`)).rows[0].expires_at
const again = await q(`select public.claim_pending_grants() as s`)
const after9 = (await q(`select expires_at from public.my_entitlement()`)).rows[0].expires_at
check('استدعاء الاسترجاع مكرّرًا لا يغيّر منحة قائمة',
  again.rows[0].s === 'specialAccessActive' &&
  new Date(before9).getTime() === new Date(after9).getTime())

// (ز) التجربة لا تُسترجَع — قرار معلَن لا سهو: الحذف يُنهي ما تبقّى منها.
await asRole('authenticated', A2)
const trialClaim = await q(`select public.claim_pending_grants() as s`)
check('التجربة لا تُسترجَع بعد الحذف (قرار معلَن)', trialClaim.rows[0].s === 'noAccess')

// ── ٩.٦) عقد الإلغاء الدائم — الحظر ينجو من حذف الحساب ────────────────────
// الثغرة المسدودة: إلغاء ← حذف ← إعادة تسجيل ← claim كانت تعيد Premium كاملة.

const RV = await mkUser('rv@example.com')
await asRole('service_role')
await q(`select public.admin_grant_premium('rv@example.com','manual','ORD-RV',1999,null)`)
await q(`select public.admin_revoke($1,'سوء استخدام — فحص العقد') as s`, [RV])
const rvGrantAfterRevoke = await q(`select public.admin_grant_premium(
  'rv@example.com','manual','ORD-RV-AFTER',1999,null) as s`)
check('منحة إدارية بعد الحظر تُسجَّل لكن لا ترفع الوصول', rvGrantAfterRevoke.rows[0].s === 'revoked')
await asRole(null)
const rvLedger = await q(`select count(*)::int n from public.revocation_ledger r
                          where r.lifted_at is null
                            and r.email_hash in (select email_hash from private.identity_hashes('rv@example.com'))`)
check('admin_revoke يكتب السجلّ الدائم', rvLedger.rows[0].n === 1)

await asRole('authenticated', RV)
const rvState = await q(`select state from public.my_entitlement()`)
check('المحظور يرى revoked', rvState.rows[0].state === 'revoked')
// الحقّ في المحو (PDPL) لا يعلّقه الحظر — الحذف يبقى متاحًا.
await q(`select public.delete_own_account()`)
await asRole(null)
const rvGone = await q(`select count(*)::int n from auth.users where id=$1`, [RV])
const rvKept = await q(`select count(*)::int n from public.revocation_ledger r
                        where r.lifted_at is null
                          and r.email_hash in (select email_hash from private.identity_hashes('rv@example.com'))`)
check('المحظور يظلّ قادرًا على حذف حسابه (حقّ المحو)', rvGone.rows[0].n === 0)
check('سجلّ الحظر ينجو من حذف الحساب', rvKept.rows[0].n === 1)

// إعادة التسجيل بنفس البريد: كل مسارات الخدمة الذاتية مقفلة، والحالة صادقة.
const RV2 = await mkUser('rv@example.com')
await asRole('authenticated', RV2)
await mustFail('إعادة التسجيل بعد الحظر: المطالبة بالشراء مقفلة',
  () => q(`select public.claim_pending_grants()`), 'access_revoked')
await mustFail('إعادة التسجيل بعد الحظر: التجربة مقفلة',
  () => q(`select public.start_trial()`), 'access_revoked')
await mustFail('إعادة التسجيل بعد الحظر: استرداد الأكواد مقفل',
  () => q(`select public.redeem_access_code('L8NG3R3D9Q')`), 'access_revoked')
const rv2State = await q(`select state from public.my_entitlement()`)
check('الهوية المحظورة تُعرَض revoked حتى بلا صفّ منحة (لا noAccess مضلِّلة)',
  rv2State.rows[0].state === 'revoked')

// حتى منحة خدمة جديدة بعد إعادة التسجيل لا تتجاوز سجلّ الإلغاء الدائم.
await asRole('service_role')
const rvGrantAfterReregistration = await q(`select public.admin_grant_premium(
  'rv@example.com','manual','ORD-RV-REREG',1999,null) as s`)
check('منحة بعد الحذف وإعادة التسجيل تبقى revoked', rvGrantAfterReregistration.rows[0].s === 'revoked')
await asRole('authenticated', RV2)
const rvAfterReregistrationGrant = await q(`select state from public.my_entitlement()`)
check('الحالة تظل revoked بعد المنحة اللاحقة', rvAfterReregistrationGrant.rows[0].state === 'revoked')

// الرفع إداري حصرًا — وبعده يعود الاسترجاع للعمل.
await mustFail('العميل لا ينادي admin_unrevoke',
  () => q(`select public.admin_unrevoke($1,'x')`, [RV2]), 'permission denied')
await asRole('service_role')
const rvLift = await q(`select public.admin_unrevoke($1,'قرار مراجعة') as s`, [RV2])
check('admin_unrevoke يرفع حظر هوية مُعاد تسجيلها', rvLift.rows[0].s === 'unrevoked')
await asRole('authenticated', RV2)
const rvBack = await q(`select public.claim_pending_grants() as s`)
const rvRestoredState = await q(`select state from public.my_entitlement()`)
check('admin_unrevoke وحده يعيد Premium من سجلّ الشراء',
  rvBack.rows[0].s === 'premiumActive' && rvRestoredState.rows[0].state === 'premiumActive')

// مستخدم بلا صفّ منحة يبقى قابلًا للحظر (كان no_entitlement يمنعه أصلًا).
const NE = await mkUser('noent@example.com')
await asRole('service_role')
const neRv = await q(`select public.admin_revoke($1,'حظر وقائي') as s`, [NE])
check('الحظر يعمل على مستخدم بلا منحة', neRv.rows[0].s === 'revoked')
await asRole('authenticated', NE)
const neState = await q(`select state from public.my_entitlement()`)
check('المحظور بلا منحة يرى revoked', neState.rows[0].state === 'revoked')
// ورفع حظر عمّن لم يُحظر خطأ مسمّى لا نجاح صامت — في الحالتين:
await asRole('service_role')
await mustFail('رفع حظر عن غير محظور (بلا صفّ منحة) يُرفض باسمه',
  () => q(`select public.admin_unrevoke($1,'x')`, [D]), 'not_revoked')
// S2 يحمل منحة كود نشطة وغير محظور — كان التحديث غير المشروط يطابق صفّه.
await mustFail('رفع حظر عن غير محظور (بصفّ منحة نشط) يُرفض باسمه أيضًا',
  () => q(`select public.admin_unrevoke($1,'x')`, [S2]), 'not_revoked')

// ── ١٠) سلامة search_path و SECURITY DEFINER ──────────────────────────────
// الفحص السابق كان يقبل أي `search_path=` غير فارغ — فكانت دالة تحمل
// `set search_path = public` (وهي عين الثغرة) تمرّ. المطلوب الآن حرفيًا:
// `search_path=""` في proconfig، أي `set search_path = ''` — لا سواه.
//
// والتغطية بالتعداد الآلي لا بقائمة أسماء: القائمة اليدوية تشيخ — دالة
// secdef جديدة تُضاف بلا search_path ما كانت لتدخل الفحص أصلًا.
await asRole(null)
const listSecdef = async () => (await q(`
  select n.nspname||'.'||p.proname as fn,
         coalesce(array_to_string(p.proconfig, ','), '') as cfg
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public','private') and p.prosecdef
  order by 1`)).rows
/** المخالف: secdef بلا search_path إطلاقًا، أو بمسار غير `''` حرفيًا. */
const unsafeSecdef = (rows) => rows.filter((r) => !/(^|,)search_path=""(,|$)/.test(r.cfg))

const secdefAll = await listSecdef()
check(`كل دوال SECURITY DEFINER (${secdefAll.length}) تحمل search_path='' حرفيًا — لا يكفي أنه غير موروث`,
  secdefAll.length >= 13 && unsafeSecdef(secdefAll).length === 0,
  unsafeSecdef(secdefAll).map((r) => `${r.fn}[${r.cfg || 'بلا search_path'}]`).join(' ') || `${secdefAll.length} دالة`)

// التأكيد المضادّ (§4.2): تُزرع دالة secdef بمسار غير مفرَّغ — عين الثغرة —
// ويجب أن يلتقطها **نفس الكاشف** باسمها. ثم دالة بلا search_path إطلاقًا.
// كاشف لا يسقط على العلّة المزروعة ليس كاشفًا.
await db.exec(`create function public.planted_unsafe_secdef() returns int
               language sql security definer set search_path = public as 'select 1';`)
const withPlant = unsafeSecdef(await listSecdef())
check('انتهاك مزروع (search_path=public) يُسقط الفحص باسم الدالة',
  withPlant.length === 1 && withPlant[0].fn === 'public.planted_unsafe_secdef',
  withPlant.map((r) => r.fn).join(' '))
await db.exec(`create function public.planted_inherit_secdef() returns int
               language sql security definer as 'select 1';`)
const withPlant2 = unsafeSecdef(await listSecdef())
check('انتهاك مزروع (secdef بلا search_path) يُلتقط أيضًا',
  withPlant2.some((r) => r.fn === 'public.planted_inherit_secdef'))
await db.exec(`drop function public.planted_unsafe_secdef();
               drop function public.planted_inherit_secdef();`)
check('بعد إزالة الزرع يعود الفحص نظيفًا', unsafeSecdef(await listSecdef()).length === 0)

// ── ١٠.٥) EXECUTE عبر PUBLIC — الدور الثالث المنسي ────────────────────────
// PUBLIC يشمل كل الأدوار، وPostgres يمنحه EXECUTE على كل دالة جديدة بافتراض
// مدمج. `revoke from anon, authenticated` وحده لا يغلق شيئًا ما دام PUBLIC
// مفتوحًا. proacl الفارغ = الافتراضي المدمج، فيُفكّ بـacldefault لا يُعدّ نظيفًا.
await asRole(null)
const publicExecutable = async () => (await q(`
  select n.nspname||'.'||p.proname as fn
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace,
  lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
  where n.nspname in ('public','private')
    and a.grantee = 0 and a.privilege_type = 'EXECUTE'
  order by 1`)).rows.map((r) => r.fn)

const pubExposed = await publicExecutable()
check('لا دالة في public/private قابلة للتنفيذ عبر PUBLIC', pubExposed.length === 0, pubExposed.join(' '))

// القادم لا يرث: دالة تُنشأ بعد الهجرة تولد مغلقة أمام PUBLIC.
await db.exec(`create function public.future_pub_probe() returns int language sql as 'select 1';`)
const futureLeak = (await publicExecutable()).filter((f) => f === 'public.future_pub_probe')
check('دالة جديدة لا ترث EXECUTE عبر PUBLIC (الافتراضي المدمج مقطوع)', futureLeak.length === 0)
await db.exec(`drop function public.future_pub_probe();`)

// مسبار عدم الفراغ: دور جديد لا يملك إلا usage على المخطّط. لو كان منعه من
// دوال الإدارة سببه نقص صلاحية أخرى — لا سحب EXECUTE — لفشل استدعاء المسبار
// المكشوف عمدًا أيضًا. نجاحه هو ما يجعل «permission denied» أدناه ذا معنى.
await db.exec(`create role pub_probe_role; grant usage on schema public to pub_probe_role;
               create function public.pub_open_probe() returns int language sql as 'select 42';
               grant execute on function public.pub_open_probe() to public;`)
await asRole('pub_probe_role')
const probeOpen = await q(`select public.pub_open_probe() as v`)
check('المسبار المكشوف عمدًا يعمل عبر PUBLIC (الفحوص التالية ليست فراغًا)', probeOpen.rows[0].v === 42)
await mustFail('دور عارٍ لا ينفّذ دالة إدارة عبر PUBLIC',
  () => q(`select public.admin_revoke('00000000-0000-0000-0000-000000000000'::uuid,'x')`), 'permission denied')
await mustFail('دور عارٍ لا ينفّذ دالة خدمة ذاتية عبر PUBLIC',
  () => q(`select public.start_trial()`), 'permission denied')
await mustFail('دور عارٍ لا ينفّذ دالة البصمة الخاصّة عبر PUBLIC',
  () => q(`select private.hash_identity('a@example.com',1)`), 'permission denied')
// يُسقَط المسبار قبل مرحلة الزرع كي يعود الكاشف لقائمة فارغة تمامًا —
// فالتقاط الزرع أدناه يطالب بأن يكون **هو وحده** الظاهر.
await asRole(null)
await db.exec(`drop function public.pub_open_probe();`)

// التأكيد المضادّ (§4.2): تُعاد منحة PUBLIC على دالة إدارة — عين الثغرة —
// فيلتقطها الكاشف **باسمها**، ويصل الدور العاري إلى جسد الدالة فعليًا
// (الخطأ يصير من داخلها لا من بوّابة الصلاحيات). ثم يُسحب الزرع ويعود النظيف.
await db.exec(`grant execute on function public.admin_revoke(uuid,text) to public;`)
const planted = await publicExecutable()
check('زرع PUBLIC EXECUTE على دالة إدارة يُسقط الفحص باسمها',
  planted.length === 1 && planted[0] === 'public.admin_revoke', planted.join(' '))
await asRole('pub_probe_role')
await mustFail('الزرع يفتح جسد الدالة فعليًا لدور عارٍ (تصعيد حقيقي لا شكلي)',
  () => q(`select public.admin_revoke('00000000-0000-0000-0000-000000000000'::uuid,'x')`), 'no_such_user')
await asRole(null)
await db.exec(`revoke all on function public.admin_revoke(uuid,text) from public;`)
check('بعد سحب الزرع يعود فحص PUBLIC نظيفًا', (await publicExecutable()).length === 0)
await asRole('pub_probe_role')
await mustFail('وبعد السحب يعود الدور العاري ممنوعًا',
  () => q(`select public.admin_revoke('00000000-0000-0000-0000-000000000000'::uuid,'x')`), 'permission denied')
await asRole(null)
// المنح المعلّقة بالدور (usage على المخطّط) تبعية تمنع حذفه — تُنزع أولًا.
await db.exec(`drop owned by pub_probe_role; drop role pub_probe_role;`)

// ── ١١) ضمانات بنيوية على المخطّط ─────────────────────────────────────────
const noStatus = await q(`select count(*)::int n from information_schema.columns
                          where table_schema='public' and table_name='entitlements' and column_name='status'`)
check('لا عمود status في المخطّط (الحالة تُشتقّ)', noStatus.rows[0].n === 0)

const durable = ['trial_ledger', 'purchase_ledger', 'code_redemption_ledger', 'revocation_ledger']
const withUid = await q(`select table_name from information_schema.columns
                         where table_schema='public' and column_name='user_id'
                           and table_name = any($1)`, [durable])
check('السجلّات الدائمة بلا عمود user_id (تنجو من الحذف)', withUid.rows.length === 0,
  withUid.rows.map((r) => r.table_name).join(', '))

const hv = await q(`select table_name from unnest($1::text[]) t(table_name)
                    where not exists (select 1 from information_schema.columns c
                      where c.table_schema='public' and c.table_name=t.table_name and c.column_name='hash_version')`,
  [durable])
check('hash_version على كل سجلّ هويّة دائم', hv.rows.length === 0, hv.rows.map((r) => r.table_name).join(', '))

const plain = await q(`select count(*)::int n from public.purchase_ledger where email_hash like '%@%'`)
const plain2 = await q(`select count(*)::int n from public.trial_ledger where email_hash like '%@%'`)
check('لا بريد صريح في السجلّات الدائمة', plain.rows[0].n === 0 && plain2.rows[0].n === 0)

const ret = await q(`select retention_policy,
                            (retain_until - first_trial_at) between interval '729 days' and interval '732 days' as ok
                     from public.trial_ledger limit 1`)
check('احتفاظ سجلّ التجربة موسوم ٢٤ شهرًا',
  ret.rows[0].retention_policy === 'anti_abuse_24m' && ret.rows[0].ok === true)
const pret = await q(`select retention_policy, retain_until from public.purchase_ledger limit 1`)
check('احتفاظ سجلّ الشراء مربوط بالعقد (retain_until NULL عمدًا)',
  pret.rows[0].retention_policy === 'contract_premium_recovery' && pret.rows[0].retain_until === null)
const rret = await q(`select count(*)::int total,
                             count(*) filter (where retention_policy='anti_abuse_ban' and retain_until is null)::int ok
                      from public.revocation_ledger`)
check('احتفاظ سجلّ الحظر: حتى الرفع الإداري لا بمؤقّت',
  rret.rows[0].total >= 1 && rret.rows[0].ok === rret.rows[0].total)

// الفحص يقرأ **الكود بلا تعليقات**: النسخة الأولى منه رسبت على نفسها لأن نصّ
// الهجرة يشرح «لا delete from في هذا الملف» — فطابَق الشرحُ النمطَ. تعليق لا
// يُنفَّذ، فلا يجوز أن يُسقط فحصًا ولا أن يُرضيه.
const stripSql = (t) => t.replace(/--[^\n]*/g, '')
const DESTRUCTIVE = /(delete\s+from|truncate|drop\s+table|pg_cron|cron\.schedule)/i
const noAuto = !DESTRUCTIVE.test(stripSql(mig(CORE)) + stripSql(mig(RPCS)) + stripSql(mig(REVK)) + stripSql(mig(RECV)) + stripSql(mig(PUBX)) + stripSql(mig(FIX)))
check('لا أتمتة حذف في P2 (لا delete/truncate/cron)', noAuto)
// تأكيد مضادّ: الكاشف يفشل فعلًا على انتهاك مزروع — وإلا فالفحص زينة.
check('كاشف الأتمتة يلتقط انتهاكًا مزروعًا',
  DESTRUCTIVE.test(stripSql('-- تعليق بريء\ndelete from public.trial_ledger where true;')))

const writePolicies = await q(`select policyname, cmd from pg_policies
                               where schemaname='public'
                                 and tablename in ('entitlements','access_codes','access_code_redemptions',
                                                   'trial_ledger','purchase_ledger','code_redemption_ledger','revocation_ledger')
                                 and cmd <> 'SELECT'`)
check('لا سياسة كتابة على أي جدول وصول', writePolicies.rows.length === 0,
  writePolicies.rows.map((r) => r.policyname).join(', '))

const rlsOff = await q(`select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
                        where n.nspname='public' and c.relrowsecurity = false
                          and relname in ('entitlements','access_codes','access_code_redemptions',
                                          'trial_ledger','purchase_ledger','code_redemption_ledger','revocation_ledger')`)
check('RLS مفعّل على كل جداول الوصول', rlsOff.rows.length === 0, rlsOff.rows.map((r) => r.relname).join(', '))

const banned = /مدى الحياة|lifetime/i.test(mig(CORE) + mig(RPCS) + mig(REVK) + mig(RECV) + mig(PUBX) + mig(FIX))
check('لا مصطلح محظور في المخطّط', !banned)

// ── الخلاصة ───────────────────────────────────────────────────────────────
await db.close()
const failed = results.filter((r) => !r.pass)
console.log(`\n${failed.length === 0 ? '🎉' : '⛔'} ${results.length - failed.length} نجحت / ${failed.length} فشلت\n`)
if (failed.length) { failed.forEach((f) => console.log(`   ✗ ${f.name}`)); process.exit(1) }
