// ============================================================================
// test:staging-guard — إثبات حارس البيئة [CTO-BACKEND-003] §5
// ============================================================================
// الحارس يَعِد بوعدين، وكلاهما يُهاجَم هنا لا يُصدَّق:
//   ① مرجع الإنتاج **يُرفض باسمه**، و② الرفض يقع **قبل أي وصول** لقاعدة أو نشر.
//
// الوعد ② لا يُثبَت بقراءة الكود: يُمرَّر موصولٌ **يَعُدّ نداءاته**، ويُؤكَّد أن
// العدّاد صفر عند كل رفض. ادّعاء «لم نلمس شيئًا» بلا عدّاد ليس إثباتًا.
//
// التشغيل: npm run test:staging-guard
// ============================================================================
import { preflightOffline, preflightFull, refFromUrl, REFUSAL, loadConfig, CONFIG_PATH }
  from '../staging/preflight.mjs'

const results = []
function check(name, pass, detail = '') {
  results.push({ name, pass })
  console.log(`  ${pass ? '✓' : '✗ FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  return pass
}

console.log('\n▶ حارس بيئة staging\n')

// مراجع وهمية بطول مرجع Supabase الحقيقي — لا علاقة لها بأي مشروع قائم.
const PROD_REF = 'prodaaaaaaaaaaaaaaaa'
const STAGE_REF = 'stagebbbbbbbbbbbbbbb'
const STAGE_NAMED_REF = 'stagingccccccccccccc'   // مرجع فيه كلمة staging عمدًا
const OK_ENV = { QIMMAH_TARGET_ENV: 'staging' }

const cfg = (over = {}) => ({
  ...loadConfig(), stagingAllowedRefs: [STAGE_REF], productionRefs: [PROD_REF], ...over,
})

/** موصول يَعُدّ — وجوده هو ما يجعل «لم يُلمَس شيء» قابلًا للقياس. */
function countingConnect(rows = [{ env: 'staging' }]) {
  const state = { connects: 0, queries: 0 }
  const fn = async (ref) => {
    state.connects++
    state.ref = ref
    return { query: async () => { state.queries++; return { rows } } }
  }
  fn.state = state
  return fn
}

// ── ١) الحالة المشحونة: التهيئة المُسلَّمة ترفض كل شيء ─────────────────────
console.log('— ١) التهيئة المُسلَّمة (قائمتان فارغتان)')
const shipped = loadConfig()
check('قائمة السماح المُسلَّمة فارغة (فشل مغلق)', shipped.stagingAllowedRefs.length === 0)
check('قائمة الإنتاج المُسلَّمة فارغة (تُملأ بيد المؤسس)', shipped.productionRefs.length === 0)
let r = preflightOffline({ targetRef: STAGE_REF, env: OK_ENV, config: shipped })
check('وبها يُرفض حتى مرجع تجريبي سليم', !r.ok && r.code === REFUSAL.NO_ALLOWLIST, r.code)
check('ولا مفاتيح ولا أسرار في ملف التهيئة',
  !/service_role|anon[_-]?key|secret|password|eyJ/i.test(JSON.stringify(shipped)))

// ── ٢) مرجع الإنتاج يُرفض باسمه — التأكيد المضادّ المركزي ──────────────────
console.log('\n— ٢) زرع مرجع الإنتاج')
const c1 = countingConnect()
r = await preflightFull({ targetRef: PROD_REF, env: OK_ENV, config: cfg(), connect: c1 })
check('مرجع الإنتاج المزروع يُرفض', !r.ok)
check('ويُرفض **باسمه** (production_ref_denied)', r.code === REFUSAL.PRODUCTION_DENIED, r.code)
check('الرفض في المرحلة ①', r.phase === 1, `phase=${r.phase}`)
check('ولم تُفتح أي وصلة إلى الهدف', c1.state.connects === 0, `connects=${c1.state.connects}`)
check('ولم يُنفَّذ أي استعلام', c1.state.queries === 0, `queries=${c1.state.queries}`)
check('والحارس يعلن أنه لم يلمس الهدف', r.touchedTarget === false)

// المنع يفوز على السماح حتى لو أُدرج المرجع في القائمتين خطأً.
r = preflightOffline({
  targetRef: PROD_REF, env: OK_ENV,
  config: cfg({ stagingAllowedRefs: [STAGE_REF, PROD_REF] }),
})
check('مرجع الإنتاج مرفوض ولو أُدرج في قائمة السماح خطأً',
  !r.ok && r.code === REFUSAL.PRODUCTION_DENIED, r.code)

// ── ٣) الاسم لا يُوثَق به — الشرط الصريح في §5 ─────────────────────────────
console.log('\n— ٣) الاسم ليس سندًا')
const c2 = countingConnect()
r = await preflightFull({ targetRef: STAGE_NAMED_REF, env: OK_ENV, config: cfg(), connect: c2 })
check('مرجع فيه كلمة "staging" يُرفض ما لم يكن مُعلَنًا',
  !r.ok && r.code === REFUSAL.NOT_ALLOWLISTED, r.code)
check('ولم يُلمس الهدف', c2.state.connects === 0)
r = preflightOffline({
  targetRef: STAGE_NAMED_REF, env: OK_ENV,
  config: cfg({ stagingAllowedRefs: [STAGE_NAMED_REF] }),
})
check('ويُقبل حين يُدرَج مرجعه صراحةً (الفرق هو الإدراج لا الاسم)', r.ok === true)

// ── ٤) إعلان البيئة شرط مستقلّ ─────────────────────────────────────────────
console.log('\n— ٤) إعلان البيئة')
for (const [label, env] of [
  ['غائبة', {}],
  ['production', { QIMMAH_TARGET_ENV: 'production' }],
  ['فارغة', { QIMMAH_TARGET_ENV: '   ' }],
  ['مضلِّلة', { QIMMAH_TARGET_ENV: 'staging-ish' }],
]) {
  const rr = preflightOffline({ targetRef: STAGE_REF, env, config: cfg() })
  check(`QIMMAH_TARGET_ENV ${label} ⇒ رفض`, !rr.ok && rr.code === REFUSAL.ENV_NOT_DECLARED, rr.code)
}
check('وبالإعلان الصحيح يمرّ',
  preflightOffline({ targetRef: STAGE_REF, env: OK_ENV, config: cfg() }).ok === true)

// ── ٥) مرجع مجهول أو رابط مشوَّه ───────────────────────────────────────────
console.log('\n— ٥) المجهول يُرفض')
r = preflightOffline({ targetRef: 'unknownrefzzzzzzzzzz', env: OK_ENV, config: cfg() })
check('مرجع غير مُدرَج ⇒ رفض', !r.ok && r.code === REFUSAL.NOT_ALLOWLISTED, r.code)
r = preflightOffline({ env: OK_ENV, config: cfg() })
check('بلا مرجع ولا رابط ⇒ رفض', !r.ok && r.code === REFUSAL.REF_MISSING, r.code)
check('استخراج المرجع من رابط صحيح',
  refFromUrl(`https://${STAGE_REF}.supabase.co`) === STAGE_REF)
for (const bad of ['https://evil.com', `https://${STAGE_REF}.supabase.co.evil.com`,
  'http://x.supabase.co', 'not a url', '']) {
  check(`رابط مشوَّه يُرفض (${bad.slice(0, 34) || '(فارغ)'})`, refFromUrl(bad) === null)
}
// رابط إنتاج كامل يُرفض كما يُرفض مرجعه
r = preflightOffline({ targetUrl: `https://${PROD_REF}.supabase.co`, env: OK_ENV, config: cfg() })
check('رابط الإنتاج الكامل يُرفض بنفس الاسم', !r.ok && r.code === REFUSAL.PRODUCTION_DENIED, r.code)

// ── ٦) المرحلة ② — العلامة الحيّة ──────────────────────────────────────────
console.log('\n— ٦) علامة البيئة الحيّة')
const c3 = countingConnect([{ env: 'staging' }])
r = await preflightFull({ targetRef: STAGE_REF, env: OK_ENV, config: cfg(), connect: c3 })
check('مرجع مُعلَن + علامة staging ⇒ يمرّ', r.ok === true && r.phase === 2, `${r.ok}/${r.phase}`)
check('وقد فُتحت وصلة واحدة فقط', c3.state.connects === 1 && c3.state.queries === 1)
check('والوصلة فُتحت على المرجع المفحوص نفسه', c3.state.ref === STAGE_REF)

const c4 = countingConnect([{ env: 'production' }])
r = await preflightFull({ targetRef: STAGE_REF, env: OK_ENV, config: cfg(), connect: c4 })
check('علامة تقول production ⇒ رفض في المرحلة ②',
  !r.ok && r.code === REFUSAL.MARKER_MISMATCH && r.phase === 2, `${r.code}/${r.phase}`)
check('والحارس يعترف بأنه لمس الهدف في هذه الحالة', r.touchedTarget === true)

const c5 = countingConnect([])
r = await preflightFull({ targetRef: STAGE_REF, env: OK_ENV, config: cfg(), connect: c5 })
check('علامة غائبة (لا صفوف) ⇒ رفض', !r.ok && r.code === REFUSAL.MARKER_MISMATCH, r.code)

const throwing = async () => { throw new Error('relation "private.environment_marker" does not exist') }
r = await preflightFull({ targetRef: STAGE_REF, env: OK_ENV, config: cfg(), connect: throwing })
check('جدول العلامة غير موجود ⇒ رفض لا تجاوز',
  !r.ok && r.code === REFUSAL.MARKER_UNREADABLE, r.code)

// ── ٧) لا مسار تجاوز ───────────────────────────────────────────────────────
console.log('\n— ٧) لا باب خلفي')
const src = (await import('node:fs')).readFileSync(
  new URL('../staging/preflight.mjs', import.meta.url), 'utf8')
const stripped = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
check('لا علم "force" أو "skip" في الحارس',
  !/force|skip[_-]?(check|guard|preflight)|--yes|BYPASS/i.test(stripped))
check('لا استثناء لـNODE_ENV أو وضع تطوير',
  !/NODE_ENV|DEV_MODE|isDev/i.test(stripped))
check('المنع يسبق السماح في الكود (الترتيب ضمانة لا نيّة)',
  stripped.indexOf('productionRefs') < stripped.indexOf('stagingAllowedRefs'))
check('ملف التهيئة تحت المستودع ومُتتبَّع', /environment\.json/.test(CONFIG_PATH))

// محاكاة التفاف: تبديل حقيقي للاسمين (لا إعادة تسمية) حتى تسبق قائمةُ السماح
// قائمةَ المنع في النصّ — أي الحالة الخطرة بعينها. لا بدّ أن يسقط فحص الترتيب.
const flipped = stripped
  .replace(/productionRefs/g, '@@TMP@@')
  .replace(/stagingAllowedRefs/g, 'productionRefs')
  .replace(/@@TMP@@/g, 'stagingAllowedRefs')
check('فحص الترتيب يسقط على ترتيب مقلوب مزروع',
  (flipped.indexOf('productionRefs') < flipped.indexOf('stagingAllowedRefs')) === false,
  `prod@${flipped.indexOf('productionRefs')} allow@${flipped.indexOf('stagingAllowedRefs')}`)

// ── ٨) أداة التقاط العقد — §4 ──────────────────────────────────────────────
console.log('\n— ٨) التقاط العقد بلا بيانات شخصية')
const { captureObservation, auditObservation, structuralShape, shortDigest, CONTRACT_FIELDS } =
  await import('../staging/capture-contract.mjs')
const { hmacSha256Hex } = await import('../../supabase/functions/salla-webhook/contract.mjs')

const CAP_SECRET = 'capture-secret-value-0123456789ab'
// حمولة محشوّة ببيانات شخصية عمدًا — إن تسرّب شيء فسيظهر.
const pii = JSON.stringify({
  event: 'order.status.updated', merchant: 472944967, created_at: '2026-08-14T09:00:00Z',
  data: {
    id: 'SC-CAPTURE-1', status: 'تم التنفيذ', note: 'اتصل على العميل قبل التوصيل',
    order: {
      id: 'ORD-CAPTURE-1', reference_id: 42264,
      status: { id: 1, name: 'تم التنفيذ', slug: 'completed' },
      currency: 'SAR',
      amounts: { total: { amount: 19.99, currency: 'SAR' } },
      items: [{ id: 9, sku: 'SKU-PREM', product: { id: 'PROD-PREMIUM', name: 'Qimmah Premium' }, quantity: 1 }],
      customer: {
        id: 77, first_name: 'زياد', last_name: 'الفحّاد',
        email: 'real.buyer@example.com', mobile: 501234567, mobile_code: '+966',
        city: 'الرياض', country: 'SA', avatar: 'https://cdn/x.png',
      },
      shipping: { address: { street: 'شارع الملك فهد', postal_code: '12345' } },
      is_pending_payment: false,
    },
  },
})
const capHeaders = new Headers({
  'X-Salla-Security-Strategy': 'signature',
  'X-Salla-Signature': await hmacSha256Hex(CAP_SECRET, pii),
})

let cap = await captureObservation({ rawBody: pii, headers: capHeaders, secret: CAP_SECRET })
check('حمولة متحقَّق منها تُلتقط', cap.ok === true, cap.reason)
const obs = cap.observation
check('نتيجة التحقّق مسجَّلة', obs.signatureVerification.outcome === 'verified'
  && obs.signatureVerification.strategy === 'signature')
for (const f of CONTRACT_FIELDS) {
  check(`الحقل التعاقدي «${f}» ملتقَط`, obs.contract[f] !== undefined,
    JSON.stringify(obs.contract[f])?.slice(0, 40))
}
check('المعرّف الخارجي والطلب مفصولان (SC-CAPTURE-1 ≠ ORD-CAPTURE-1)',
  obs.contract.outerId === 'SC-CAPTURE-1' && obs.contract.orderId === 'ORD-CAPTURE-1')

const audit = auditObservation(obs)
check('التدقيق: الرصد نظيف تمامًا', audit.clean === true, audit.violations.join(','))
const capJson = JSON.stringify(obs)
for (const [label, needle] of [
  ['البريد', 'real.buyer@example.com'], ['الاسم الأول', 'زياد'], ['اسم العائلة', 'الفحّاد'],
  ['الجوال', '501234567'], ['المدينة', 'الرياض'], ['الشارع', 'شارع الملك فهد'],
  ['الرمز البريدي', '12345'], ['الملاحظة', 'اتصل على العميل'], ['السرّ', CAP_SECRET],
  ['التوقيع', capHeaders.get('X-Salla-Signature')],
]) {
  check(`${label} غير موجود في الرصد`, !capJson.includes(needle))
}
check('الشكل يحمل مسار البريد ونوعه لا قيمته',
  obs.shape.includes('data.order.customer.email: string'))
check('بصمة المشتري قصيرة وغير عكوسة', /^[0-9a-f]{12}$/.test(obs.buyerDigest))
check('نفس البريد يعطي نفس البصمة',
  obs.buyerDigest === await shortDigest('real.buyer@example.com'))
check('بريد آخر يعطي بصمة أخرى',
  obs.buyerDigest !== await shortDigest('other.buyer@example.com'))

// حمولة غير متحقَّق منها لا تُلتقط أصلًا
cap = await captureObservation({
  rawBody: pii, headers: new Headers({ 'X-Salla-Signature': 'f'.repeat(64) }), secret: CAP_SECRET,
})
check('حمولة بتوقيع فاسد لا تُلتقط', cap.ok === false && /unverified/.test(cap.reason), cap.reason)

// تأكيد مضادّ: مدقّق التسريب يلتقط زرعًا
check('مدقّق التسريب يسقط على بريد مزروع',
  auditObservation({ ...obs, note: 'leak@example.com' }).clean === false)
check('ومدقّق التسريب يسقط على حقل يشبه السرّ',
  auditObservation({ ...obs, signature: 'abc123' }).clean === false)
check('الشكل لا يُخرج قيمًا لمصفوفة متكرّرة (عنصر واحد يكفي)',
  structuralShape({ items: [{ a: 1 }, { a: 2 }] }).length === 1)

// ── الخلاصة ────────────────────────────────────────────────────────────────
const passed = results.filter((x) => x.pass).length
const failedN = results.length - passed
console.log(`\n${failedN === 0 ? '🎉' : '💥'} ${passed} نجحت / ${failedN} فشلت\n`)
if (failedN > 0) results.filter((x) => !x.pass).forEach((x) => console.log('  ✗', x.name))
process.exit(failedN === 0 ? 0 : 1)
