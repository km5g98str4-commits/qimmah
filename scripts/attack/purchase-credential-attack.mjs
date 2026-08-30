// ============================================================================
// test:attack-purchase-race — صكّ الشراء تحت **تزامن حقيقي** متعدّد الاتصالات.
// ============================================================================
// [COMMERCE-W1] أخوة `redemption-concurrency-attack.mjs`: صكّ الشراء يمنح
// **Premium دائمًا**، فأخطاء التزامن هنا أثمن — منحتان دائمتان لا وصولان
// موقوتان. يفتح عمليات psql مستقلّة تتسابق فعلًا على نفس الصفّ، ويقيس النتيجة
// من الجدول لا من الادّعاء. يتخطّى نفسه معلنًا إن لم يوجد عنقود.
//
// المحاور:
//   ① صكّ واحد، مستخدمان يستردّانه في آنٍ ⇒ فائز واحد، منحة واحدة، سجلّ واحد.
//   ② نقرة مزدوجة (نفس المستخدم، نداءان) ⇒ لا ازدواج منحة ولا سجلّ شراء.
//   ③ retry-after-timeout: بعد نجاح، نداءان متزامنان لصاحب الصكّ ⇒ premiumActive
//      ولا سجلّ شراء ثانٍ (idempotent تحت التزامن، لا تسلسليًّا فقط).
//   ④ ترقية متزامنة: تجربة نشطة + صكّان يُستردّان معًا ⇒ Premium واحدة لا اثنتان.
//   ⑤ تأكيد مضادّ: الاسترداد المشروع الواحد ينجح فعلًا (لا «صفر فائزين» مجّاني).
//
// قاعدة القراءة: 🛡️ = الهجوم رُدّ · ⚔️ = الهجوم نجح (عيب مؤكَّد).
// ============================================================================
import { clusterAvailable, createStaging, makeUser } from '../db/lib/pg-staging.mjs'

const ITER = Number(process.env.QIMMAH_RACE_ITER || 8)
const results = []
const check = (name, pass, detail = '') => {
  results.push({ name, pass })
  console.log(`  ${pass ? '🛡️  PASS' : '⚔️  FAIL'} — ${name}${detail ? `  ⟨${detail}⟩` : ''}`)
  return pass
}

if (!clusterAvailable()) {
  console.log('⏭️  تخطٍّ معلَن: لا عنقود Postgres على QIMMAH_PG_URL — هذا الطقم يحتاج تزامنًا حقيقيًّا (لا PGlite).')
  process.exit(0)
}

// ملح ثابت حتمي — نفس علّة redemption-concurrency: التسابق يجب أن يُعاد.
const FIXTURE_PEPPER = 'purchase-race-fixture-pepper-v1-0123456789abcdef'
const FOUNDER = 'founder-race@example.com'

/** تهيئة: ملح ثابت + مؤسس فعليّ يُصدر الصكوك (لا service_role مباشرةً). */
function seed(stg) {
  stg.sql(`insert into private.identity_pepper (version, pepper)
           values (1, '${FIXTURE_PEPPER}') on conflict (version) do nothing;`)
  const fid = makeUser(stg, FOUNDER)
  stg.sql(`select public.admin_set_role('${FOUNDER}', 'founder', 'purchase race');`,
    { role: 'service_role' })
  return fid
}
/** يُصدر دفعة صكوك شراء بهوية المؤسس، ويعيد قائمة الخام. */
function issue(stg, fid, label, count) {
  const raw = stg.one(
    `select public.founder_issue_purchase_batch('race proof', '${label}', ${count});`,
    { role: 'authenticated', uid: fid })
  // الردّ jsonb؛ psql يطبعه نصًّا — codes مصفوفة JSON.
  return JSON.parse(raw).codes
}
const isPremium = (r) => /premiumActive/.test(r.out || '')

