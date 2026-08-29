/**
 * بلاغ «ما لقيت اللي أكلته» — [COMMISSIONING §7]
 *
 * ═══ الحلقة التي يغلقها ═══
 * كان البحث الفاشل يُسجَّل **محلّيًا** فقط: حدثٌ يعرف الجهازُ به ولا يعرفه أحد.
 * فالمستخدم يفقد وجبته، والمؤسس لا يعرف أن أحدًا بحث عنها أصلًا، وقاعدة الطعام
 * لا تتحسّن إلا بتخمين. الآن يصل البلاغ إلى طابور مراجعة على الخادم.
 *
 * ═══ وما لا يفعله هذا الملف بقصد ═══
 * **لا يرسل قيمًا غذائية.** ما يُرسَل هو ما كتبه المستخدم في حقل البحث لا
 * غير — نصٌّ يقول «هذا ما بحثتُ عنه ولم أجده». وأي سعرات تأتي من مراجعة بشرية
 * لمصدر حقيقي، لا من المستخدم ولا منّا (التكليف: «لا تختلق قيمًا غذائية»).
 *
 * **ولا يَعِد بالنشر.** البلاغ يدخل طابورًا، والاعتماد قرار مؤسس. فنصّ الشكر
 * يقول «وصلنا» لا «بنضيفه» — وعدٌ لا نملك زمنه (§ الصدق قبل الطمأنينة).
 */
import { getSupabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { callGateway } from '@/lib/access/gatewayClient'

export type MissingFoodOutcome =
  /** وصل الطابور. */
  | 'queued'
  /** بلاغٌ مفتوح بنفس الباركود موجود — ليس خطأ المستخدم ولا يستحقّ صفًّا ثانيًا. */
  | 'already_queued'
  /** تجاوز الحدّ اليومي. وتيرةٌ لا خطأ. */
  | 'rate_limited'
  /** مدخلٌ لا يصلح (اسم فارغ · خانة باركود خاطئة). */
  | 'invalid'
  /** لا حساب — والبلاغ يحتاج صاحبًا كي يُسأل عنه لو لزم. */
  | 'not_authenticated'
  /** لا خادم في هذا البناء (نسخة المراجعة) — **ليست انقطاع نت**. */
  | 'backend_unconfigured'
  /** عطلٌ عندنا. الافتراض عندنا لا عند شبكة المستخدم. */
  | 'service_error'

export interface MissingFoodReport {
  /** ما كتبه المستخدم في البحث. هو **كل** ما يُرسَل عن الصنف. */
  query: string
  /** باركود حقيقي إن مسحه المستخدم — أو لا شيء. لا معرّف داخلي هنا. */
  barcode?: string | null
  lang: 'ar' | 'en'
}

/**
 * يرسل البلاغ. **يعيد نتيجة مسمّاة دائمًا ولا يرمي** — الشاشة تحتاج سببًا
 * تعرضه لا استثناءً تبتلعه.
 */
export async function reportMissingFood(report: MissingFoodReport): Promise<MissingFoodOutcome> {
  const name = report.query.trim()
  if (name === '') return 'invalid'
  if (!isSupabaseConfigured()) return 'backend_unconfigured'
  const client = await getSupabase()
  if (!client) return 'service_error'

  try {
    const session = await client.auth.getSession()
    if (!session?.data?.session) return 'not_authenticated'

    /**
     * [RED-TEAM-FINAL] **عبر البوّابة، لا إلى PostgREST مباشرةً.**
     * `submit_missing_food` مبوَّبة في القاعدة منذ `20260827120004`، فالنداء
     * المباشر يُرفض بـ`gate_stamp_invalid`. يحرس الوصلةَ
     * `test:attack-gateway-coupling`.
     */
    const gw = await callGateway('submit_missing_food', {
      p_product_name: name,
      p_barcode: report.barcode ?? null,
      p_lang: report.lang,
    }, session.data.session.access_token)
    if (gw.outcome === 'rate_limited') return 'rate_limited'
    if (gw.outcome === 'unauthenticated') return 'not_authenticated'
    if (gw.outcome === 'misconfigured') return 'backend_unconfigured'
    if (gw.outcome === 'rpc_error') {
      // دالّة غير منشورة بعد ⇒ عطلٌ في النشر لا في المستخدم، ويُقال كما هو.
      if (gw.code === 'PGRST202' || gw.code === '42883') return 'backend_unconfigured'
      if (gw.reason.includes('not authenticated')) return 'not_authenticated'
      return 'service_error'
    }
    if (gw.outcome !== 'ok') return 'service_error'
    const outcome = (gw.result as { outcome?: unknown } | null)?.outcome
    if (outcome === 'queued') return 'queued'
    if (outcome === 'already_queued') return 'already_queued'
    if (outcome === 'rate_limited') return 'rate_limited'
    if (outcome === 'invalid') return 'invalid'
    return 'service_error'
  } catch {
    return 'service_error'
  }
}
