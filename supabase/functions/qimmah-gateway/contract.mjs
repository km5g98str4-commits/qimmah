// ============================================================================
// عقد البوّابة التجارية — منطق خالص، بلا شبكة وبلا قاعدة وبلا Deno.
// ============================================================================
// نفس انفصال `salla-webhook`: كل قرار هنا **قابل للاختبار من Node**، والطرفية
// تتولّى النقل وحده. ويحرسه `test:gateway-contract`.
//
// ═══ لماذا وُجدت هذه البوّابة أصلًا ═══
//
// التوصية السابقة كانت: «قاعدة Cloudflare أمام Supabase REST». **وهي مستحيلة
// التنفيذ**، ومقيسة الاستحالة لا مُدّعاة:
//
//   المتصفّح يطلب `https://<ref>.supabase.co/rest/v1/rpc/<fn>` مباشرةً —
//   ونطاق `supabase.co` **ليس نطاق قِمّة**. وحساب Cloudflare عندنا يملك مشروع
//   Pages الذي يخدم `dist/` الساكن وحده، ولا يمرّ به أي طلب قاعدة:
//   `public/_redirects` لا يوكّل شيئًا، و`public/_headers` يأذن صراحةً
//   بـ`connect-src https://*.supabase.co` — أي أن الاتصال **مباشر بالتصميم**.
//   فقاعدةٌ على نطاقنا لن ترى تلك الطلبات أبدًا.
//
// فالموضع الوحيد الذي تملكه قِمّة على مسار الطلب هو **كود تكتبه هي**: طرفية
// Supabase. وهذه هي.
//
// ═══ ما تضيفه البوّابة وما لا تضيفه ═══
//
// القاعدة **لا تملك عنوان الشبكة إطلاقًا** — مسحٌ لكل الهجرات الإحدى والثلاثين
// لا يجد `inet_client_addr` ولا `x-forwarded-for`. ولذلك حدّ الاسترداد القائم
// مربوط ببصمة **البريد** لا بالعنوان، وأثره مقيس:
//
//   ثلاثة حسابات جديدة × اثنتا عشرة محاولة ⇒ ٣٠ محاولة بلغت فحص الكود و٦
//   مخنوقة. أي أن الحدّ **يصمد داخل الحساب**، وثمن تصفيره حسابٌ ببريد مؤكَّد.
//
// فالبوّابة تضيف الطبقة التي تعجز عنها القاعدة بنيويًا: **إشارة الشبكة قبل
// المصادقة**. ولا تضيف سلطةً ثانية — انظر أدناه.
//
// ═══ الحدّ المعلَن: هذه ليست الحصن، بل الطبقة الثانية ═══
//
// العلاج الحقيقي لتخمين الأكواد هو **إنتروبيا الكود** لا خنق الطلبات: كودٌ
// بثمانين بتًا لا يُخمَّن بأي معدّل، وكودٌ معجميّ يُخمَّن مهما خنقنا. ولذلك
// أرضية الإنتروبيا (§8) هي الإصلاح الأوّل، وهذه البوّابة **دفاعٌ في العمق**
// لا بديلٌ عنها. من يقرأ هذا الملف ويظنّه الحصن يكون قد قرأه خطأ.
// ============================================================================

/**
 * ═══ لماذا قائمة بيضاء لا وكيل عامّ ═══
 *
 * بوّابةٌ تمرّر أي `rpc/*` تصير **سطح هجوم جديدًا**: تكسب المهاجم مدخلًا
 * موحّدًا لكل دالّة في المخطّط، بما فيها ما لم يُقصد كشفه يومًا. فالقائمة
 * صريحة، وكل إضافة إليها قرارٌ يُكتب.
 *
 * و`my_entitlement` **ليست هنا عمدًا**: قراءةٌ لا تُغيّر شيئًا، وخنقها يعاقب
 * الاستعمال العادي (كل تحميل صفحة) بلا مكسب أمني.
 */
export const GATED_ACTIONS = Object.freeze({
  start_trial: {
    rpc: 'start_trial',
    /** منحة مرّة واحدة لكل هوية قانونية — الخنق هنا ضدّ الفيضان لا ضدّ الربح. */
    perIpPerHour: 12,
    params: [],
  },
  redeem_access_code: {
    /** المدخل المعتمد هو `_v2` — القديم منزوع من العميل منذ 20260824120004. */
    rpc: 'redeem_access_code_v2',
    /** أضيق حدّ: هذا هو المسار الوحيد القابل للتخمين أصلًا. */
    perIpPerHour: 20,
    params: ['p_code'],
  },
  claim_pending_grants: {
    rpc: 'claim_pending_grants',
    /** كتابةٌ في كل نداء (upsert)، فالخنق ضدّ الإجهاد لا ضدّ منحة مكرّرة. */
    perIpPerHour: 20,
    params: [],
  },
  submit_missing_food: {
    rpc: 'submit_missing_food',
    /** للقاعدة حدّ يوميّ لكل مستخدم (٢٠)؛ هذا يحدّ **العنوان** لا الحساب. */
    perIpPerHour: 40,
    params: ['p_product_name', 'p_barcode', 'p_lang'],
  },
})