// ── ① صكّ واحد، مستخدمان متزامنان ─────────────────────────────────────────
console.log('① صكّ شراء واحد — مستخدمان متزامنان')
{
  let bothWon = 0, extraLedger = 0, extraEnt = 0, overCount = 0
  for (let k = 0; k < ITER; k++) {
    const stg = createStaging()
    try {
      const fid = seed(stg)
      const [code] = issue(stg, fid, `PBATCH1${k}`, 1)
      const a = makeUser(stg, `pa${k}@example.com`)
      const b = makeUser(stg, `pb${k}@example.com`)
      const res = await stg.race(
        [`select public.redeem_access_code_v2('${code}');`, `select public.redeem_access_code_v2('${code}');`],
        [{ role: 'authenticated', uid: a }, { role: 'authenticated', uid: b }],
      )
      const wins = res.filter(isPremium).length
      const cnt = Number(stg.one(`select redemption_count from public.access_codes where grant_purpose='purchase' limit 1;`))
      const led = Number(stg.one(`select count(*) from public.purchase_ledger;`))
      const ents = Number(stg.one(`select count(*) from public.entitlements where entitlement_type='premium';`))
      if (wins === 2) bothWon++
      if (led > 1) extraLedger++
      if (ents > 1) extraEnt++
      if (cnt > 1) overCount++
    } finally { stg.drop() }
  }
  check('صكّ شراء لا يُمنح لاثنين تحت التزامن', bothWon === 0, `both-won ${bothWon}/${ITER}`)
  check('سجلّ الشراء لا يحمل صفًّا زائدًا', extraLedger === 0, `extra-ledger ${extraLedger}/${ITER}`)
  check('لا تُسكّ إلا منحة Premium واحدة', extraEnt === 0, `extra-ent ${extraEnt}/${ITER}`)
  check('عدّاد الاسترداد لا يتجاوز ١', overCount === 0, `over-count ${overCount}/${ITER}`)
}

// ── ② نقرة مزدوجة — نفس المستخدم، نداءان متزامنان ──────────────────────────
console.log('\n② نقرة مزدوجة — نفس المشتري، صكّ واحد، نداءان')
{
  let doubleCharged = 0, dupLedger = 0
  for (let k = 0; k < ITER; k++) {
    const stg = createStaging()
    try {
      const fid = seed(stg)
      const [code] = issue(stg, fid, `PDBL${k}`, 1)
      const u = makeUser(stg, `pdbl${k}@example.com`)
      const res = await stg.race(
        [`select public.redeem_access_code_v2('${code}');`, `select public.redeem_access_code_v2('${code}');`],
        [{ role: 'authenticated', uid: u }, { role: 'authenticated', uid: u }],
      )
      // كلا النداءين يجب أن ينجحا Premium (idempotent) — لا واحد يفشل بـcode_already_redeemed.
      const cnt = Number(stg.one(`select redemption_count from public.access_codes where grant_purpose='purchase' limit 1;`))
      const led = Number(stg.one(`select count(*) from public.purchase_ledger;`))
      if (cnt > 1) doubleCharged++
      if (led > 1) dupLedger++
      // تأكيد أن أيًّا من النداءين لم يخرج code_already_redeemed للمشتري نفسه.
      if (res.some((r) => /code_already_redeemed/.test(r.out || ''))) doubleCharged++
    } finally { stg.drop() }
  }
  check('نقرة مزدوجة لا تستهلك الصكّ مرّتين', doubleCharged === 0, `double-charged ${doubleCharged}/${ITER}`)
  check('ولا تكتب سجلّ شراء ثانيًا', dupLedger === 0, `dup-ledger ${dupLedger}/${ITER}`)
}

