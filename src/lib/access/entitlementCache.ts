// ذاكرة الاستحقاق المُتحقَّق منه — إجابةُ الخادم الأخيرة، مُعادةٌ بحدودها حين
// يتعذّر سؤاله. [OFFLINE-ENTITLEMENT-001]
//
// ═══ العطل الذي وُجد هذا الملف لأجله ═══
// الموقع يَعِد أن التطبيق يعمل «بلا إنترنت»، والاستحقاق كان يُسأل عنه في كل
// قراءة **ولا يُتذكَّر إطلاقًا**. فانقطاعُ شبكة أو مهلةُ ثمان ثوانٍ تعيد
// `{status:'none'}`، و`PremiumGate` يعرض عندها **نداء شراء لمن دفع بالفعل**.
// الخطأ ليس أمنيًّا بل تجاريّ: نطالب المشتري بالشراء مرّتين لأن شبكته انقطعت.
//
// ═══ خمسة حدود لا تُخرَق ═══
// ١) **الخادم يبقى السلطة.** لا شيء هنا يُنشئ استحقاقًا؛ كل ما هنا **إعادةُ
//    إجابةٍ أصدرها الخادم بنفسه** ووصلت مرّة واحدة على الأقلّ.
// ٢) **الموجب وحده يُحفَظ.** الحالات الفعّالة الثلاث فقط. لا تُحفَظ `none` ولا
//    `revoked` ولا `trialExpired` — فلا يصير انقطاعُ شبكة قفلًا طويل الأمد،
//    ولا تصير قراءةٌ فاشلة حكمًا على المستخدم.
// ٣) **مربوطة بالهوية.** كل سجلّ يحمل معرّف الحساب الذي تحقّق الخادم منه، ولا
//    يُقرأ لحساب آخر. ومفتاحه تحت `qimmah:` وخارج قائمة السماح العامّة، فيمسحه
//    `wipeUserData()` عند الخروج وعند تبديل الحساب (`accountScope.ts`).
// ٤) **مؤقّتة ومحدودة.** نافذة سماح مقفلة (`OFFLINE_GRACE_MS`)، **ومقصوصة**
//    بانتهاء الصلاحية الذي أصدره الخادم نفسه. وأوّل اتصالٍ ناجح يفوز فورًا:
//    إلغاء أو استرداد يمسح السجلّ في نفس اللحظة.
// ٥) **الوقت لا يُصدَّق حين يعود إلى الوراء.** القياس عبر الجلسات لا يملك إلا
//    ساعة الجهاز، فمن يُرجع ساعته يُسقط السجلّ (`clock_rollback`) ولا يمدّه.
//    تقديمها لا يضرّ: يُعجّل الانتهاء لا يؤجّله. **الفشل يُغلق في الاتجاهين.**
//
// ═══ حدّ معلَن — ليس تشفيرًا ═══
// حقل `integrity` **بصمة كاشفة للعبث لا توقيع**: من يملك تحرير التخزين المحلّي
// يملك إعادة حسابها من الشيفرة المشحونة. وهذا الحدّ نفسه معلَن في
// `guard.ts:13-14`: الحارس في العميل يمنع الاستهلاك غير المقصود ويجعل الفشل
// آمنًا، **والسلطة النهائية عقد الخادم** — الذي يُسأل في أوّل اتصال. فالبصمة
// تحمي من التلف والتحوير العابر، لا من مهاجمٍ يملك الجهاز.

import { readRaw, removeKey, writeJson, type WriteResult } from '@/lib/safeStorage'
import { backendAvailable, type AccessFailure, type EntitlementDetail, type ServerEntitlementState } from './entitlementBackend'
import type { EntitlementSource } from './entitlementStore'
import type { EntitlementStatus } from './paidActions'

/** مفتاح السجلّ. تحت `qimmah:` وخارج `GLOBAL_SAFE_KEYS` ⇒ يُمسح مع بيانات المستخدم. */
export const VERIFIED_ENTITLEMENT_KEY = 'qimmah:entitlement-verified:v1'

