// ============================================================================
// عميل البوّابة التجارية — القفزة التي كان المعمار يعلنها ولا يملكها.
// ============================================================================
// [RED-TEAM-FINAL] **الثغرة التي أغلقها هذا الملف.**
//
// هجرة `20260827120004` جعلت ختم `x-qimmah-gate` **سلطةً في القاعدة**: الطفرات
// الأربع لا تُنفَّذ بلا ختم صالح، ولا يسكّ الختم إلا `qimmah-gateway`. لكنّ
// العميل كان ينادي PostgREST مباشرةً (`supabase.rpc(...)`) ولا يمرّ بالبوّابة
// إطلاقًا — فصار **كل** بدء تجربة واسترداد كود ومطالبة شراء وبلاغ طعام يُرفض
// بـ`gate_stamp_invalid` (رمز `28000`)، ويُصنَّف عند العميل «سجّل دخولك» لمن هو
// مسجَّلٌ دخوله أصلًا: حلقةٌ لا تُغلق ومشترٍ لا يصل إلى ما دفع مقابله.
//
// ولم تلتقطه بوّابة الـ١٨٣ خطوة لأن **الطرفين كليهما مُحاكى**: الهجرة علّمت
// طقمَي القاعدة أن يسكّا الختم بأنفسهما، وطقوم e2e تعمل بـ
// `VITE_ENTITLEMENT_MODE=mock` فلا تلمس القاعدة. فلا أحد كان يختبر **الوصلة**.
// يحرسها الآن `test:attack-gateway-coupling`.
//
// ═══ ما يفعله هذا الملف وما لا يفعله ═══
//   • يفعل: نقلًا واحدًا موحّدًا إلى الطرفية، وترجمةً أمينة لردّها.
//   • لا يفعل: **لا يقرّر شيئًا**. أخطاء العمل تعبر كما هي (`reason`/`code`)
//     إلى المُصنِّفات القائمة، فلا رسالة مستخدم تغيّرت حرفًا.
//
// ⚠️ **شرط تشغيلي صلب:** الطرفية منشورة، و`QIMMAH_GATE_SECRET` مضبوط عليها،
// وسرّ `qimmah_gate_secret` مزروع في Vault بنفس القيمة. غياب أيٍّ منها ⇒ كل
// طفرة تجارية تُرفض. الرَّنبوك: `docs/security/GATEWAY-STAMP-ENFORCEMENT.md`.
// ============================================================================
import { getSupabase } from '@/lib/supabaseClient'

/** اسم الطرفية — مصدرٌ واحد يقرؤه العميل والحارس معًا. */
export const GATEWAY_FUNCTION = 'qimmah-gateway'

/**
 * نتائج البوّابة كما يصدرها `contract.mjs` (`httpStatusFor`)، وزيادةٌ واحدة
 * من جهة العميل: `unreachable` — **لم نبلغ الطرفية أصلًا**. وهي ليست حكمًا من
 * الخادم، فلا تُخلط بردٍّ منه (نفس تمييز `ClaimOutcome` بين ② و③).
 */
export type GatewayOutcome =
  | 'ok'
  | 'rpc_error'
  | 'rate_limited'
  | 'unauthenticated'
  | 'misconfigured'
  | 'no_client_ip'
  | 'action_not_allowed'
  | 'action_missing'
  | 'unexpected_argument'
  | 'malformed_body'
  | 'method_not_allowed'
  | 'failed'
  | 'unreachable'

export interface GatewayReply {
  outcome: GatewayOutcome
  /** حمولة الـRPC عند النجاح (`{ outcome:'ok', result }`). */
  result: unknown
  /** رسالة خطأ القاعدة كما هي — تغذّي المُصنِّفات القائمة بلا تحوير. */
  reason: string
  /** رمز خطأ القاعدة (`28000`/`23505`/…) — كما كان يصل من `supabase.rpc`. */
  code: string
}

const reply = (
  outcome: GatewayOutcome,
  extra: Partial<Omit<GatewayReply, 'outcome'>> = {},
): GatewayReply => ({ outcome, result: null, reason: '', code: '', ...extra })

/** يقرأ جسم الردّ مهما كانت حالته — الفشل التجاري يعيش في أجسام غير-2xx. */
async function readBody(res: unknown): Promise<Record<string, unknown> | null> {
  if (!res || typeof (res as Response).json !== 'function') return null
  try { return (await (res as Response).json()) as Record<string, unknown> } catch { return null }
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

/**
 * نداءٌ واحد عبر البوّابة.
 *
 * `functions.invoke` يرمي `FunctionsHttpError` لكل حالة غير-2xx ويضع الاستجابة
 * في `error.context`. والبوّابة **تحمل نتائج عملٍ في حالات غير-2xx** (٤٢٩ للحدّ،
 * ٥٠٢ لخطأ الـRPC)، فقراءة الجسم عند الخطأ **ليست ترفًا**: بدونها يصير «كودك
 * مستعمَل» و«حاولت كثير» كلاهما «حدث خطأ ما».
 */
export async function callGateway(
  action: string,
  args: Record<string, unknown>,
  accessToken: string,
): Promise<GatewayReply> {
  const supabase = await getSupabase()
  if (!supabase) return reply('unreachable')
  try {
    const { data, error } = await supabase.functions.invoke(GATEWAY_FUNCTION, {
      body: { action, args },
      // الترويسة صريحة ولا تُترك لضبطٍ داخليّ في المكتبة: الهوية شرطُ كل ما تحته.
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (error) {
      const body = await readBody((error as { context?: unknown }).context)
      if (body === null) return reply('unreachable', { reason: String((error as Error).message ?? '') })
      return reply((str(body.outcome) || 'failed') as GatewayOutcome, {
        result: body.result ?? null,
        reason: str(body.reason),
        code: str(body.code),
      })
    }
    const body = (data ?? {}) as Record<string, unknown>
    return reply((str(body.outcome) || 'failed') as GatewayOutcome, {
      result: body.result ?? null,
      reason: str(body.reason),
      code: str(body.code),
    })
  } catch (e) {
    // شبكةٌ أو رميٌ غير متوقّع — **لم نبلغ الخادم**، ولا نزعم أنه حكم.
    return reply('unreachable', { reason: String((e as Error)?.message ?? '') })
  }
}

/**
 * هل هذا الردّ عطلٌ في **طبقة البوّابة** لا حكمًا تجاريًّا؟
 * يُستعمل حيث تُترجم النتيجة إلى `AccessFailure`، فلا تُقرأ تهيئةٌ ناقصة
 * «كودك غلط».
 */
export function isGatewayFault(outcome: GatewayOutcome): boolean {
  return outcome === 'misconfigured' || outcome === 'no_client_ip'
    || outcome === 'action_not_allowed' || outcome === 'action_missing'
    || outcome === 'unexpected_argument' || outcome === 'malformed_body'
    || outcome === 'method_not_allowed' || outcome === 'failed'
}
