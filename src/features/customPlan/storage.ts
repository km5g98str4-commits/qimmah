// تخزين «الجدول المخصّص» لكل حساب (P10 A1).
//
// يتّبع نمط سجلّ الحسابات في onboarding (ONBOARDING_ACCOUNTS_KEY): سجلّ واحد
// مفتاحه معرّف الحساب (userId) أو 'guest' لوضع الضيف، فلا يرث حساب جدول حساب آخر.
// الجدول نفسه من نوع WorkoutPlan الحالي، فيعمل مباشرةً في تبويب التمرين ووضع التمرين.

import type { WorkoutPlan } from '@/types/workout'
import { normalizePlanDayNames } from '@/lib/planDayNames'

/** مفتاح سجلّ الجداول المخصّصة (لكل حساب، لا لكل جهاز). */
export const CUSTOM_PLAN_KEY = 'qimmah:customPlan:v1'

/** مصدر الجدول المعتمد في تبويب التمرين: تلقائي (المولّد) أو المخصّص. */
export type PlanSource = 'auto' | 'custom'

export interface CustomPlanRecord {
  plan: WorkoutPlan
  source: PlanSource
  updatedAt: string
}

type Registry = Record<string, CustomPlanRecord>

/** مفتاح المالك: معرّف الحساب المسجّل، أو 'guest' للضيف. */
export function ownerKey(userId: string | null | undefined): string {
  return userId ?? 'guest'
}

function loadRegistry(): Registry {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(CUSTOM_PLAN_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Registry) : {}
  } catch {
    return {}
  }
}

function saveRegistry(reg: Registry): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CUSTOM_PLAN_KEY, JSON.stringify(reg))
  } catch {
    /* تجاهل أخطاء التخزين */
  }
}

/** يقرأ سجلّ الجدول المخصّص للمالك الحالي (أو undefined إن لم يوجد). */
export function loadCustomPlanRecord(userId: string | null | undefined): CustomPlanRecord | undefined {
  const rec = loadRegistry()[ownerKey(userId)]
  if (!rec || !rec.plan || !Array.isArray(rec.plan.days)) return undefined
  // تطبيع أسماء الأيام وقت القراءة (P10.1): جداول مخصّصة قديمة بلا nameEn تُكمَّل تلقائيًا.
  return { ...rec, plan: normalizePlanDayNames(rec.plan) }
}

/** هل يملك هذا الحساب جدولًا مخصّصًا محفوظًا فيه يوم واحد على الأقل؟ */
export function hasCustomPlan(userId: string | null | undefined): boolean {
  const rec = loadCustomPlanRecord(userId)
  return Boolean(rec && rec.plan.days.length > 0)
}

/** يحفظ الجدول المخصّص للمالك الحالي ويعتمده مصدرًا للجدول. */
export function saveCustomPlan(userId: string | null | undefined, plan: WorkoutPlan): CustomPlanRecord {
  // [QIM-WEB-FOUNDER-UX-003/حزمة ٢] **لا حارس هنا — وهذا قرار لا سهو.**
  //
  // كان الحارس هنا فأسقط `test:sync` عند «إعادة رفع aux بعد الدمج»: هذه الدالة
  // هي أيضًا مسار **استعادة السحابة** (`syncStores.ts` عند تهجير الخطة من
  // الخادم). حجبها يمنع المستخدم من استرجاع خطته التي يملكها أصلًا — عقاب لا
  // حماية، ونفس الحدّ المطبَّق على `measurementLog.saveLogs`.
  //
  // الفعل المدفوع هو **تأليف** خطة مخصّصة لا استعادتها، فالحارس عند مدخل
  // التأليف (`WorkoutView` → `CustomPlanBuilder.onSave`) ويحرسه `test:access-gate`.
  const reg = loadRegistry()
  const rec: CustomPlanRecord = { plan, source: 'custom', updatedAt: new Date().toISOString() }
  reg[ownerKey(userId)] = rec
  saveRegistry(reg)
  return rec
}

/** يمسح الجدول المخصّص للمالك الحالي (يعود التبويب للجدول التلقائي). */
export function clearCustomPlan(userId: string | null | undefined): void {
  const reg = loadRegistry()
  if (reg[ownerKey(userId)]) {
    delete reg[ownerKey(userId)]
    saveRegistry(reg)
  }
}

/** المصدر المعتمد للمالك الحالي (تلقائي افتراضيًا). */
export function getPlanSource(userId: string | null | undefined): PlanSource {
  return loadCustomPlanRecord(userId)?.source ?? 'auto'
}

/**
 * يبدّل المصدر المعتمد. التبديل إلى «custom» يتطلّب وجود جدول مخصّص محفوظ؛
 * وإلا يبقى «auto» (لا يمكن اعتماد جدول غير موجود).
 */
export function setPlanSource(userId: string | null | undefined, source: PlanSource): void {
  const reg = loadRegistry()
  const key = ownerKey(userId)
  const rec = reg[key]
  if (!rec) return // لا جدول مخصّص بعد → يبقى التلقائي
  rec.source = source
  rec.updatedAt = new Date().toISOString()
  saveRegistry(reg)
}

/**
 * الجدول الفعّال في تبويب التمرين: المخصّص إن كان معتمدًا وفيه أيام، وإلا التلقائي المُمرَّر.
 * هذا هو نقطة التوصيل الوحيدة التي يحتاجها العرض/وضع التمرين.
 */
export function getActivePlan(userId: string | null | undefined, autoPlan: WorkoutPlan): WorkoutPlan {
  const rec = loadCustomPlanRecord(userId)
  if (rec && rec.source === 'custom' && rec.plan.days.length > 0) return rec.plan
  return autoPlan
}