// ── ③ retry-after-timeout متزامن — الردّ ضاع، والمشتري يعيد ─────────────────
console.log('\n③ إعادة محاولة صاحب الصكّ (بعد نجاح) — نداءان متزامنان')
{
  let dupLedger = 0, notPremium = 0
  for (let k = 0; k < ITER; k++) {
    const stg = createStaging()
    try {
      const fid = seed(stg)
      const [code] = issue(stg, fid, `PRTY${k}`, 1)
      const u = makeUser(stg, `prty${k}@example.com`)
      // نجاح أول مثبَّت.
      stg.one(`select public.redeem_access_code_v2('${code}');`, { role: 'authenticated', uid: u })
      // ثم نداءان متزامنان (كأن الردّ ضاع مرّتين) — كلاهما يجب أن يتقارب.
      const res = await stg.race(
        [`select public.redeem_access_code_v2('${code}');`, `select public.redeem_access_code_v2('${code}');`],
        [{ role: 'authenticated', uid: u }, { role: 'authenticated', uid: u }],
      )
      const led = Number(stg.one(`select count(*) from public.purchase_ledger;`))
      if (led > 1) dupLedger++
      if (!res.every(isPremium)) notPremium++
    } finally { stg.drop() }
  }
  check('إعادة المحاولة المتزامنة تبقى premiumActive للطرفين', notPremium === 0, `not-premium ${notPremium}/${ITER}`)
  check('ولا تُنشئ سجلّ شراء ثانيًا (idempotent متزامن)', dupLedger === 0, `dup-ledger ${dupLedger}/${ITER}`)
}

// ── ④ ترقية متزامنة — تجربة نشطة + صكّان يُستردّان معًا ────────────────────
console.log('\n④ ترقية متزامنة — تجربة نشطة، صكّان في آنٍ')
{
  let dupEnt = 0, notPremium = 0
  for (let k = 0; k < ITER; k++) {
    const stg = createStaging()
    try {
      const fid = seed(stg)
      const codes = issue(stg, fid, `PUP${k}`, 2)
      const u = makeUser(stg, `pup${k}@example.com`)
      stg.one(`select public.start_trial();`, { role: 'authenticated', uid: u })
      // نفس المشتري يستردّ صكّين مختلفين في آنٍ — لا يجوز أن يصير صفّي منحة.
      await stg.race(
        [`select public.redeem_access_code_v2('${codes[0]}');`, `select public.redeem_access_code_v2('${codes[1]}');`],
        [{ role: 'authenticated', uid: u }, { role: 'authenticated', uid: u }],
      )
      const ents = Number(stg.one(`select count(*) from public.entitlements where user_id='${u}';`))
      const state = String(stg.one(`select state from public.my_entitlement();`, { role: 'authenticated', uid: u }))
      if (ents !== 1) dupEnt++
      if (!/premiumActive/.test(state)) notPremium++
    } finally { stg.drop() }
  }
  check('ترقية متزامنة ⇒ صفّ منحة واحد بالضبط (قيد user_id الفريد)', dupEnt === 0, `dup-ent ${dupEnt}/${ITER}`)
  check('والحالة النهائية premiumActive حتمًا', notPremium === 0, `not-premium ${notPremium}/${ITER}`)
}

// ── ⑤ تأكيد مضادّ — الاسترداد المشروع ينجح فعلًا ───────────────────────────
console.log('\n⑤ تأكيد مضادّ — صكّ شراء مشروع واحد ينجح')
{
  const stg = createStaging()
  try {
    const fid = seed(stg)
    const [code] = issue(stg, fid, 'PHAPPY', 1)
    const u = makeUser(stg, 'phappy@example.com')
    const out = String(stg.one(`select public.redeem_access_code_v2('${code}');`, { role: 'authenticated', uid: u }))
    check('استرداد صكّ مشروع ⇒ premiumActive', /premiumActive/.test(out), out.slice(0, 60))
    const noExp = String(stg.one(`select no_expiry from public.my_entitlement();`, { role: 'authenticated', uid: u }))
    check('والمنحة دائمة (no_expiry=t) — فالقياس يقيس شيئًا', noExp === 't', `no_expiry=${noExp}`)
  } finally { stg.drop() }
}

const passed = results.filter((r) => r.pass).length
const failed = results.length - passed
console.log(`\n${'═'.repeat(60)}\nنتيجة: ${passed} نجحت · ${failed} فشلت`)
if (failed > 0) { console.log('⚔️  عيبٌ مؤكَّد في صكّ الشراء تحت التزامن.'); process.exit(1) }
console.log('🛡️  صكّ الشراء ذرّيّ تحت التزامن الحقيقي، والترقية والإعادة سالمتان.')
