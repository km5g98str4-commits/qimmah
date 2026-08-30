// ============================================================================
// test:attack-premium-authority — سلطة Premium: لا ازدواج، ولا هبوط.
// ============================================================================
// [COMMERCE-W1-HARDENING] عطلان **مقيسان على عنقود حقيقي** قبل أن يُصلَحا، لا
// مراجعةُ نصّ. وهذا الطقم يحرسهما معًا — ويبدأ بإثبات أن الثغرة كانت حقيقية:
//
//   ① [P0 · إيراد] إعادة تدوير البريد تمنح Premium دائمة بلا حدّ من صكّ واحد.
//      المسار: يستردّ ⇒ يغيّر بريده (يتحرّر العنوان) ⇒ حسابٌ جديد يسجّله
//      ويستردّ **نفس الصكّ** ⇒ منحة ثانية. والعدّاد يبقى 1/1 وقراءات المؤسس
//      تقول unredeemed=0 — فالازدواج غير مرئيّ.
//   ② [P1] «Premium لا تُخفَّض» كانت تُدَّعى ولا تُقاس: `start_trial` وفرع الكود
//      الموقوت يقرآن ثم يكتبان بلا `where`، فمنحة Premium بينهما تُدهَس.
//
// ═══ الاقتران المطلوب (§4.2) ═══
// قسم ① يبني قاعدةً **بلا هجرة التصليب** ويثبت أن الهجوم ينجح هناك. فلو حُذف
// السدّ يومًا لن يصير هذا الطقم أخضرَ مجّانًا: خضرته مشروطة بحمرةٍ مقابلة.
//
// قاعدة القراءة: 🛡️ = الهجوم رُدّ · ⚔️ = الهجوم نجح (عيب مؤكَّد).
// ============================================================================
import { clusterAvailable, createStaging, makeUser } from '../db/lib/pg-staging.mjs'

const HARDENING = '20260830120001_premium_authority_hardening.sql'
const PEPPER = 'redteam-fixture-pepper-v1-deterministic-0123456789abcdef'

let pass = 0, fail = 0
const check = (name, ok, detail = '') => {
  if (ok) { pass += 1; console.log(`  🛡️  PASS — ${name}${detail ? `  ⟨${detail}⟩` : ''}`) }
  else { fail += 1; console.log(`  ⚔️  FAIL — ${name}${detail ? `  ⟨${detail}⟩` : ''}`) }
  return ok
}

if (!clusterAvailable()) {
  console.log('⏭️  تخطٍّ معلَن: لا عنقود Postgres على QIMMAH_PG_URL — هذا الطقم يحتاج تزامنًا حقيقيًّا (لا PGlite).')
  process.exit(0)
}

/** قاعدة مهيّأة بمؤسس قادر على الإصدار. */
function boot(name, { exclude = [] } = {}) {
  const stg = createStaging(name, { exclude })
  if (stg.failed.length) throw new Error(`migrations failed: ${JSON.stringify(stg.failed.slice(0, 2))}`)
  stg.sql(`insert into private.identity_pepper (version, pepper) values (1, '${PEPPER}') on conflict (version) do nothing;`)
  const F = 'founder-auth@example.com'
  const fid = makeUser(stg, F)
  stg.sql(`select public.admin_set_role('${F}', 'founder', 'premium authority proof');`, { role: 'service_role' })
  return { stg, fid }
}
const issue = (stg, fid, label, n = 1) =>
  JSON.parse(stg.one(`select public.founder_issue_purchase_batch('authority proof', '${label}', ${n});`,
    { role: 'authenticated', uid: fid })).codes
const redeem = (stg, uid, code) =>
  stg.one(`select public.redeem_access_code_v2('${code}');`,
    { role: 'authenticated', uid, gateAction: 'redeem_access_code' })
const livePremiums = (stg) =>
  Number(stg.one(`select count(*) from public.entitlements where entitlement_type='premium' and no_expiry and revoked_at is null;`))

/** يُشغّل هجوم إعادة التدوير ويعيد عدد المنح الحيّة الناتجة. */
function recycleAttack(stg, fid, tag) {
  const code = issue(stg, fid, `RCY-${tag}`, 1)[0]
  const addr = `recycle-${tag}@example.com`
  const u1 = makeUser(stg, addr)
  const first = redeem(stg, u1, code)
  stg.sql(`update auth.users set email='moved-${tag}@example.com' where id='${u1}';`)
  const u2 = makeUser(stg, addr)
  const second = redeem(stg, u2, code)
  return { first, second, live: livePremiums(stg) }
}

// ── ① RED: بلا هجرة التصليب، الهجوم ينجح — فالسدّ يحرس ثغرةً كانت قائمة ────
console.log('① قبل التصليب — إعادة تدوير البريد **تنجح** (الثغرة المقيسة)')
{
  const { stg, fid } = boot('qimmah_auth_red', { exclude: [HARDENING] })
  try {
    const r = recycleAttack(stg, fid, 'red')
    check('⚠️ الأصل مثغور فعلًا: الاسترداد الثاني يمنح Premium', /premiumActive/.test(r.second), r.second)
    check('⚠️ ومنحتان دائمتان حيّتان من صكّ واحد', r.live === 2, `live=${r.live}`)
  } finally { stg.drop() }
}