/**
 * نافذة السماح دون اتصال — **٧٢ ساعة**.
 *
 * تُقاس من **آخر تحقّق ناجح**، ويجدّدها كل اتصال ناجح. ولماذا هذا الرقم:
 *   • أطول من أي انقطاع واقعي (رحلة · تغطية ميتة · عطل مزوّد)، فلا يُطرد
 *     المشتري من تطبيقه لأن شبكته غابت يومًا.
 *   • وأقصر من أن يصير منحةً مستقلّة: مُلغى أو مستردٌّ ثمنه يعود إلى المنع
 *     خلال ثلاثة أيام **دون اتصال أصلًا**، وفورًا مع أوّل اتصال.
 *   • وهي وحدة زمنية قائمة في المنتج (مدّة التجربة)، فلا رقم سحريّ جديد.
 */
export const OFFLINE_GRACE_MS = 72 * 60 * 60 * 1000

/**
 * تسامح انحراف الساعة — خمس دقائق.
 *
 * تصحيح NTP يعيد الساعة ثوانيَ إلى الوراء في الاستعمال العادي؛ فلا يُعامَل ذلك
 * تلاعبًا. وما تجاوز التسامح **إلى الوراء** يُسقط السجلّ: تمديدُ نافذة بإرجاع
 * الساعة هو بالضبط ما لا نريده.
 */
export const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000

/** نسخة السجلّ. أي نسخة أخرى تُرفض ولا تُقرأ «باجتهاد». */
const RECORD_VERSION = 1

/**
 * الحالات القابلة للحفظ — **الموجبة وحدها**، وهي نفس الحالات الفعّالة في
 * `entitlementBackend.ACTIVE_STATES`. القائمة مكرّرة هنا عمدًا بدل استيراد
 * القيمة: لو استوردناها لصار الجسرُ والذاكرةُ دائرةَ استيراد، والتكرار هنا
 * ثلاث كلمات يحرسها الإثبات بتأكيد تطابق صريح.
 */
const CACHEABLE_STATES: ReadonlySet<string> = new Set(['premiumActive', 'specialAccessActive', 'trialActive'])

/** الأنواع القابلة للحفظ — مشتقّة من الحالات أعلاه. */
const CACHEABLE_TYPES: ReadonlySet<string> = new Set(['premium', 'special', 'trial'])

/** سجلّ التحقّق كما يُكتب في التخزين. كل حقوله من الخادم عدا ساعة الجهاز. */
export interface VerifiedEntitlementRecord {
  /** نسخة الشكل. */
  v: number
  /** الحساب الذي تحقّق الخادم منه — مصدره جلسة المصادقة لا مدخل مستخدم. */
  accountId: string
  serverState: ServerEntitlementState
  entitlementType: 'premium' | 'special' | 'trial'
  noExpiry: boolean
  /** انتهاء الصلاحية بساعة **الخادم**، أو `null` لِما لا ينتهي. */
  expiresAtMs: number | null
  activatedAtMs: number | null
  /** لحظة الخادم وقت التحقّق — أساس كل حساب زمني. */
  verifiedAtServerMs: number
  /** ساعة الجهاز في اللحظة نفسها — المسطرة الوحيدة المتاحة عبر الجلسات. */
  verifiedAtDeviceMs: number
  /** بصمة كاشفة للعبث (لا توقيع — انظر ترويسة الملف). */
  integrity: string
}

/** أسباب رفض السجلّ — **كلٌّ باسمه**، فلا يسقط إثبات باستثناء تقني (§4.2). */
export type CacheRejection =
  | 'absent'
  | 'unreadable'
  | 'wrong_version'
  | 'tampered'
  | 'account_mismatch'
  | 'state_not_cacheable'
  | 'clock_rollback'
  | 'expired'
  | 'stale'
  | 'backend_unconfigured'

/** نتيجة استشارة الذاكرة. */
export interface GraceOutcome {
  granted: boolean
  reason: CacheRejection | 'within_grace'
  /** تفصيل معاد البناء بساعة الخادم مصحّحةً بما مضى — `null` عند أي رفض. */
  detail: EntitlementDetail | null
  elapsedMs: number | null
}

