#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// [RELEASE-REVIEW-001] هجوم التزامن على كتّاب المنحة — «الكود ثم التجربة»
// ═══════════════════════════════════════════════════════════════════════════
// الادّعاء المهاجَم: منحة حيّة لا تهبط إلى أدنى منها مهما تسابق الكتّاب.
// قبل 20260906120001 كان `start_trial` يتسابق مع `redeem_access_code_v2` لنفس
// الحساب ويكتب فوق صكّ ١٤ يومًا تجربةَ ٧٢ ساعة (مقيس: ٥ من ١٢ على Postgres 16).
//
// ثلاثة فحوص:
//   ① السباق الحقيقي N مرّة: النتيجة النهائية `special` دائمًا، ولا يُستهلك
//      سجلّ التجربة إلا حين فازت التجربة فعلًا قبل الكود (ترتيب مشروع).
//   ② مانع الهبوط عند الجدول: كاتبٌ بمفتاح الخدمة يحاول إنزال `special` حيّة
//      إلى `trial` — الصفّ لا يتغيّر. والمنتهية أو الملغاة تُستبدل (لا حجر زائد).
//   ③ التأكيد المضادّ (§4.2): بحذف الهجرة نفسها يمرّ الإنزال في ② — فالحارس
//      هو ما يمنع، لا الصدفة.
//   ④ [RELEASE-REVIEW-002] إعادة تدوير البريد عبر claim_pending_grants: شراءٌ
//      واحد لا يمنح Premium حيّة ثانية؛ وحذف الحساب ثم إعادة التسجيل بنفس البريد
//      يسترجع الشراء لصاحبه (الباب الشرعي مفتوح). والتأكيد المضادّ بحذف الهجرة.
//
// التخطّي معلَن (لا نجاح صامت): بلا عنقود على QIMMAH_PG_URL يُعلَن السبب ويخرج 0.
// ═══════════════════════════════════════════════════════════════════════════
import { clusterAvailable, createStaging, provision, makeUser } from '../db/lib/pg-staging.mjs'

