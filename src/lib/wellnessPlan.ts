import type { PlanMedication, PlanSupplement } from '@/types/wellness'
import type { Lang } from '@/lib/appPreferences'
import { getSupplement } from '@/data/supplementLibrary'
import { getMedication } from '@/data/medications'

/** ينشئ عنصر مكمّل في الخطة من المكتبة (يملأ التوقيت الشائع). */
export function createPlanSupplement(supplementId: string, order: number): PlanSupplement {
  const s = getSupplement(supplementId)
  return {
    id: `supp-${supplementId}-${order}`,
    supplementId,
    amount: '',
    timing: s?.commonTimingAr ?? '',
    frequency: 'يوميًا',
    notes: '',
    order,
  }
}

/** ينشئ عنصر دواء في الخطة — بدون جرعة (يُدخلها المستخدم). */
export function createPlanMedication(medicationId: string, order: number): PlanMedication {
  return {
    id: `med-${medicationId}-${order}`,
    medicationId,
    dose: '',
    timing: '',
    frequency: 'يوميًا',
    beforeAfterFood: '',
    notes: '',
    doctorNote: '',
    order,
  }
}

export function createCustomSupplement(order: number, id: string): PlanSupplement {
  return { id, supplementId: '', customNameAr: 'مكمّل جديد', customNameEn: 'New supplement', amount: '', timing: '', frequency: 'يوميًا', notes: '', order }
}

export function createCustomMedication(order: number, id: string): PlanMedication {
  return { id, medicationId: '', customNameAr: 'دواء جديد', customNameEn: 'New medication', dose: '', timing: '', frequency: 'يوميًا', beforeAfterFood: '', notes: '', doctorNote: '', order }
}

export function supplementName(ps: PlanSupplement, lang: Lang): string {
  const s = getSupplement(ps.supplementId)
  const ar = ps.customNameAr || s?.nameAr || ''
  const en = ps.customNameEn || s?.nameEn || ''
  if (lang === 'en') return en || ar
  return ar && en ? `${ar} — ${en}` : ar || en
}

export function medicationName(pm: PlanMedication, lang: Lang): string {
  const m = getMedication(pm.medicationId)
  const ar = pm.customNameAr || m?.nameAr || ''
  const en = pm.customNameEn || m?.nameEn || ''
  if (lang === 'en') return en || ar
  return ar && en ? `${ar} — ${en}` : ar || en
}

// defaultWellnessPlan انتقلت إلى customization.ts (P11.5) — كي لا تسحب حزمة
// الإقلاع مكتبتَي المكملات والأدوية المستوردتين أعلى هذا الملف.