// ————————————————————————————————————————————————————————————————
// البصمة
// ————————————————————————————————————————————————————————————————

const FINGERPRINT_SALT = 'qimmah:entitlement-verified:v1'

/** FNV-1a 32-bit — دالّة تجزئة عامّة سريعة، **لا دالّة تعمية**. */
function fnv1a(input: string, seed: number): string {
  let hash = seed
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

/** تسلسل قانوني ثابت الترتيب — أي حقل ناقص أو مبدَّل يغيّر البصمة. */
function canonicalPayload(record: Omit<VerifiedEntitlementRecord, 'integrity'>): string {
  return [
    FINGERPRINT_SALT,
    record.v,
    record.accountId,
    record.serverState,
    record.entitlementType,
    record.noExpiry ? '1' : '0',
    record.expiresAtMs === null ? 'null' : record.expiresAtMs,
    record.activatedAtMs === null ? 'null' : record.activatedAtMs,
    record.verifiedAtServerMs,
    record.verifiedAtDeviceMs,
  ].join('|')
}

/**
 * بصمة ٦٤ بتًّا من جولتين ببذرتين مختلفتين. جولة واحدة ٣٢ بتًّا تكفي للتلف
 * العابر ولا تكفي لتصادمٍ يُبحث عنه؛ والجولتان تجعلان التصادم غير عمليّ **بلا
 * ادّعاء تشفير** — الحدّ المعلَن في ترويسة الملف يبقى كما هو.
 */
export function fingerprintRecord(record: Omit<VerifiedEntitlementRecord, 'integrity'>): string {
  const payload = canonicalPayload(record)
  return `${fnv1a(payload, 0x811c9dc5)}${fnv1a(payload.split('').reverse().join(''), 0x9dc5811c)}`
}

// ————————————————————————————————————————————————————————————————
// القراءة والكتابة
// ————————————————————————————————————————————————————————————————

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function nullableNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value)
}

/**
 * يقرأ السجلّ ويتحقّق من **شكله** قبل مضمونه. المدخل من التخزين مدخل غير
 * موثوق (الميثاق §5)، فأي حقل ناقص أو من نوع آخر ⇒ `'unreadable'` لا اجتهاد.
 */
export function readVerifiedEntitlement(): VerifiedEntitlementRecord | CacheRejection {
  const raw = readRaw(VERIFIED_ENTITLEMENT_KEY)
  if (raw === null) return 'absent'
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return 'unreadable'
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return 'unreadable'
  const r = parsed as Record<string, unknown>
  if (
    !isFiniteNumber(r.v) ||
    typeof r.accountId !== 'string' || r.accountId === '' ||
    typeof r.serverState !== 'string' ||
    typeof r.entitlementType !== 'string' ||
    typeof r.noExpiry !== 'boolean' ||
    !nullableNumber(r.expiresAtMs) ||
    !nullableNumber(r.activatedAtMs) ||
    !isFiniteNumber(r.verifiedAtServerMs) ||
    !isFiniteNumber(r.verifiedAtDeviceMs) ||
    typeof r.integrity !== 'string'
  ) return 'unreadable'
  // النوع خارج الجدول ⇒ شكل غير مقروء أصلًا، لا حالة نُقرّر منها.
  if (!CACHEABLE_TYPES.has(r.entitlementType)) return 'unreadable'
  return {
    v: r.v,
    accountId: r.accountId,
    serverState: r.serverState as ServerEntitlementState,
    entitlementType: r.entitlementType as 'premium' | 'special' | 'trial',
    noExpiry: r.noExpiry,
    expiresAtMs: r.expiresAtMs as number | null,
    activatedAtMs: r.activatedAtMs as number | null,
    verifiedAtServerMs: r.verifiedAtServerMs,
    verifiedAtDeviceMs: r.verifiedAtDeviceMs,
    integrity: r.integrity,
  }
}

/** يمسح السجلّ. آمن للاستدعاء المتكرّر ولا يرمي. */
export function forgetVerifiedEntitlement(): void {
  removeKey(VERIFIED_ENTITLEMENT_KEY)
}

