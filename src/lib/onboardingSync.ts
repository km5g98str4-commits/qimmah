// مزامنة إكمال الإعداد مع ملف المستخدم في Supabase (بوابة الإعداد لكل حساب).
//
// المزامنة الكاملة للبيانات مؤجّلة؛ لكنّنا نُبقي **إشارة الإكمال** على مستوى الحساب
// في صف الملف (profiles) حتى:
//   • يُطالَب الحساب الجديد (ملف فارغ) بالإعداد ولو على جهاز سبق إعداده بحساب آخر.
//   • لا يُعاد إعداد الحساب العائد (ملفه يحمل بيانات الإعداد) حتى على جهاز جديد.
// كل الدوال آمنة عند غياب الضبط/الشبكة (best-effort) ولا ترمي استثناءً؛ المصدر
// الأساسي لقرار البوابة يبقى السجلّ المحلي (isAccountOnboarded).

import { getSupabase } from './supabaseClient'
import { markAccountOnboarded } from './onboarding'
import type { OnboardingProfile } from '@/types/onboarding'

/** الحقول الجوهرية التي تُثبت أنّ الحساب أكمل الإعداد (وزنه/هدفه/طوله هو). */
interface OnboardingSnapshot {
  heightCm?: number
  currentWeightKg?: number
  targetWeightKg?: number
  goalType?: string
  onboardingCompleted?: boolean
  updatedAt?: string
}

function essentialsFrom(op: OnboardingProfile): OnboardingSnapshot {
  return {
    heightCm: op.bodyMetrics.heightCm,
    currentWeightKg: op.bodyMetrics.currentWeightKg,
    targetWeightKg: op.bodyMetrics.targetWeightKg,
    goalType: op.goal.type,
    onboardingCompleted: true,
    updatedAt: new Date().toISOString(),
  }
}

/** هل يحمل ملف الحساب بيانات إعداد فعلية (إشارة أنّه أكمل الإعداد)؟ */
function snapshotLooksOnboarded(ob: OnboardingSnapshot | undefined): boolean {
  if (!ob) return false
  return ob.onboardingCompleted === true || ob.currentWeightKg != null || ob.goalType != null
}

/** يجلب معرّف المستخدم الحالي مباشرةً من Supabase (لا يعتمد على حالة React). */
export async function currentUserId(): Promise<string | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  try {
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  } catch {
    return null
  }
}

/**
 * best-effort: يحفظ جوهر الإعداد في صف ملف المستخدم (عمود data من نوع JSON).
 * يدمج فوق البيانات الموجودة حتى لا يمحو مفاتيح أخرى. لا يرمي أبدًا.
 */
export async function persistOnboardingToProfile(userId: string, op: OnboardingProfile): Promise<void> {
  const supabase = getSupabase()
  if (!supabase || !userId) return
  try {
    const { data: existing } = await supabase
      .from('profiles')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle()
    const prevData =
      existing?.data && typeof existing.data === 'object' ? (existing.data as Record<string, unknown>) : {}
    const nextData = { ...prevData, onboarding: essentialsFrom(op) }
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
  const supabase = getSupabase()
  if (!supabase || !userId) return false
  try {
    const { data } = await supabase.from('profiles').select('data').eq('user_id', userId).maybeSingle()
    const d = data?.data && typeof data.data === 'object' ? (data.data as Record<string, unknown>) : {}
    const ob = d.onboarding as OnboardingSnapshot | undefined
    const done = snapshotLooksOnboarded(ob)
    if (done) markAccountOnboarded(userId)
    return done
  } catch {
    return false
  }
}
