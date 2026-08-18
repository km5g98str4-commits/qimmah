// مؤشّر الوصول الحالي — الحقيقة التي كانت تُقرأ للقرار وتُرمى بلا عرض.
// [SOVEREIGN-COMMERCE-001]
//
// ═══ الفراغ الذي يملؤه هذا الملف ═══
// `useAccess()` مُستهلَك في ثلاثة عشر موضعًا، وكلّها تأخذ `guard`/`can`/
// `blockedAction`/`beginTrial` **ولا واحد منها يقرأ `entitlement.status` أو
// `.detail` أو `.lastError`**. و`remainingMs()` بلا مستدعٍ. والنتيجة أن
// التطبيق لا يملك سطرًا واحدًا يقول للمستخدم ما وضعه: لا «عندك Premium»، ولا
// عدّاد تجربة، ولا إشعار إيقاف. من اشترى لا يرى أنه اشترى، ومن بدأ تجربته لا
// يعرف كم بقي منها، ومن أُوقف حسابه يكتشفه بزرٍّ لا يعمل.
//
// ═══ حدّ هذا الملف ═══
// **عرضٌ فقط.** لا شيء هنا يُقرَّر منه إذن؛ القرار يبقى في `status` عبر
// `isPaidActionAllowed`. ولو كذب هذا الملف بالكامل لما فُتح فعلٌ مدفوع واحد.

import type { Lang } from '@/lib/appPreferences'
import { accessStrings } from '@/i18n/dict/access'
import { remainingMs, type EntitlementDetail } from './entitlementBackend'
import type { EntitlementSnapshot } from './entitlementStore'

export type AccessKind =
  | 'checking'
  | 'premium'
  | 'special'
  | 'trial'
  | 'trialExpired'
  | 'revoked'
  | 'preview'
  | 'unknown'

export interface AccessSummary {
  kind: AccessKind
  /** مرآةٌ لـ`status === 'active'` — تُعرض ولا يُقرَّر منها. */
  allowed: boolean
  /** المتبقّي بالميلي ثانية من **ساعة الخادم**، أو `null` لِما لا ينتهي. */
  remainingMs: number | null
  /** سطر واحد بلغة المستخدم. */
  label: string
  /** نبرة العرض — للتلوين وحده. */
  tone: 'active' | 'ending' | 'neutral' | 'blocked'
}

/**
 * عتبة «تقارب تخلص».
 *
 * ستّ ساعات من أصل ٧٢: تكفي ليقرّر المستخدم، ولا تُقلق مبكّرًا. والتحذير
 * **إخبار لا ضغط** (الميثاق §6/١): «باقي كذا» لا «سارع قبل الفوات».
 */
export const TRIAL_ENDING_SOON_MS = 6 * 60 * 60 * 1000

/** صياغة المتبقّي بأرقام اللغة — لا رقم لاتيني في جلسة عربية. */
export function formatRemaining(ms: number, lang: Lang): string {
  const s = accessStrings[lang] ?? accessStrings.ar
  const totalMinutes = Math.floor(ms / 60000)
  if (totalMinutes < 1) return s.remainingLessThanAMinute
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? s.remainingHoursMinutes(hours, minutes) : s.remainingMinutes(minutes)
}

function kindFor(snapshot: EntitlementSnapshot): AccessKind {
  if (snapshot.status === 'loading') return 'checking'
  const state = snapshot.detail?.serverState
  if (state === 'premiumActive') return 'premium'
  if (state === 'specialAccessActive') return 'special'
  if (state === 'trialActive') return 'trial'
  if (state === 'trialExpired') return 'trialExpired'
  if (state === 'revoked') return 'revoked'
  if (state === 'noAccess') return 'preview'
  // بلا تفصيل: إمّا **بناء بلا خادم** (وضع المعاينة، وهو وصف صادق لا عطل)،
  // وإمّا **تعذّرت القراءة** — وهذان لا يُخلطان: الأوّل حالة، والثاني جهل.
  // والافتراض عند الجهل هو الإقرار به لا ادّعاء المعاينة.
  if (snapshot.lastError === 'backend_unconfigured' || snapshot.source === 'none') return 'preview'
  if (snapshot.lastError === 'not_authenticated') return 'preview'
  if (snapshot.lastError) return 'unknown'
  return 'preview'
}

/**
 * يلخّص الوصول الحالي في سطر صادق.
 *
 * `nowPerfMs` يُمرَّر ليبقى الحساب من `performance.now()` — عدّاد لا يتأثّر
 * بتغيير ساعة النظام — فمن يُرجع ساعة جهازه لا يمدّ تجربةً انتهت.
 */
export function summarizeAccess(
  snapshot: EntitlementSnapshot,
  lang: Lang,
  nowPerfMs?: number,
): AccessSummary {
  const s = accessStrings[lang] ?? accessStrings.ar
  const kind = kindFor(snapshot)
  const detail: EntitlementDetail | null = snapshot.detail ?? null
  const left = detail ? remainingMs(detail, nowPerfMs) : null
  const allowed = snapshot.status === 'active'

  switch (kind) {
    case 'checking':
      return { kind, allowed, remainingMs: null, label: s.statusChecking, tone: 'neutral' }
    case 'premium':
      // ولا كلمة عن مدّة: `premiumActive` بلا حدّ زمني في الاشتقاق، وأي وصف
      // مدّة هنا يصير وعدًا (الميثاق §0.1 — والصيغة المعتمدة وحدها تصف Premium).
      return { kind, allowed, remainingMs: null, label: s.statusPremium, tone: 'active' }
    case 'special':
      return {
        kind,
        allowed,
        remainingMs: left,
        label: left !== null ? `${s.statusSpecial} — ${formatRemaining(left, lang)}` : s.statusSpecial,
        tone: 'active',
      }
    case 'trial': {
      // بلا رقم متبقٍّ لا نخترع واحدًا: نعرض «شغّالة» بلا عدّاد كاذب.
      if (left === null) return { kind, allowed, remainingMs: null, label: s.statusTrial('—'), tone: 'active' }
      const ending = left <= TRIAL_ENDING_SOON_MS
      const text = formatRemaining(left, lang)
      return {
        kind,
        allowed,
        remainingMs: left,
        label: ending ? s.statusTrialEndingSoon(text) : s.statusTrial(text),
        tone: ending ? 'ending' : 'active',
      }
    }
    case 'trialExpired':
      return { kind, allowed, remainingMs: 0, label: s.statusTrialExpired, tone: 'neutral' }
    case 'revoked':
      return { kind, allowed, remainingMs: null, label: s.statusRevoked, tone: 'blocked' }
    case 'unknown':
      return { kind, allowed, remainingMs: null, label: s.statusUnknown, tone: 'neutral' }
    case 'preview':
    default:
      return { kind, allowed, remainingMs: null, label: s.statusPreview, tone: 'neutral' }
  }
}