/**
 * يحفظ إجابةً **موجبة** جاء بها الخادم لتوّه.
 *
 * يُرجع `WriteResult` ولا يبتلعه (الميثاق §5) — وفشل الحفظ هنا لا يُعرض
 * للمستخدم ولا يوقف شيئًا: الجلسة الحالية مفتوحة بإجابة الخادم نفسها، وكل ما
 * يضيع هو سماحُ انقطاعٍ لاحق. والصادق أن يُقال ذلك لمن يقرأ لا أن يُخفى.
 *
 * ولا يُكتب شيء إن لم تكن الحالة قابلة للحفظ — **الموجب وحده يُحفَظ**.
 */
export function rememberVerifiedEntitlement(
  detail: EntitlementDetail,
  deviceNowMs: number = Date.now(),
): WriteResult {
  if (!CACHEABLE_STATES.has(detail.serverState)) return 'error'
  if (detail.entitlementType === 'none' || !CACHEABLE_TYPES.has(detail.entitlementType)) return 'error'
  if (typeof detail.accountId !== 'string' || detail.accountId === '') return 'error'
  if (!Number.isFinite(detail.serverTimeMs) || !Number.isFinite(deviceNowMs)) return 'error'
  const body: Omit<VerifiedEntitlementRecord, 'integrity'> = {
    v: RECORD_VERSION,
    accountId: detail.accountId,
    serverState: detail.serverState,
    entitlementType: detail.entitlementType,
    noExpiry: detail.noExpiry,
    expiresAtMs: detail.expiresAtMs,
    activatedAtMs: detail.activatedAtMs,
    verifiedAtServerMs: detail.serverTimeMs,
    verifiedAtDeviceMs: deviceNowMs,
  }
  return writeJson(VERIFIED_ENTITLEMENT_KEY, { ...body, integrity: fingerprintRecord(body) })
}

// ————————————————————————————————————————————————————————————————
// الحكم
// ————————————————————————————————————————————————————————————————

/**
 * يحكم على سجلٍّ مقروء. **دالّة نقيّة** — لا تخزين ولا ساعة ولا شبكة، فتُنفَّذ
 * في الإثبات كما تُنفَّذ في المتصفّح.
 *
 * ترتيب الفحوص مقصود: البصمة **قبل** مطابقة الحساب، كي يسقط تبديلُ معرّف
 * الحساب داخل السجلّ باسم `tampered` لا باسم `account_mismatch` — الاسم يجب
 * أن يصف ما حدث فعلًا.
 *
 * و`accountId === null` تعني «الهوية غير معروفة الآن» لا «أي هوية تُقبل»:
 * انظر `replayVerifiedEntitlement`.
 */
export function judgeVerifiedEntitlement(
  record: VerifiedEntitlementRecord,
  accountId: string | null,
  deviceNowMs: number,
): { reason: CacheRejection | 'within_grace'; elapsedMs: number } {
  const elapsedMs = Math.max(0, deviceNowMs - record.verifiedAtDeviceMs)
  if (record.v !== RECORD_VERSION) return { reason: 'wrong_version', elapsedMs }
  const { integrity, ...body } = record
  if (integrity !== fingerprintRecord(body)) return { reason: 'tampered', elapsedMs }
  if (!CACHEABLE_STATES.has(record.serverState)) return { reason: 'state_not_cacheable', elapsedMs }
  if (accountId !== null && record.accountId !== accountId) return { reason: 'account_mismatch', elapsedMs }
  if (deviceNowMs < record.verifiedAtDeviceMs - CLOCK_SKEW_TOLERANCE_MS) return { reason: 'clock_rollback', elapsedMs }
  if (elapsedMs > OFFLINE_GRACE_MS) return { reason: 'stale', elapsedMs }
  // انتهاء الخادم يقصّ النافذة ولا تقصّه: تجربةٌ انتهت لا تُمدّ بسماح انقطاع.
  if (record.expiresAtMs !== null && record.expiresAtMs - record.verifiedAtServerMs - elapsedMs <= 0) {
    return { reason: 'expired', elapsedMs }
  }
  return { reason: 'within_grace', elapsedMs }
}