// ── ② GREEN: مع التصليب، إعادة التدوير مردودة ──────────────────────────────
console.log('\n② بعد التصليب — إعادة التدوير مردودة، والشراء منحة واحدة')
{
  const { stg, fid } = boot('qimmah_auth_green')
  try {
    const r = recycleAttack(stg, fid, 'green')
    check('صاحب الصكّ ينال Premium', /premiumActive/.test(r.first), r.first)
    check('ومن أعاد تدوير العنوان يُردّ — بنفس رسالة المجهول لا عرّافًا',
      /invalid_code/.test(r.second), r.second)
    check('منحة دائمة **واحدة** من صكّ واحد', r.live === 1, `live=${r.live}`)
    const idx = stg.one(`select count(*) from pg_indexes where indexname='entitlements_one_live_premium_per_purchase';`)
    check('⟲ والسدّ بنيويّ (فهرس فريد) لا فحصٌ مشروط يتسابق', Number(idx) === 1)
  } finally { stg.drop() }
}

// ── ③ المسار المشروع لم يُكسر: الشراء ينجو من حذف الحساب ───────────────────
console.log('\n③ التأكيد المضادّ — الشراء ما زال ينجو من حذف الحساب')
{
  const { stg, fid } = boot('qimmah_auth_legit')
  try {
    const code = issue(stg, fid, 'LEGIT', 1)[0]
    const addr = 'phoenix-auth@example.com'
    const u1 = makeUser(stg, addr)
    check('التمهيد: اشترى', /premiumActive/.test(redeem(stg, u1, code)))
    stg.sql(`select public.delete_own_account();`, { role: 'authenticated', uid: u1, gateAction: 'delete_own_account' })
    check('الحذف محا صفّ المنحة (PDPL)',
      Number(stg.one(`select count(*) from public.entitlements where user_id='${u1}';`)) === 0)
    const u2 = makeUser(stg, addr)
    const claimed = stg.one(`select public.claim_pending_grants();`,
      { role: 'authenticated', uid: u2, gateAction: 'claim_pending_grants' })
    check('وبعد إعادة التسجيل يسترجع صاحبه Premium — السدّ لم يقفل البابَ الشرعي',
      /premiumActive/.test(claimed), claimed)
  } finally { stg.drop() }
}

// ── ④ لا هبوط عن Premium — مهما كان الكاتب ─────────────────────────────────
console.log('\n④ لا هبوط عن Premium — الحارس عند الجدول لا عند كاتبٍ بعينه')
{
  const { stg, fid } = boot('qimmah_auth_down')
  try {
    const code = issue(stg, fid, 'DOWN', 1)[0]
    const u = makeUser(stg, 'downgrade-auth@example.com')
    redeem(stg, u, code)
    const shape = () => stg.one(`select entitlement_type||'|'||source||'|'||no_expiry from public.entitlements where user_id='${u}';`)
    check('التمهيد: Premium دائمة', /^premium\|purchase_code\|t/.test(shape()), shape())
    // نفس عبارتَي الهبوط اللتين يشغّلهما الكاتبان المتسابقان، حرفيًّا.
    stg.sql(`update public.entitlements set entitlement_type='special', source='code',
             expires_at=now()+interval '14 days', no_expiry=false where user_id='${u}';`)
    check('كتابة الكود الموقوت فوقها لا تُخفّضها', /^premium\|purchase_code\|t/.test(shape()), shape())
    stg.sql(`update public.entitlements set entitlement_type='trial', source='trial',
             expires_at=now()+interval '72 hours', no_expiry=false, revoked_at=null where user_id='${u}';`)
    check('وكتابة التجربة فوقها كذلك — ولا تمسح الإلغاء', /^premium\|purchase_code\|t/.test(shape()), shape())
    check('والحقيقة الحيّة premiumActive',
      /premiumActive/.test(stg.one(`select state from public.my_entitlement();`, { role: 'authenticated', uid: u })))
    // ⚔️ التأكيد المضادّ: الإلغاء **ليس** هبوطًا — فالحارس لا يشلّ سلطة المؤسس.
    stg.sql(`select public.founder_revoke_access('${u}', 'proof');`, { role: 'authenticated', uid: fid })
    check('⟲ والإلغاء يمرّ — الحارس يمنع الهبوط لا سلطةَ المؤسس',
      /revoked/.test(stg.one(`select state from public.my_entitlement();`, { role: 'authenticated', uid: u })))
  } finally { stg.drop() }
}

console.log(`\n${'═'.repeat(60)}`)
console.log(`نتيجة: ${pass} نجحت · ${fail} فشلت`)
if (fail === 0) console.log('🛡️  شراءٌ واحد ⇒ منحة واحدة، وPremium لا تُخفَّض بأي كاتب.')
process.exit(fail === 0 ? 0 : 1)
