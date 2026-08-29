// ============================================================================
// test:attack-redeem-race — استهلاك الأكواد والمنح تحت **تزامن حقيقي**.
// ============================================================================
// [RED-TEAM-FINAL] لماذا هذا الطقم موجود إلى جانب `test:attack-commerce`:
//
// الأخير يفحص سبعة مستردّين على حدّ خمسة — لكنه يعمل على **PGlite باتصال
// واحد**، فالسبعة يتعاقبون ولا يتسابقون. وهو يفحص كذلك أن `for update` يسبق
// فحص العدّاد **نصيًّا** (`def.indexOf`)، وهو فحصُ شكلٍ لا فحصُ سلوك: ترتيبٌ
// صحيح في النصّ لا يثبت أن القفل يمنع التجاوز فعلًا تحت منافس.
//
// فهذا الطقم يفتح **عمليات psql مستقلّة تتسابق حقًّا** على نفس الصفّ، ويقيس
// النتيجة من الجدول لا من الادّعاء. ويتخطّى نفسه معلنًا إن لم يوجد عنقود.
//
// ═══ قاعدة القراءة ═══  🛡️ = الهجوم رُدّ · ⚔️ = الهجوم نجح (عيب مؤكَّد).
// ============================================================================
import { clusterAvailable, createStaging, makeUser } from '../db/lib/pg-staging.mjs'

const ITER = Number(process.env.QIMMAH_RACE_ITER || 8)
// أبجدية الأكواد تستبعد المتشابهات (I O 0 1) وتشترط ١٠ محارف فأكثر — فالحروف تُشتقّ منها.
const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const tag = (k) => L[k % L.length] + L[(k * 7 + 3) % L.length]
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

// ⚠️ **ملح ثابت لا عشوائي — وهذا مقصود مرّتين.**
//  ① طقمٌ يتسابق يجب أن يكون **حتميًّا**: عشوائيةٌ في التهيئة تُدخل متغيّرًا لا
//     يخصّ ما نقيسه (ذرّية الاستهلاك)، فتصير الجولة الحمراء غير قابلة للإعادة.
//  ② وحارس `G-8` في `test:attack-gates` يمسح المستودع بحثًا عن **مولّد أكواد
//     وصولٍ آليّ**: دالّة عشوائية تجاور إنشاء كود. وملحٌ عشوائي في هذه التهيئة
//     كان يقع في مرماه **بالمصادفة** فيُسقط حارسًا سليمًا على ملفّ اختبار لا
//     يولّد شيئًا. والعلاج إصلاح الطُّعم لا إضعاف الحارس — والأكواد أدناه
//     حرفيّة بلا عشوائية أصلًا، فالحتمية هنا مكسب لا تنازل.
const FIXTURE_PEPPER = 'redteam-fixture-pepper-v1-deterministic-0123456789abcdef'
const seed = (stg) => stg.sql(`insert into private.identity_pepper (version, pepper)
  values (1, '${FIXTURE_PEPPER}')
  on conflict (version) do nothing;`)
const mkCode = (stg, code, maxRed, days = 14) =>
  stg.sql(`select public.admin_create_access_code('${code}','redteam','race',${days},${maxRed},null,null);`,
    { role: 'service_role' })
const won = (r) => /specialAccessActive|premiumActive|trialActive/.test(r.out || '')

// ── ① كودٌ لمرّة واحدة، مستخدمان يستردّانه في آنٍ واحد ──────────────────────
console.log('① كود single-use — مستخدمان متزامنان')
{
  let both = 0, extraLedger = 0, overCount = 0
  for (let k = 0; k < ITER; k++) {
    const stg = createStaging()
    try {
      seed(stg); mkCode(stg, `RACESNGL${tag(k)}`, 1)
      const a = makeUser(stg, `ra${k}@example.com`)
      const b = makeUser(stg, `rb${k}@example.com`)
      const res = await stg.race(
        [`select public.redeem_access_code_v2('RACESNGL${tag(k)}');`, `select public.redeem_access_code_v2('RACESNGL${tag(k)}');`],
        [{ role: 'authenticated', uid: a }, { role: 'authenticated', uid: b }],
      )
      const wins = res.filter(won).length
      const cnt = Number(stg.one(`select redemption_count from public.access_codes limit 1;`))
      const led = Number(stg.one(`select count(*) from public.code_redemption_ledger;`))
      if (wins === 2) both++
      if (led > 1) extraLedger++
      if (cnt > 1) overCount++
    } finally { stg.drop() }
  }
  check('كودٌ لمرّة واحدة لا يُمنح لاثنين تحت التزامن', both === 0, `both-won ${both}/${ITER}`)
  check('سجلّ الاسترداد لا يحمل صفًّا زائدًا', extraLedger === 0, `extra-ledger ${extraLedger}/${ITER}`)
  check('العدّاد لا يتجاوز الحدّ', overCount === 0, `over-count ${overCount}/${ITER}`)
}

