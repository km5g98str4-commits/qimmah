// ============================================================================
// عقد سلة — منطق خالص، بلا شبكة وبلا قاعدة وبلا Deno.
// ============================================================================
// مفصول عن `index.ts` عمدًا: كل قرار أمني هنا **قابل للاختبار من Node** بلا
// تشغيل طرفية ولا محاكاة HTTP. الطرفية تتولّى النقل وحده.
//
// ─────────────────────────────────────────────────────────────────────────────
// المصدر: توثيق سلة الرسمي (docs.salla.dev). الحقول أدناه **منقولة لا مخمَّنة**:
//
//   • الترويسات: `X-Salla-Security-Strategy` · `X-Salla-Signature` ·
//     `Authorization`.  (docs.salla.dev/doc-421119)
//   • التحقّق: HMAC-SHA256 على **جسم الطلب الخام**، أربع وستون خانة ست عشرية،
//     تُقارَن مقارنةً ثابتة الزمن.
//   • الإعادة: ثلاث محاولات بفواصل ~٥ دقائق عند غياب ردّ ناجح.
//   • المظروف: `event` · `merchant` · `created_at` · `data`.
//   • الطلب: `data.id` · `data.reference_id` · `data.status.slug` ·
//     `data.payment_method` · `data.amounts.total.amount` ·
//     `data.amounts.total.currency` · `data.customer.email`.
//     (docs.salla.dev/433804m0)
//
// ⚠️ **حدّ معلَن:** توثيق سلة يسرد شرائح الحالة (`payment_pending` ·
//    `under_review` · `in_progress` · `completed`) **ولا يصرّح أيّها يضمن أن
//    المال وصل**. فلا نخمّن: القائمة المقبولة **إعداد صريح** افتراضه أضيق ما
//    يمكن (`completed` وحدها)، وأي شريحة خارجها ⇒ **لا منحة**. تُوسَّع بقرار
//    بعد مطابقة حمولة حقيقية على staging — لا باجتهاد هنا.
// ============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// [CTO-86] تصحيحان أوجبهما فحص مصادر سلة الرسمية — والأول كان سيفسد المفتاح.
//
// ① **`order.payment.updated` ليس حدث دفع مكتمل.** وصفه في مستودع سلة الرسمي
//    (`SallaApp/webhook-actions-js` · `express-starter-kit`) حرفيًا:
//    *"A payment method has been updated"* — أي **تغيّرت وسيلة الدفع**. قبوله
//    كمرشّح للمنح خلط بين «غيّر البطاقة» و«وصل المال». حُذف من القائمة.
//
// ② **`order.status.updated` حمولته شكل آخر**، وهنا كان الخطر:
//
//      { "id": 198290473,          ← معرّف **تغيّر الحالة**، لا معرّف الطلب
//        "status": "تم التنفيذ",    ← **نصّ** هنا، لا كائن فيه slug
//        "order": { "id": 629263027, "status": { "slug": "completed" },
//                   "amounts": {…}, "customer": {…} } }
//
//    القارئ السابق كان يأخذ `data.id` معرّفًا للطلب — أي **معرّف تغيّر الحالة**.
//    وهو يختلف مع كل انتقال حالة للطلب الواحد، فكان:
//      • مفتاح التكرار `(provider, provider_order_id)` يتبدّل مع كل انتقال ⇒
//        الطلب الواحد يُمنح مرارًا تحت «طلبات» مختلفة،
//      • وحارس ربط الهوية **لا يشتغل أصلًا** لأنه لا يجد الطلب السابق.
//    أي أن أثمن ثابت في الموجة الماضية كان يُلتفّ عليه من حيث لا يُقصد.
//
//    (لم يُستغَلّ فعليًا: `data.status` نصٌّ لا كائن، فكانت الشريحة تخرج فارغة
//    والحدث يسقط `unpaid_or_incomplete`. فشلٌ مغلق بالصدفة لا بالتصميم —
//    وأول من «يصلح» قراءة الشريحة كان سيفتح الثقب على مصراعيه.)
//
// المصدر: `SallaApp/salla-partners-agent-kit` →
//   `.agents/skills/salla-app-functions-design/references/event-contexts.md`
// ─────────────────────────────────────────────────────────────────────────────

/**
 * أحداث سلة التي نقبلها أصلًا. ما عداها يُسجَّل `ignored` ولا يُمنح.
 * `order.payment.updated` **ليس منها** — انظر أعلاه.
 */
export const SUPPORTED_EVENTS = ['order.status.updated']