const ITER = Number(process.env.RACE_ITER || 12)
const FIX = '20260906120001_entitlement_writer_serialization.sql'
const CLAIM_FIX = '20260906120002_claim_binds_purchase_ledger.sql'
let pass = 0, fail = 0
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? '🛡️  PASS' : '❌ FAIL'} — ${label}${detail ? `  ⟨${detail}⟩` : ''}`)
  if (ok) pass++; else fail++
}

if (!clusterAvailable()) {
  console.log('⏭️  تخطٍّ معلَن: لا عنقود Postgres على QIMMAH_PG_URL — هذا الهجوم يحتاج تزامنًا حقيقيًّا (لا PGlite).')
  process.exit(0)
}

const issueCode = (stg, founder, label, days = 14) => JSON.parse(stg.one(
  `select public.founder_issue_access_code('race probe', '${label}', ${days}, 1, null, null)::text;`,
  { role: 'authenticated', uid: founder })).code

const entOf = (stg, uid) => stg.one(
  `select entitlement_type || '|' || coalesce(expires_at::text, 'null') || '|' || source
     from public.entitlements where user_id = '${uid}';`)

// ── ① السباق الحقيقي ─────────────────────────────────────────────────────────
console.log(`① سباق redeem_access_code_v2 × start_trial لنفس الحساب — ${ITER} تكرارًا`)
{
  const stg = createStaging()
  try {
    check('كل الهجرات طُبِّقت بلا فشل', stg.failed.length === 0, stg.failed.map((f) => f.file).join(' '))
    const founder = makeUser(stg, 'founder@example.com')
    provision(stg, { founderEmail: 'founder@example.com' })
    let downgraded = 0, ledgerBurnedWithoutTrialWin = 0, finalSpecial = 0
    for (let k = 0; k < ITER; k++) {
      const u = makeUser(stg, `racer${k}@example.com`)
      const code = issueCode(stg, founder, `RACE-${k}`)
      const res = await stg.race(
        [`select public.redeem_access_code_v2('${code}')::text;`, 'select public.start_trial();'],
        [{ role: 'authenticated', uid: u }, { role: 'authenticated', uid: u }],
      )
      const redeemed = /specialAccessActive/.test(res[0].out || '')
      const trialWon = /trialActive/.test(res[1].out || '')
      const ent = entOf(stg, u) || ''
      const ledger = Number(stg.one(
        `select count(*) from public.trial_ledger t
          where t.email_hash in (select ih.email_hash from private.identity_hashes('racer${k}@example.com') ih);`))
      if (redeemed && ent.startsWith('special|')) finalSpecial++
      if (redeemed && ent.startsWith('trial|')) downgraded++
      if (ledger > 0 && !trialWon) ledgerBurnedWithoutTrialWin++
    }
    check('الكود استُردّ والنتيجة النهائية special في كل تكرار', finalSpecial === ITER, `${finalSpecial}/${ITER}`)
    check('صفر هبوط من special إلى trial', downgraded === 0, `${downgraded}/${ITER}`)
    check('سجلّ التجربة لا يُستهلك إلا حين فازت التجربة فعلًا', ledgerBurnedWithoutTrialWin === 0,
      `${ledgerBurnedWithoutTrialWin}`)
  } finally { stg.drop() }
}

// ── ② مانع الهبوط عند الجدول — لكل كاتب ─────────────────────────────────────
console.log('② مانع الهبوط: special حيّة لا تُنزَل إلى trial بأي كاتب — والمنتهية تُستبدل')
const tableGuardProbe = (stg) => {
  const u = makeUser(stg, 'guard@example.com')
  stg.sql(`insert into public.entitlements (user_id, email, entitlement_type, source, activated_at, expires_at, no_expiry)
           values ('${u}', 'guard@example.com', 'special', 'code', now(), now() + interval '10 days', false);`,
  { role: 'service_role' })
  stg.sql(`update public.entitlements set entitlement_type = 'trial', source = 'trial',
              expires_at = now() + interval '72 hours' where user_id = '${u}';`, { role: 'service_role' })
  const live = entOf(stg, u)
  const e = makeUser(stg, 'expired@example.com')
  stg.sql(`insert into public.entitlements (user_id, email, entitlement_type, source, activated_at, expires_at, no_expiry)
           values ('${e}', 'expired@example.com', 'special', 'code', now() - interval '20 days', now() - interval '6 days', false);`,
  { role: 'service_role' })
  stg.sql(`update public.entitlements set entitlement_type = 'trial', source = 'trial',
              expires_at = now() + interval '72 hours' where user_id = '${e}';`, { role: 'service_role' })
  return { live, expired: entOf(stg, e) }
}
{
  const stg = createStaging()
  try {
    provision(stg)
    const r = tableGuardProbe(stg)
    check('special حيّة تبقى special بعد محاولة الإنزال', (r.live || '').startsWith('special|'), r.live)
    check('special منتهية تُستبدل بتجربة (لا حجر زائد)', (r.expired || '').startsWith('trial|'), r.expired)
  } finally { stg.drop() }
}

// ── ③ التأكيد المضادّ — بحذف الهجرة يمرّ الإنزال ────────────────────────────
console.log(`③ ⚔️ التأكيد المضادّ: بدون ${FIX} يمرّ الإنزال`)
{
  const stg = createStaging(undefined, { exclude: [FIX] })
  try {
    provision(stg)
    const r = tableGuardProbe(stg)
    check('⚔️ التصميم القديم يُنزل special حيّة إلى trial — فالحارس هو المانع', (r.live || '').startsWith('trial|'), r.live)
  } finally { stg.drop() }
}

// ── ④ إعادة تدوير البريد عبر المطالبة — شراءٌ واحد ⇒ منحة حيّة واحدة ────────
console.log('④ claim_pending_grants بعد تبديل بريد المشتري: لا Premium ثانية من نفس الشراء')
const recycleProbe = (stg) => {
  const founder = makeUser(stg, 'founder@example.com')
  provision(stg, { founderEmail: 'founder@example.com' })
  const batch = JSON.parse(stg.one(
    `select public.founder_issue_purchase_batch('race probe', 'RECYCLE', 1, null)::text;`,
    { role: 'authenticated', uid: founder }))
  const code = batch.codes[0]
  const a = makeUser(stg, 'buyer@example.com')
  const redeem = stg.one(`select public.redeem_access_code_v2('${code}')::text;`, { role: 'authenticated', uid: a })
  stg.sql(`update auth.users set email = 'moved@example.com' where id = '${a}';`)
  const b = makeUser(stg, 'buyer@example.com')
  let claim
  try { claim = stg.one('select public.claim_pending_grants();', { role: 'authenticated', uid: b }) }
  catch (e) { claim = 'ERR ' + (String(e.stderr).split('\n').find((l) => /ERROR/.test(l)) || '') }
  const live = Number(stg.one(`select count(*) from public.entitlements where entitlement_type = 'premium' and revoked_at is null;`))
  // الباب الشرعي: صاحب الشراء يحذف حسابه ويعود بنفس البريد — الصفّ المحذوف حرّر الشراء.
  stg.sql(`delete from auth.users where id = '${a}';`)
  stg.sql(`delete from auth.users where id = '${b}';`)
  const a2 = makeUser(stg, 'buyer@example.com')
  let reclaim
  try { reclaim = stg.one('select public.claim_pending_grants();', { role: 'authenticated', uid: a2 }) }
  catch (e) { reclaim = 'ERR ' + (String(e.stderr).split('\n').find((l) => /ERROR/.test(l)) || '') }
  const bound = stg.one(`select (purchase_ledger_id is not null)::text from public.entitlements where user_id = '${a2}';`)
  return { redeem, claim, live, reclaim, bound }
}
{
  const stg = createStaging()
  try {
    const r = recycleProbe(stg)
    check('المشتري الأصلي نال Premium', /premiumActive/.test(r.redeem || ''), r.redeem)
    check('حساب جديد بالبريد المدوَّر لا ينال Premium من نفس الشراء', r.claim === 'noAccess', r.claim)
    check('منحة Premium حيّة واحدة لا اثنتان', r.live === 1, `${r.live}`)
    check('⟲ وحذف الحساب ثم العودة بنفس البريد يسترجع الشراء لصاحبه', r.reclaim === 'premiumActive', r.reclaim)
    check('⟲ والمنحة المستعادة مربوطة بصفّ الشراء', r.bound === 'true', r.bound)
  } finally { stg.drop() }
}
console.log(`⚔️ التأكيد المضادّ: بدون ${CLAIM_FIX} تُمنح Premium ثانية`)
{
  const stg = createStaging(undefined, { exclude: [CLAIM_FIX] })
  try {
    const r = recycleProbe(stg)
    check('⚔️ التصميم القديم يمنح Premium ثانية من نفس الشراء — فالربط هو المانع', r.live === 2 && r.claim === 'premiumActive', `${r.claim} · ${r.live}`)
  } finally { stg.drop() }
}

console.log('\n════════════════════════════════════════════════════════════')
console.log(`نتيجة: ${pass} نجحت · ${fail} فشلت`)
console.log(fail === 0 ? '🛡️  كتّاب المنحة مُسلسَلون، والهبوط ممنوع عند الجدول.' : '❌ سباق كتّاب المنحة مفتوح.')
process.exit(fail === 0 ? 0 : 1)