function perfNow(): number {
  try {
    return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : 0
  } catch {
    return 0
  }
}

/**
 * يستشير الذاكرة نيابةً عن قراءةٍ تعذّرت.
 *
 * **يمسح السجلّ عند كل رفضٍ عدا الغياب** — سجلّ مرفوض لا يصير أصلح بمرور
 * الوقت، وإبقاؤه يترك بابًا لعبثٍ لاحق. والمسح ليس قفلًا: القرار يُعاد حسمه
 * من الخادم في كل قراءة، وأوّل اتصال ناجح يُنشئ سجلًّا جديدًا.
 */
export function replayVerifiedEntitlement(
  accountId: string | null,
  deviceNowMs: number = Date.now(),
  nowPerfMs: number = perfNow(),
): GraceOutcome {
  const record = readVerifiedEntitlement()
  if (typeof record === 'string') {
    if (record !== 'absent') forgetVerifiedEntitlement()
    return { granted: false, reason: record, detail: null, elapsedMs: null }
  }
  const { reason, elapsedMs } = judgeVerifiedEntitlement(record, accountId, deviceNowMs)
  if (reason !== 'within_grace') {
    forgetVerifiedEntitlement()
    return { granted: false, reason, detail: null, elapsedMs }
  }
  return {
    granted: true,
    reason,
    elapsedMs,
    detail: {
      serverState: record.serverState,
      entitlementType: record.entitlementType,
      noExpiry: record.noExpiry,
      expiresAtMs: record.expiresAtMs,
      activatedAtMs: record.activatedAtMs,
      accountId: record.accountId,
      // ساعة الخادم مقدَّمة بما مضى على الجهاز: فيبقى `remainingMs()` صادقًا
      // ويستمرّ العدّ التنازلي من حيث تركه الخادم لا من حيث تحقّقنا.
      serverTimeMs: record.verifiedAtServerMs + elapsedMs,
      receivedAtPerfMs: nowPerfMs,
      /** هذه الإجابة **مُعادة** لا طازجة — تُعلَن ولا تُموَّه. */
      fromCache: true,
    },
  }
}

// ————————————————————————————————————————————————————————————————
// التركيب — ما يستدعيه المزوّد
// ————————————————————————————————————————————————————————————————

/** ما يصل من `resolveEntitlement()` — موصوف بنيويًّا فلا دائرة استيراد. */
export interface ResolvedForGrace {
  status: EntitlementStatus
  source: EntitlementSource
  detail?: EntitlementDetail | null
  lastError?: string
  /** تصنيف الفشل من جسر الخادم — الفيصل بين «تعذّر السؤال» و«أُجيب بالمنع». */
  failure?: AccessFailure
  /** الحساب كما عرفته جلسة المصادقة وقت المحاولة. */
  accountId?: string | null
}

/** نفس الشكل، مع سبب الذاكرة حين تُستشار. */
export interface GracedEntitlement extends ResolvedForGrace {
  cacheReason?: CacheRejection | 'within_grace'
}

/**
 * الفشلان الوحيدان اللذان يعنيان «**لم نصل** إلى الخادم».
 *
 * و`service_error` **مستبعدة عمدًا**: الخادم رُدّ عليه فعلًا وشيءٌ عندنا معطوب
 * (بيبر ناقص · صلاحية · دالّة مفقودة). تغطيته بالسماح يجعل عطلًا في إعدادنا
 * يبدو تشغيلًا عاديًّا فلا يُبلَّغ عنه، وهو بعينه ما حذّر منه تصنيف الأخطاء في
 * `entitlementBackend`. و`backend_unconfigured` مستبعدة كذلك ولسببٍ أقوى: بناءٌ
 * بلا خادم لا يملك سلطة استحقاق أصلًا (انظر أدناه).
 */
const UNREACHABLE: ReadonlySet<string> = new Set<AccessFailure>(['timeout', 'offline'])

