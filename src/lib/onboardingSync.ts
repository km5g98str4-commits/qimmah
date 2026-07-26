// مزامنة إكمال الإعداد مع ملف المستخدم في Supabase (بوابة الإعداد لكل حساب).
//
// المزامنة الكاملة للبيانات مؤجّلة؛ لكنّنا نُبقي **إشارة الإكمال** على مستوى الحساب
// في صف الملف (profiles) حتى:
//   • يُطالَب الحساب الجديد (ملف فارغ) بالإعداد ولو على جهاز سبق إعداده بحساب آخر.
//   • لا يُعاد إعداد الحساب العائد (ملفه يحمل بيانات الإعداد) حتى على جهاز جديد.
// كل الدوال آمنة عند غياب الضبط/الشبكة (best-effort) ولا ترمي استثناءً؛ المصدر
// الأساسي لقرار البوابة يبقى السجلّ المحلي (isAccountOnboarded).
//
// إصلاح سباق الكتّاب الثلاثة (P12 — docs/audit/CODE-NOTES-FULL.md): هذه الوحدة
// كانت الكاتب المباشر الثاني لعمود profiles.data.onboarding بشكل «essentials»
// مختزل يتجاوز طابور المزامنة وLWW. الآن:
//   • المزامنة مفعّلة ومسموحة ⇒ يمرّ الإكمال عبر المسار القانوني الواحد
//     (enqueueOnboardingProfileUpsert → طابور → LWW) — لا كتابة مباشرة إطلاقًا.
//   • المزامنة مطفأة (بوابة الإكمال فقط) ⇒ كتابة مباشرة **بالشكل الكامل نفسه**
//     وبطابع LWW، محروسة بالأحدثية: لا تدهس onboarding سحابيًّا أحدث طابعًا.

import { getSupabase } from './supabaseClient'
import { markAccountOnboarded } from './onboarding'
import { enqueueOnboardingProfileUpsert } from './onboardingProfile'
import { syncAllowedFor } from './syncQueue'
import type { OnboardingProfile } from '@/types/onboarding'

/** الشكل القديم المختزل — يبقى مقروءًا للتوافق (صفوف كتبتها إصدارات سابقة). */
interface LegacyOnboardingSnapshot {
  heightCm?: number
  currentWeightKg?: number
  targetWeightKg?: number
  goalType?: string
  onboardingCompleted?: boolean
  updatedAt?: string
}

/** هل يحمل ملف الحساب بيانات إعداد فعلية (إشارة أنّه أكمل الإعداد)؟ يقرأ الشكلين. */
function snapshotLooksOnboarded(ob: unknown): boolean {
  if (!ob || typeof ob !== 'object') return false
  const full = ob as Partial<OnboardingProfile>
  if (full._meta && typeof full._meta === 'object') {
    return full._meta.completed === true || full.bodyMetrics?.currentWeightKg != null || full.goal?.type != null
  }
  const legacy = ob as LegacyOnboardingSnapshot
  return legacy.onboardingCompleted === true || legacy.currentWeightKg != null || legacy.goalType != null
}

/** طابع أحدثية onboarding سحابي (كامل أو legacy) — 0 عند غياب الدليل. */
function cloudOnboardingStampMs(ob: unknown): number {
  if (!ob || typeof ob !== 'object') return 0
  const full = ob as Partial<OnboardingProfile> & LegacyOnboardingSnapshot
  const stamp = full._meta?.updatedAt ?? full._meta?.completedAt ?? full.updatedAt
  const ms = typeof stamp === 'string' ? Date.parse(stamp) : NaN
  return Number.isFinite(ms) ? ms : 0
}

/** يجلب معرّف المستخدم الحالي مباشرةً من Supabase (لا يعتمد على حالة React). */
export async function currentUserId(): Promise<string | null> {
  const supabase = await getSupabase()
  if (!supabase) return null
  try {
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  } catch {
    return null
  }
}

/**
 * best-effort: يوصل إكمال الإعداد لصف ملف المستخدم. لا يرمي أبدًا.
 *
 * المسار الواحد (P12): مع مزامنة مفعّلة يمرّ عبر الطابور القانوني (نفس الشكل
 * الكامل ونفس طابع LWW ككل الكتّاب) ثم يُستحث flush. مع مزامنة مطفأة (بوابة
 * الإكمال وحدها) يكتب مباشرة بالشكل الكامل، محروسًا بالأحدثية: onboarding
 * سحابي بطابع أحدث لا يُداس.
 */
export async function persistOnboardingToProfile(userId: string, op: OnboardingProfile): Promise<void> {
  if (!userId) return
  const stamped: OnboardingProfile = {
    ...op,
    _meta: { ...op._meta, updatedAt: op._meta.updatedAt ?? new Date().toISOString() },
  }
  if (syncAllowedFor(userId)) {
    // الكاتب القانوني الوحيد — الطابور يدمج (استبدال بنفس المفتاح) وflush يرفع.
    enqueueOnboardingProfileUpsert(stamped)
    try {
      const { flushSyncQueue } = await import('./syncService')
      await flushSyncQueue()
    } catch {
      /* الطابور دائم — سيُرفع مع أول مشغّل لاحق */
    }
    return
  }
  const supabase = await getSupabase()
  if (!supabase) return
  try {
    const { data: existing } = await supabase
      .from('profiles')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle()
    const prevData =
      existing?.data && typeof existing.data === 'object' ? (existing.data as Record<string, unknown>) : {}
    // حارس LWW: لا نكتب فوق onboarding سحابي أحدث طابعًا (جهاز آخر أكمل بعده).
    const ourStamp = Date.parse(stamped._meta.updatedAt ?? '') || 0
    if (cloudOnboardingStampMs(prevData.onboarding) > ourStamp) return
    const nextData = { ...prevData, onboarding: stamped }
    await supabase.from('profiles').upsert({ user_id: userId, data: nextData }, { onConflict: 'user_id' })
  } catch {
    /* السجلّ المحلي هو مصدر الحقيقة للبوابة — تجاهل فشل السحابة */
  }
}

/**
 * عند تسجيل الدخول: إن كان ملف الحساب يحمل بيانات إعداد، عَلِّم الحساب محليًا بأنه
 * مكتمل (حتى يتخطّى العائد الإعداد ولو على جهاز جديد). حساب جديد (ملف فارغ) يبقى
 * غير مكتمل → تظهر له بوابة الإعداد. يعيد true إن كان الحساب مكتملًا سحابيًا. لا يرمي.
 */
export async function hydrateOnboardingFromProfile(userId: string): Promise<boolean> {
  const supabase = await getSupabase()
  if (!supabase || !userId) return false
  try {
    const { data } = await supabase.from('profiles').select('data').eq('user_id', userId).maybeSingle()
    const d = data?.data && typeof data.data === 'object' ? (data.data as Record<string, unknown>) : {}
    const done = snapshotLooksOnboarded(d.onboarding)
    if (done) markAccountOnboarded(userId)
    return done
  } catch {
    return false
  }
}