/**
 * ═══ استخراج عنوان العميل — والصدق فيما لا نعرفه ═══
 *
 * ⚠️ **أيّ ترويسة تحمل العنوان الحقيقي على Supabase Edge Functions لم يُثبَت
 * في بيئتنا**، لأن التحقّق يحتاج نشرًا فعليًّا ونداءً من شبكتين. فالعقد هنا
 * يفعل الشيء الوحيد الصادق: يقرأ الترتيب المعروف، **ويفشل مغلقًا** حين لا
 * يجد شيئًا — ولا يخترع عنوانًا ولا يمرّر بلا حدّ.
 *
 * ولماذا **أوّل** قيمة في `x-forwarded-for` لا آخرها: السلسلة تُكتب
 * `client, proxy1, proxy2`، فالأول هو العميل. وهو أيضًا الجزء الذي **يستطيع
 * العميل حشوه** — ولذلك يُقدَّم `cf-connecting-ip` عليه حين يوجد: تكتبه
 * الحافّة ولا يملك العميل تزويرها.
 */
export const IP_HEADER_ORDER = Object.freeze([
  'cf-connecting-ip',
  'x-real-ip',
  'x-forwarded-for',
])

export function clientIp(headers) {
  const get = (k) => {
    const v = typeof headers?.get === 'function' ? headers.get(k) : headers?.[k]
    return typeof v === 'string' ? v.trim() : ''
  }
  for (const h of IP_HEADER_ORDER) {
    const raw = get(h)
    if (raw === '') continue
    // `x-forwarded-for` سلسلة؛ والباقي قيمة واحدة. والأخذ الأول في الحالتين.
    const first = raw.split(',')[0].trim()
    if (first !== '') return { ok: true, ip: first, header: h }
  }
  // بلا عنوان لا حدّ ممكن. والفشل **مغلق**: نردّ ولا نمرّر بلا قياس.
  return { ok: false, ip: null, header: null }
}

/**
 * ═══ ختم البوّابة — ما يجعل الحدّ **غير قابل للالتفاف** ═══
 *
 * بوّابةٌ تُترك دوالُّها ممنوحةً لـ`authenticated` **لا تحدّ شيئًا**: المتصفّح
 * ينادي PostgREST مباشرةً ويتخطّاها. وهذا بالضبط ما يسمّيه التكليف «مسرح
 * أمان».
 *
 * والحلّ الذي **يحفظ السلطة الواحدة**: تبقى الدوالّ تشتقّ الهوية من
 * `auth.uid()` كما هي — ويُضاف شرطٌ واحد: أن يحمل الطلب ختمًا لا يملكه إلا
 * من يعرف سرّ البوّابة. PostgREST يضع الترويسات في `request.headers`،
 * فتقرؤه القاعدة وتتحقّق.
 *
 * ولماذا الختم **مؤقّت**: ختمٌ ثابت يُلتقط من سجلّ وسيط ويُعاد استعماله للأبد.
 * فالمُوقَّع عليه هو `action|uid|window` حيث `window` رقم نافذة زمنية، ويُقبل
 * أيضًا ختمُ النافذة السابقة كي لا يسقط طلبٌ عبر حدّ النافذة.
 *
 * ⚠️ **وما لا يفعله الختم:** لا يصادق على المستخدم — تلك وظيفة JWT ولم تتغيّر.
 * الختم يقول «مررتُ بالبوّابة» لا «أنا فلان».
 */
export const STAMP_WINDOW_SECONDS = 120
export const STAMP_HEADER = 'x-qimmah-gate'

export function stampWindow(nowMs, windowSeconds = STAMP_WINDOW_SECONDS) {
  return Math.floor(nowMs / 1000 / windowSeconds)
}

/** الرسالة المُوقَّعة — شكلٌ واحد يستعمله الطرفان، فلا يتباعدان بتحرير. */
export function stampMessage(action, uid, window) {
  return `${action}|${uid}|${window}`
}

const enc = new TextEncoder()

/** HMAC-SHA256 بالست عشري عبر Web Crypto — تعمل في Node وDeno بلا تبديل. */
export async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function mintStamp(secret, action, uid, nowMs) {
  const w = stampWindow(nowMs)
  return `${w}.${await hmacHex(secret, stampMessage(action, uid, w))}`
}