/**
 * يطبّق سياسة السماح على نتيجة قراءةٍ واحدة. **هذه هي الدالّة التي تحوّل
 * «تعذّر السؤال» إلى «آخر جوابٍ معروف» — ولا يوجد طريق آخر.**
 *
 * ثلاثة فروع لا رابع لها:
 *   • إجابة موجبة طازجة  ⇒ تُحفَظ وتمرّ كما هي.
 *   • إجابة سالبة طازجة  ⇒ **يُمسح السجلّ فورًا** (إلغاء · استرداد · انتهاء ·
 *     خروج). أوّل اتصال يفوز، وهذا هو معنى «الخادم يفوز فورًا».
 *   • تعذّر الوصول       ⇒ تُستشار الذاكرة ضمن حدودها الخمسة.
 * وما عدا ذلك (ردّ مشوَّه · عطل عندنا) يمرّ كما هو: لا حفظ ولا مسح ولا سماح.
 */
export function applyOfflineGrace(
  resolved: ResolvedForGrace,
  deviceNowMs: number = Date.now(),
  nowPerfMs: number = perfNow(),
): GracedEntitlement {
  // بناءٌ بلا خادم مضبوط لا يملك سلطة استحقاق — **ولا يستعير واحدة من التخزين**.
  // هذا هو القفل الثاني على بناء المعاينة (`VITE_APP_ENV=founder_preview`):
  // الأوّل أنّ `resolveEntitlement` تعيد `none` قبل أي نداء، والثاني هنا.
  // وضع التقليد شأنه شأن نفسه — لا يُحفَظ ولا يُقرأ من هنا.
  //
  // [LIVE-QA-A] وبعد أن صارت المعاينة تفتح تفعيل QA، صار مصدرها `mock` — فكان
  // يمرّ **بلا سبب**، فتضيع الرسالة الصادقة «الخدمة غير مضبوطة» ويحلّ محلّها
  // صمت. القفل نفسه لم يتغيّر (لا استعارة من التخزين)، والسبب يُحمَل معه:
  // بناءٌ محلّي بلا خادم يبقى `backend_unconfigured` لا «تأكّد من اتصالك».
  if (resolved.source === 'mock') {
    return backendAvailable() ? resolved : { ...resolved, cacheReason: 'backend_unconfigured' }
  }
  if (!backendAvailable()) return { ...resolved, cacheReason: 'backend_unconfigured' }
  if (resolved.source !== 'backend') return resolved

  if (resolved.status === 'active' && resolved.detail) {
    // الإجابة الطازجة تُحفَظ **بعد** أن صارت قرارًا، لا قبله.
    rememberVerifiedEntitlement(resolved.detail, deviceNowMs)
    return resolved
  }

  const answered = resolved.detail !== null && resolved.detail !== undefined
  if (answered || resolved.lastError === 'not_authenticated') {
    // الخادم أجاب فعلًا بغير الفعّال — أو لا جلسة أصلًا. لا سماح، والسجلّ يموت.
    forgetVerifiedEntitlement()
    return resolved
  }

  if (!resolved.failure || !UNREACHABLE.has(resolved.failure)) return resolved

  const outcome = replayVerifiedEntitlement(resolved.accountId ?? null, deviceNowMs, nowPerfMs)
  if (!outcome.granted || !outcome.detail) {
    // **سببٌ صادق باسمه**: سجلّ معبوث لا يُعرض «ما فيه اتصال»، بل يُسمّى عبثًا
    // ويبقى سبب الشبكة كما هو في `lastError`. الحقيقتان تُقالان معًا.
    return { ...resolved, cacheReason: outcome.reason }
  }
  return {
    status: statusFromCachedState(outcome.detail.serverState),
    source: 'cache',
    detail: outcome.detail,
    lastError: resolved.lastError,
    failure: resolved.failure,
    accountId: outcome.detail.accountId,
    cacheReason: 'within_grace',
  }
}

/**
 * نفس الجدول الحاكم في `entitlementBackend` مطبَّقًا على حالةٍ محفوظة —
 * والافتراض منع. لا تُشتقّ `active` من وجود سجلّ، بل من **حالةٍ فعّالة** فيه.
 */
function statusFromCachedState(state: ServerEntitlementState): EntitlementStatus {
  return CACHEABLE_STATES.has(state) ? 'active' : 'none'
}