// ── ② حدّ خمسة، عشرة مستردّين متزامنين ─────────────────────────────────────
console.log('\n② حدّ max_redemptions=5 — عشرة مستردّين متزامنين')
{
  const stg = createStaging()
  try {
    seed(stg); mkCode(stg, 'RACEFVEXYZ', 5)
    const uids = []
    for (let i = 0; i < 10; i++) uids.push(makeUser(stg, `five${i}@example.com`))
    const res = await stg.race(
      uids.map(() => `select public.redeem_access_code_v2('RACEFVEXYZ');`),
      uids.map((u) => ({ role: 'authenticated', uid: u })),
    )
    const wins = res.filter(won).length
    const cnt = Number(stg.one(`select redemption_count from public.access_codes limit 1;`))
    const led = Number(stg.one(`select count(*) from public.code_redemption_ledger;`))
    const ents = Number(stg.one(`select count(*) from public.entitlements where entitlement_type='special';`))
    check('لا يفوز أكثر من خمسة', wins <= 5, `wins=${wins}`)
    check('العدّاد يقف عند الحدّ بالضبط', cnt === wins && cnt <= 5, `count=${cnt} wins=${wins}`)
    check('صفوف السجلّ = عدد الفائزين', led === wins, `ledger=${led} wins=${wins}`)
    check('التصاريح الممنوحة = عدد الفائزين', ents === wins, `entitlements=${ents} wins=${wins}`)
  } finally { stg.drop() }
}

// ── ③ نفس المستخدم يضغط «استرداد» مرّتين في آنٍ واحد (نقرة مزدوجة) ─────────
console.log('\n③ نقرة مزدوجة — نفس المستخدم، نفس الكود، نداءان متزامنان')
{
  let doubleCharged = 0
  for (let k = 0; k < ITER; k++) {
    const stg = createStaging()
    try {
      seed(stg); mkCode(stg, `DBLCLKAA${tag(k)}`, 5)   // حدٌّ واسع: العزل يجب أن يأتي من هوية المستردّ لا من الحدّ
      const u = makeUser(stg, `dbl${k}@example.com`)
      await stg.race(
        [`select public.redeem_access_code_v2('DBLCLKAA${tag(k)}');`, `select public.redeem_access_code_v2('DBLCLKAA${tag(k)}');`],
        [{ role: 'authenticated', uid: u }, { role: 'authenticated', uid: u }],
      )
      const cnt = Number(stg.one(`select redemption_count from public.access_codes limit 1;`))
      if (cnt > 1) doubleCharged++
    } finally { stg.drop() }
  }
  check('نقرة مزدوجة لا تستهلك الكود مرّتين لنفس الشخص', doubleCharged === 0, `double-charged ${doubleCharged}/${ITER}`)
}

// ── ④ claim_pending_grants متزامنة — شراءٌ واحد لا يصير تصريحين ────────────
console.log('\n④ claim_pending_grants متزامنة على شراء واحد')
{
  let dupEnt = 0
  for (let k = 0; k < ITER; k++) {
    const stg = createStaging()
    try {
      seed(stg)
      const u = makeUser(stg, `buy${k}@example.com`)
      stg.sql(`select public.admin_grant_premium('buy${k}@example.com','salla','ORD-${k}',1999,null);`,
        { role: 'service_role' })
      await stg.race(
        [`select public.claim_pending_grants();`, `select public.claim_pending_grants();`],
        [{ role: 'authenticated', uid: u }, { role: 'authenticated', uid: u }],
      )
      const ents = Number(stg.one(`select count(*) from public.entitlements where user_id='${u}';`))
      if (ents !== 1) dupEnt++
    } finally { stg.drop() }
  }
  check('مطالبتان متزامنتان ⇒ تصريح واحد بالضبط', dupEnt === 0, `bad-rows ${dupEnt}/${ITER}`)
}

// ── ⑤ تأكيد مضادّ (§4.2): الطقم يرى الفوز حين يجب أن يقع ────────────────────
// لولا هذا لكان «صفر فائزين» يُرضي ① و③ مجّانًا — طقمٌ يمرّ لأن لا شيء يعمل.
console.log('\n⑤ تأكيد مضادّ — الاسترداد المشروع ينجح فعلًا')
{
  const stg = createStaging()
  try {
    seed(stg); mkCode(stg, 'HAPPYPATHX', 1)
    const u = makeUser(stg, 'happy@example.com')
    const out = stg.one(`select public.redeem_access_code_v2('HAPPYPATHX');`, { role: 'authenticated', uid: u })
    check('استرداد مشروع واحد ⇒ specialAccessActive', /specialAccessActive/.test(String(out)), String(out).slice(0, 60))
    const cnt = Number(stg.one(`select redemption_count from public.access_codes limit 1;`))
    check('والعدّاد ارتفع إلى ١ — فالقياس يقيس شيئًا', cnt === 1, `count=${cnt}`)
  } finally { stg.drop() }
}

const passed = results.filter((r) => r.pass).length
const failed = results.length - passed
console.log(`\n${'═'.repeat(60)}\nنتيجة: ${passed} نجحت · ${failed} فشلت`)
if (failed > 0) { console.log('⚔️  عيبٌ مؤكَّد في استهلاك الأكواد تحت التزامن.'); process.exit(1) }
console.log('🛡️  الاستهلاك ذرّيّ تحت التزامن الحقيقي، والمسار المشروع سالم.')