/**
 * تحقّق الختم — **نسخة العقد**، للاختبار من Node ولمحاكاة ما تفعله القاعدة.
 * السلطة الفعلية وقت التشغيل هي دالّة القاعدة (`private.gate_stamp_valid`)،
 * وهذه تطابقها شكلًا كي يُثبَت التطابق بدل أن يُفترَض.
 */
export async function verifyStamp(secret, action, uid, stamp, nowMs) {
  if (typeof stamp !== 'string' || stamp === '') return { ok: false, reason: 'stamp_missing' }
  const dot = stamp.indexOf('.')
  if (dot <= 0) return { ok: false, reason: 'stamp_malformed' }
  const w = Number(stamp.slice(0, dot))
  const sig = stamp.slice(dot + 1)
  if (!Number.isInteger(w)) return { ok: false, reason: 'stamp_malformed' }
  const now = stampWindow(nowMs)
  // النافذة الحالية أو التي قبلها. وما قبلهما **منتهٍ** لا «قريب».
  if (w !== now && w !== now - 1) return { ok: false, reason: 'stamp_expired' }
  const expected = await hmacHex(secret, stampMessage(action, uid, w))
  if (!timingSafeEqualHex(sig, expected)) return { ok: false, reason: 'stamp_bad' }
  return { ok: true, reason: null }
}

/** مقارنة ثابتة الزمن — نفس ما تفعله طرفية سلة، ولنفس السبب. */
export function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * ═══ قراءة الطلب — رفضٌ مبكر ومسمّى ═══
 * كل رفض هنا يحمل سببًا يصلح للعرض، فلا تُبتلع الأخطاء في «حدث خطأ ما».
 */
export function parseGatewayRequest(body) {
  if (body === null || typeof body !== 'object') return { ok: false, reason: 'malformed_body' }
  const action = typeof body.action === 'string' ? body.action : ''
  if (action === '') return { ok: false, reason: 'action_missing' }
  const spec = Object.prototype.hasOwnProperty.call(GATED_ACTIONS, action)
    ? GATED_ACTIONS[action] : null
  // ⚠️ فعلٌ مجهول يُردّ **بردٍّ واحد عامّ** ولا يُميَّز عن فعلٍ ممنوع: وإلا صار
  // الردّ عرّافًا يعدّد ما في المخطّط — نفس مبدأ دمج أسباب رفض الكود.
  if (spec === null) return { ok: false, reason: 'action_not_allowed' }

  const args = body.args && typeof body.args === 'object' ? body.args : {}
  const extra = Object.keys(args).filter((k) => !spec.params.includes(k))
  // وسيطٌ زائد يُرفض ولا يُحذف بصمت: التمرير الصامت لما لا نعرفه هو كيف تتسرّب
  // البارامترات التي لم يقصد أحد كشفها.
  if (extra.length > 0) return { ok: false, reason: 'unexpected_argument' }

  const forwarded = {}
  for (const p of spec.params) if (p in args) forwarded[p] = args[p]
  return { ok: true, action, rpc: spec.rpc, perIpPerHour: spec.perIpPerHour, args: forwarded }
}

/** رمز HTTP لكل نتيجة — مصدرٌ واحد يقرؤه الطرفية والاختبار معًا. */
export function httpStatusFor(outcome) {
  switch (outcome) {
    case 'ok': return 200
    case 'rate_limited': return 429
    case 'unauthenticated': return 401
    case 'action_not_allowed':
    case 'action_missing':
    case 'unexpected_argument':
    case 'malformed_body': return 400
    case 'no_client_ip': return 400
    case 'misconfigured': return 503
    case 'method_not_allowed': return 405
    default: return 502
  }
}

/**
 * تهيئة الطرفية — **إلزامية بلا افتراضات**، نفس مبدأ `readPolicy` في سلة.
 * طرفيةٌ تجارية تعمل بإعدادٍ افتراضي هي طرفيةٌ تمنح لأن أحدًا نسي متغيّرًا.
 */
export function readGatewayConfig(env) {
  const need = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'QIMMAH_GATE_SECRET']
  const missing = need.filter((k) => !env?.[k] || String(env[k]).trim() === '')
  if (missing.length > 0) return { ok: false, reason: `missing:${missing.join(',')}` }
  if (String(env.QIMMAH_GATE_SECRET).length < 32) {
    return { ok: false, reason: 'gate_secret_too_short' }
  }
  return {
    ok: true,
    config: {
      url: String(env.SUPABASE_URL).trim(),
      anonKey: String(env.SUPABASE_ANON_KEY).trim(),
      serviceKey: String(env.SUPABASE_SERVICE_ROLE_KEY).trim(),
      gateSecret: String(env.QIMMAH_GATE_SECRET),
    },
  }
}
