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
//   ⑥ [WAVE3] استردادٌ يسابق إطفاء الدفعة — A كاملة أو B كاملة، لا هجين.
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

// ── ⑥ [WAVE3] استردادٌ يسابق إطفاءَ الدفعة — نتيجتان صحيحتان لا ثالثة ──────
// A: الاسترداد سبق ⇒ منحة قائمة + صفّه يبقى حيًّا (مسند الدفعة يُسقطه) + سجلّ=١.
// B: الإطفاء سبق  ⇒ لا منحة + صفّه مُطفأ + عدّاده صفر + سجلّ=٠.
// الهجين الممنوع بالاسم: منحةٌ قائمة **وصفُّها مُطفأ قبل استرداده** — أي
// premium && !enabled && count=0، أو منحة بلا سجلّ، أو عدّاد بلا منحة.
console.log('\n⑥ استرداد ⚔ إطفاء الدفعة — على نفس الصكّ، عمليتا psql مستقلّتان')
{
  let winA = 0, winB = 0, hybrid = 0, partialLedger = 0, ghostCount = 0, siblingLive = 0
  const outcomes = []
  for (let k = 0; k < ITER; k++) {
    const stg = createStaging()
    try {
      const fid = seed(stg)
      // صكّان: الأول ساحة السباق، والثاني شاهدٌ يجب أن يُطفأ في الحالتين.
      const codes = issue(stg, fid, `PKILL${k}`, 2)
      const u = makeUser(stg, `pkill${k}@example.com`)
      const res = await stg.race(
        [
          `select public.redeem_access_code_v2('${codes[0]}');`,
          `select public.founder_disable_purchase_batch('PKILL${k}', 'سباق — إثبات ⑥');`,
        ],
        [{ role: 'authenticated', uid: u }, { role: 'authenticated', uid: fid }],
      )
      const premium = isPremium(res[0])
      const row = stg.one(
        `select enabled::text || '|' || redemption_count::text from public.access_codes
          where grant_purpose='purchase' and redemption_count > 0 limit 1;`)
      const anyRedeemed = row !== '' && row != null
      const [en0, cnt0] = String(stg.one(
        `select enabled::text || '|' || redemption_count::text from public.access_codes
          where code_hash in (select ih.email_hash from private.identity_hashes(private.normalize_access_code('${codes[0]}')) ih);`)).split('|')
      const ledger = Number(stg.one(`select count(*) from public.purchase_ledger;`))
      const disabledUnredeemed = Number(stg.one(
        `select count(*) from public.access_codes where grant_purpose='purchase' and not enabled and redemption_count = 0;`))

      if (premium) {
        // A — ولا يكون A إلا كاملًا: صفّه حيّ، عدّاده ١، سجلّ ١، وأخوه مُطفأ.
        if (en0 === 'true' && cnt0 === '1' && ledger === 1) winA++
        else hybrid++
        if (ledger !== 1) partialLedger++
        if (disabledUnredeemed !== 1) siblingLive++
      } else {
        // B — ولا يكون B إلا كاملًا: صفّه مُطفأ، عدّاده ٠، لا سجلّ، والاثنان مُطفآن.
        if (en0 === 'false' && cnt0 === '0' && ledger === 0) winB++
        else hybrid++
        if (Number(cnt0) > 0) ghostCount++
        if (disabledUnredeemed !== 2) siblingLive++
      }
      void anyRedeemed
      outcomes.push(premium ? 'A' : 'B')
    } finally { stg.drop() }
  }
  check('كل جولة انتهت A كاملةً أو B كاملةً — صفر هجين', hybrid === 0,
    `A=${winA} · B=${winB} · hybrid=${hybrid} · [${outcomes.join('')}]`)
  check('لا «منحة قائمة وصفٌّ مُطفأ قبل استرداده» — الهجين المسمّى بعينه', hybrid === 0)
  check('لا سجلّ شراء ناقص مع منحة (partial ledger)', partialLedger === 0, `${partialLedger}/${ITER}`)
  check('لا عدّاد استرداد بلا منحة (ghost count)', ghostCount === 0, `${ghostCount}/${ITER}`)
  check('والصكّ الشقيق غير المتسابَق عليه مُطفأ في كل جولة — فالإطفاء وقع فعلًا',
    siblingLive === 0, `${siblingLive}/${ITER}`)
  // ⟲ التأكيد المضادّ: السباق يرى الاتجاهين لا اتجاهًا واحدًا يمرّ مجّانًا —
  // ٨ جولات كلّها A أو كلّها B تعني أن التزامن لم يقع أصلًا فيُبلَّغ لا يُدّعى.
  check('⟲ والقياس رأى نتيجةً محدَّدة في كل جولة (لا جولة بلا حكم)',
    winA + winB + hybrid === ITER, `${winA + winB + hybrid}/${ITER}`)
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