/**
 * ⛔ **لا افتراض.** الشرائح التي تعني «وصل المال» **غير موثَّقة** لدى سلة:
 * التوثيق يسرد `payment_pending` · `under_review` · `in_progress` · `completed`
 * ولا يصرّح أيّها يضمن الدفع. و[CTO-86] نصّ على ألّا تُعتمد `['completed']`
 * حقيقةً إنتاجية قبل حمولة حقيقية.
 *
 * فالقائمة **إعداد إلزامي بلا افتراضي**: تُضبط بعد مطابقة حمولة سلة على
 * staging، وحتى تُضبط **لا تقلع الطرفية أصلًا**. صفرُ منحٍ خير من منحة مبنيّة
 * على تخمين.
 */
export const DEFAULT_PAID_SLUGS = []

export const DEFAULT_CURRENCY = 'SAR'

/** تصنيفات سطر التدقيق — نفس قيم قيد الجدول حرفيًا. */
export const CLASSIFICATIONS = [
  'received', 'verified', 'ignored', 'processed', 'duplicate', 'rejected', 'failed',
]

// ── التحقّق من التوقيع ───────────────────────────────────────────────────────

/** مقارنة ثابتة الزمن. `!==` على النصوص يتسرّب منه طول البادئة المطابقة. */
export function timingSafeEqual(a, b) {
  const x = String(a ?? '')
  const y = String(b ?? '')
  // الطول نفسه يتسرّب — وهو مقبول: طول التوقيع ثابت ومعلَن (٦٤ خانة).
  if (x.length !== y.length) return false
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i)
  return diff === 0
}

const enc = new TextEncoder()

