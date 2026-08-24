// ============================================================================
// qimmah-gateway — الحدّ الوحيد الذي تملكه قِمّة على مسار الطفرات التجارية.
// ============================================================================
// النقل وحده. كل قرار في `contract.mjs` (منطق خالص قابل للاختبار من Node)،
// وكل سلطة في دوالّ القاعدة كما هي. هذا الملف يصل الاثنين ولا يقرّر شيئًا.
//
// ═══ قرار معماري يستحقّ التسمية: **تمرير رمز المتصل، لا مفتاح الخدمة** ═══
//
// الطريق البديهي — أن تنادي البوّابة القاعدةَ بمفتاح الخدمة — **مستحيل هنا،
// ومقيسٌ لا مُستنتَج**: الدوالّ الخمس كلّها تشتقّ هويّتها من `auth.uid()`،
// ونداؤها بمفتاح الخدمة بلا `sub` يرفع `not authenticated` في خمسٍ من خمس.
//
// ولو «أُصلح» ذلك بتمرير معرّف المستخدم وسيطًا لصارت الدالّة تقبل هويّةً
// **يقولها المستدعي** بدل أن تشتقّها من رمزٍ وقّعه Supabase — أي **سلطة هوية
// ثانية**، وهو بالضبط ما يمنعه التكليف (§17). فالبوّابة تمرّر ترويسة
// `Authorization` كما هي ومعها مفتاح `anon`، فيبقى `auth.uid()` هو المصدر
// الوحيد للهوية ولا يتغيّر حرف في عقد القاعدة.
//
// ═══ وحدُّها المُعلَن — كي لا تُقرأ حصنًا ═══
//
// الدوالّ تبقى ممنوحة لـ`authenticated`، فالمتصفّح **يستطيع** تخطّي هذه
// البوّابة ومناداة PostgREST مباشرةً. ونزعُ تلك المنحة كان سيوجب تمرير معرّف
// المستخدم — أي السلطة الثانية أعلاه. فاختيارٌ بين الاثنين، وهذا هو المختار:
//
//   • **الضمان الحقيقي** يبقى في القاعدة: أرضية إنتروبيا ٨٠ بتًا لكل كود ·
//     تجربة واحدة لكل هوية قانونية · حدّ استرداد لكل هوية · تأكيد بريد.
//   • **وهذه الطبقة** تضيف ما تعجز عنه القاعدة بنيويًا: حدٌّ على **عنوان
//     الشبكة** قبل المصادقة. وهي طبقةٌ في العمق، لا سورٌ حول القلعة.
//
// من يقرأ هذا الملف حصنًا يكون قد قرأه خطأ — والسطر مكتوب كي لا يُقرأ كذلك.
//
// المتغيّرات (تُضبط بلوحة Supabase — لا في المستودع):
//   SUPABASE_URL · SUPABASE_ANON_KEY · SUPABASE_SERVICE_ROLE_KEY
//   QIMMAH_GATE_SECRET   (٣٢ محرفًا فأكثر — إلزامي)
// ============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  readGatewayConfig, parseGatewayRequest, clientIp, httpStatusFor, mintStamp, STAMP_HEADER,
} from './contract.mjs'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any

const json = (outcome: string, extra: Record<string, unknown> = {}) =>
  new Response(JSON.stringify({ outcome, ...extra }), {
    status: httpStatusFor(outcome),
    headers: { 'content-type': 'application/json' },
  })

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json('method_not_allowed')

  const env = Deno.env.toObject()
  const cfg = readGatewayConfig(env)
  if (!cfg.ok) {
    // تهيئة ناقصة ⇒ توقّف. بوّابةٌ تجارية تعمل بإعدادٍ افتراضي تمنح لأن أحدًا
    // نسي متغيّرًا — نفس مبدأ `readPolicy` في طرفية سلة.
    console.error('[qimmah-gateway] misconfigured:', cfg.reason)
    return json('misconfigured')
  }

  // ① الهويّة **قبل** أي شيء: بوّابة المنصّة تحقّقت من الرمز (`verify_jwt = true`)،
  //    ونحن نستخرج المستخدم منه كي نعرف من نحدّ — لا كي نصدّقه.
  const authHeader = req.headers.get('Authorization') || ''
  if (authHeader === '') return json('unauthenticated', { reason: 'missing_authorization' })

  const asCaller = createClient(cfg.config.url, cfg.config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await asCaller.auth.getUser()
  const uid = userData?.user?.id ?? ''
  if (userErr || uid === '') return json('unauthenticated', { reason: 'session_rejected' })

  // ② الطلب. فعلٌ خارج القائمة البيضاء يُردّ بردٍّ **واحد عامّ** فلا يصير
  //    عرّافًا يعدّد ما في المخطّط.
  let body: unknown = null
  try { body = await req.json() } catch { return json('malformed_body') }
  const parsed = parseGatewayRequest(body)
  if (!parsed.ok) return json(parsed.reason)

  // ③ إشارة الشبكة — الشيء الوحيد الذي تملكه هذه الطبقة ولا تملكه القاعدة.
  const ip = clientIp(req.headers)
  if (!ip.ok) {
    // **فشلٌ مغلق**: بلا عنوان لا حدّ ممكن، ولا نخترع عنوانًا ولا نمرّر بلا قياس.
    console.warn('[qimmah-gateway] no client ip header')
    return json('no_client_ip')
  }

  // ④ الحدّ يُحسم في القاعدة لا في الذاكرة: الطرفيات عابرة ومتعدّدة النسخ،
  //    فعدّادٌ في الذاكرة يُصفَّر بنسخة جديدة ولا يُشارَك بين النسخ — أي حارس
  //    لا يُطلق. الجدول يراه الجميع.
  const asService = createClient(cfg.config.url, cfg.config.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: admit, error: admitErr } = await asService.rpc('gate_admit', {
    p_ip: ip.ip, p_action: parsed.action, p_max: parsed.perIpPerHour,
  })
  if (admitErr) {
    // عطلُ الحارس **لا يفتح الباب**: نردّ ٥٠٢ ولا نمرّر بلا قياس.
    console.error('[qimmah-gateway] admit failed:', admitErr.message)
    return json('failed', { reason: 'admit_error' })
  }
  if (String(admit) !== 'allow') return json('rate_limited', { reason: 'too_many_requests' })

  // ⑤ التمرير — بهويّة المتصل، وبختمٍ يقول «مررتُ بالبوّابة» لا «أنا فلان».
  const stamp = await mintStamp(cfg.config.gateSecret, parsed.action, uid, Date.now())
  const stamped = createClient(cfg.config.url, cfg.config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader, [STAMP_HEADER]: stamp } },
  })
  const { data, error } = await stamped.rpc(parsed.rpc, parsed.args)
  if (error) {
    // خطأُ عملٍ يعبر كما هو: المصنِّف في العميل يعرف أسماءه، وإخفاؤها هنا
    // يحوّل «كودك مستعمَل» إلى «حدث خطأ ما».
    return json('rpc_error', { reason: error.message ?? '', code: (error as { code?: string }).code ?? '' })
  }
  return json('ok', { result: data })
})
