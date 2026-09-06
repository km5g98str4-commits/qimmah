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
//
// التخطّي معلَن (لا نجاح صامت): بلا عنقود على QIMMAH_PG_URL يُعلَن السبب ويخرج 0.
// ═══════════════════════════════════════════════════════════════════════════
import { clusterAvailable, createStaging, provision, makeUser } from '../db/lib/pg-staging.mjs'

const ITER = Number(process.env.RACE_ITER || 12)
const FIX = '20260906120001_entitlement_writer_serialization.sql'
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

console.log('\n════════════════════════════════════════════════════════════')
console.log(`نتيجة: ${pass} نجحت · ${fail} فشلت`)
console.log(fail === 0 ? '🛡️  كتّاب المنحة مُسلسَلون، والهبوط ممنوع عند الجدول.' : '❌ سباق كتّاب المنحة مفتوح.')
process.exit(fail === 0 ? 0 : 1)