/** HMAC-SHA256 بالست عشري — Web Crypto، تعمل في Node وDeno بلا تبديل. */
export async function hmacSha256Hex(secret, rawBody) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** بصمة الجسم الخام — مفتاح منع التكرار. */
export async function bodyFingerprint(rawBody) {
  const d = await crypto.subtle.digest('SHA-256', enc.encode(rawBody))
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * يتحقّق من أصالة الطلب وفق الاستراتيجية المعلَنة في الترويسة.
 *
 * **يفشل مغلقًا في كل حالة غامضة**: سرّ غير مهيّأ · ترويسة غائبة ·
 * استراتيجية غير معروفة. لا يوجد مسار «تخطَّ التحقّق» — لا بعلم بيئة ولا
 * بوضع تطوير. غيابه هو ما يجعل الطرفية غير قابلة للتزوير أصلًا.
 *
 * @returns {{ok: true, strategy: string} | {ok: false, reason: string}}
 */
export async function verifyAuthenticity({ headers, rawBody, secret, token }) {
  const h = (n) => headers.get(n) ?? headers.get(n.toLowerCase()) ?? ''
  const strategy = (h('X-Salla-Security-Strategy') || 'signature').toLowerCase().trim()

  if (strategy === 'signature') {
    if (!secret) return { ok: false, reason: 'secret_not_configured' }
    const provided = h('X-Salla-Signature').trim()
    if (!provided) return { ok: false, reason: 'missing_signature' }
    const expected = await hmacSha256Hex(secret, rawBody)
    if (!timingSafeEqual(provided, expected)) return { ok: false, reason: 'bad_signature' }
    return { ok: true, strategy }
  }

  if (strategy === 'token') {
    if (!token) return { ok: false, reason: 'token_not_configured' }
    const provided = h('Authorization').trim()
    if (!provided) return { ok: false, reason: 'missing_token' }
    if (!timingSafeEqual(provided, token)) return { ok: false, reason: 'bad_token' }
    return { ok: true, strategy }
  }

  return { ok: false, reason: 'unknown_strategy' }
}

// ── تحليل الحمولة ───────────────────────────────────────────────────────────

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * يستخرج الحقول المتعاقَد عليها. **لا يثق بشيء**: كل حقل يُفحص نوعه، وأي
 * انحراف يردّ سببًا مسمّى بدل قيمة افتراضية صامتة.
 *
 * @returns {{ok: true, event: object} | {ok: false, reason: string}}
 */
export function parseSallaEvent(rawBody) {
  let body
  try { body = JSON.parse(rawBody) } catch { return { ok: false, reason: 'malformed_json' } }
  if (!isObj(body)) return { ok: false, reason: 'malformed_payload' }

  const eventName = typeof body.event === 'string' ? body.event.trim() : ''
  if (!eventName) return { ok: false, reason: 'missing_event' }
  if (!isObj(body.data)) return { ok: false, reason: 'missing_data' }

  const d = body.data

  // **كائن الطلب لا مظروف الحدث.** في `order.status.updated` يكون الطلب
  // متداخلًا تحت `data.order`، و`data.id` معرّف تغيُّر الحالة لا الطلب.
  // استخراج الطلب أولًا ثم القراءة منه وحده هو ما يمنع ربط المفتاح بالمعرّف
  // الخطأ — انظر التصحيح ② في ترويسة الملف.
  const order = isObj(d.order) ? d.order : d
  const nested = isObj(d.order)

  // معرّف الطلب: `order.id` المستقرّ. `reference_id` رقم عرض للتاجر ولا يصلح
  // مفتاحًا — قد يتكرّر عبر المتاجر.
  const orderId = order.id === undefined || order.id === null ? '' : String(order.id).trim()
  if (!orderId) return { ok: false, reason: 'missing_order_id' }

  // الشريحة تُقرأ من **كائن الطلب** حصرًا. `data.status` في حدث تغيّر الحالة
  // نصٌّ معروض بالعربية («تم التنفيذ») لا معرّفًا آليًا — قراءته خلط بين
  // نصّ للعرض ومفتاح للقرار.
  const statusSlug = isObj(order.status) && typeof order.status.slug === 'string'
    ? order.status.slug.trim().toLowerCase() : ''

  // إشارة دفع موثَّقة على كائن الطلب. تُقرأ **حين توجد** فقط: غيابها لا يعني
  // شيئًا، ووجودها `true` يعني الدفع معلّق ⇒ لا منحة مهما قالت الشريحة.
  const pendingPayment = typeof order.is_pending_payment === 'boolean'
    ? order.is_pending_payment : null

  const customer = isObj(order.customer) ? order.customer : {}
  const email = typeof customer.email === 'string' ? customer.email.trim().toLowerCase() : ''

  const total = isObj(order.amounts) && isObj(order.amounts.total) ? order.amounts.total : null
  // المبلغ يصل عشريًا (19.99) فيُحوَّل إلى أصغر وحدة (1999) — والتقريب
  // `Math.round` لا `Math.trunc`: 19.99 قد تصل 19.989999 بحساب عائم.
  const amountMinor = total && total.amount !== undefined && total.amount !== null
    && Number.isFinite(Number(total.amount))
    ? Math.round(Number(total.amount) * 100) : null
  const currency = total && typeof total.currency === 'string'
    ? total.currency.trim().toUpperCase()
    : (typeof order.currency === 'string' ? order.currency.trim().toUpperCase() : '')

  // ربط المنتج: `items[].product.id` هو المعرّف المستقرّ، و`items[].sku` بديل
  // يعتمده التاجر. يُجمع الاثنان ويُطابَق أيّهما — والاسم المعروض **لا يدخل**:
  // قابل للتغيير من لوحة التاجر فلا يصلح سند صلاحية.
  const items = Array.isArray(order.items) ? order.items : []
  const productIds = items.flatMap((it) => {
    if (!isObj(it)) return []
    const out = []
    if (isObj(it.product) && it.product.id !== undefined && it.product.id !== null) {
      out.push(String(it.product.id).trim())
    }
    if (it.product_id !== undefined && it.product_id !== null) out.push(String(it.product_id).trim())
    if (typeof it.sku === 'string' && it.sku.trim()) out.push(it.sku.trim())
    return out
  }).filter(Boolean)

  return {
    ok: true,
    event: {
      eventName, orderId, statusSlug, email, amountMinor, currency, productIds,
      pendingPayment, nestedShape: nested,
    },
  }
}

// ── القرار ──────────────────────────────────────────────────────────────────

/**
 * يقرّر ما إذا كان الحدث يستحقّ منحة، وفق السياسة المُهيّأة.
 *
 * **كل مسار غامض ⇒ لا منحة.** ترتيب الفحوص مقصود: الأرخص والأكثر شيوعًا
 * أولًا (حدث غير مدعوم)، ثم ما يحتاج سياسة.
 *
 * @returns {{grant: boolean, reason: string}}
 */
export function decideGrant(event, policy) {
  if (!SUPPORTED_EVENTS.includes(event.eventName)) {
    return { grant: false, reason: 'unsupported_event' }
  }
  // إشارة موثَّقة تسبق الشريحة: طلب معلَّق الدفع لا يُمنح ولو حملت شريحته
  // اسمًا مطمئنًا. الغياب لا يُفسَّر — الفحص يعمل حين توجد الإشارة فقط.
  if (event.pendingPayment === true) return { grant: false, reason: 'payment_pending' }

  const paid = policy.paidSlugs.includes(event.statusSlug)
  if (!paid) return { grant: false, reason: 'unpaid_or_incomplete' }

  if (!event.email) return { grant: false, reason: 'missing_customer_email' }

  if (policy.expectedCurrency && event.currency !== policy.expectedCurrency) {
    return { grant: false, reason: 'currency_mismatch' }
  }

  // سياسة المبلغ. `off` قرار معلَن لا سهو — و«غير مهيّأة» ليست خيارًا ثالثًا:
  // `readPolicy` ترفض الإقلاع بدونها.
  if (policy.amountPolicy === 'exact') {
    if (event.amountMinor === null) return { grant: false, reason: 'amount_missing' }
    if (event.amountMinor !== policy.expectedAmountMinor) {
      return { grant: false, reason: 'amount_mismatch' }
    }
  }

  if (policy.expectedProductIds.length > 0) {
    const hit = event.productIds.some((id) => policy.expectedProductIds.includes(id))
    if (!hit) return { grant: false, reason: 'product_mismatch' }
  }

  return { grant: true, reason: 'paid_order' }
}

/**
 * يقرأ السياسة من البيئة ويرفض الإقلاع على تهيئة ناقصة.
 *
 * **لا افتراض متساهل هنا.** أخطر ما يمكن أن تفعله بوابة دفع هو أن تمنح لأن
 * متغيّرًا لم يُضبط. `SALLA_AMOUNT_POLICY` إمّا `exact` بمبلغ، أو `off`
 * صراحةً — والغياب خطأ تهيئة يُوقف الطرفية، لا صمتٌ يمنح.
 *
 * @returns {{ok: true, policy: object} | {ok: false, reason: string}}
 */
export function readPolicy(env) {
  const g = (k) => (env[k] ?? '').toString().trim()

  const amountPolicy = g('SALLA_AMOUNT_POLICY').toLowerCase()
  if (amountPolicy !== 'exact' && amountPolicy !== 'off') {
    return { ok: false, reason: 'SALLA_AMOUNT_POLICY must be "exact" or "off"' }
  }
  let expectedAmountMinor = null
  if (amountPolicy === 'exact') {
    const raw = g('SALLA_EXPECTED_AMOUNT_MINOR')
    if (!/^\d+$/.test(raw)) {
      return { ok: false, reason: 'SALLA_EXPECTED_AMOUNT_MINOR required (integer minor units) when policy is "exact"' }
    }
    expectedAmountMinor = Number(raw)
  }

  // [CTO-86]: إلزامي بلا افتراضي. سلة لا توثّق أي شريحة تعني «وصل المال»،
  // فالقيمة تُقرَّر بمطابقة حمولة حقيقية وتُعلَن هنا — لا تُورَّث بالسكوت.
  const slugsRaw = g('SALLA_PAID_STATUS_SLUGS')
  const paidSlugs = slugsRaw
    ? slugsRaw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : [...DEFAULT_PAID_SLUGS]
  if (paidSlugs.length === 0) {
    return { ok: false, reason: 'SALLA_PAID_STATUS_SLUGS required — no default; confirm against a real Salla payload first' }
  }

  // [CTO-86] §9: ربط المنتج **إلزامي**. «أي طلب ناجح في سلة» ليس سند صلاحية
  // لـPremium — المتجر يبيع غيرها. الغياب خطأ تهيئة لا تساهل.
  const productsRaw = g('SALLA_EXPECTED_PRODUCT_IDS')
  const expectedProductIds = productsRaw
    ? productsRaw.split(',').map((s) => s.trim()).filter(Boolean) : []
  if (expectedProductIds.length === 0) {
    return { ok: false, reason: 'SALLA_EXPECTED_PRODUCT_IDS required — Premium must bind to an approved product identifier' }
  }

  const expectedCurrency = (g('SALLA_EXPECTED_CURRENCY') || DEFAULT_CURRENCY).toUpperCase()

  return {
    ok: true,
    policy: { amountPolicy, expectedAmountMinor, paidSlugs, expectedProductIds, expectedCurrency },
  }
}

/**
 * ربط النتيجة بحالة HTTP.
 *
 * القاعدة الحاكمة: **سلة تعيد ثلاثًا على أي ردّ غير ناجح.** فالرفض الدائم
 * (منتج مخالف · تعارض هوية · غير مدفوع) يُردّ `200` — إعادته ثلاثًا لا تغيّر
 * شيئًا وتلوّث التدقيق. و`5xx` محجوزة للعطل العابر الذي **قد تنجح** إعادته.
 * والتوقيع الفاسد `401`: ليس عطلًا ولا قرار عمل، بل طلب لا نعترف به أصلًا.
 */
export function httpStatusFor(outcome) {
  switch (outcome) {
    case 'processed':
    case 'duplicate':
    case 'ignored':
    case 'rejected':          return 200
    case 'unauthorized':      return 401
    case 'malformed':         return 400
    case 'method_not_allowed':return 405
    case 'misconfigured':
    case 'failed':            return 500
    default:                  return 500
  }
}
