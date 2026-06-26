import type { CommitmentPlan, PlanCommitment } from '@/types/progress'
import type { Lang } from '@/lib/appPreferences'
import { getCommitment } from '@/data/commitmentLibrary'

export function createPlanCommitment(commitmentId: string, order: number): PlanCommitment {
  const item = getCommitment(commitmentId)
  return {
    id: `cmt-${commitmentId}-${order}`,
    commitmentId,
    category: item?.category,
    frequency: item?.frequency ?? 'daily',
    notes: '',
    order,
  }
}

export function createCustomCommitment(order: number, id: string): PlanCommitment {
  return { id, customNameAr: 'التزام جديد', customNameEn: 'New commitment', category: 'custom', frequency: 'daily', notes: '', order }
}

export function commitmentName(pc: PlanCommitment, lang: Lang): string {
  const item = getCommitment(pc.commitmentId ?? '')
  const ar = pc.customNameAr || item?.nameAr || ''
  const en = pc.customNameEn || item?.nameEn || ''
  if (lang === 'en') return en || ar
  return ar && en ? `${ar} — ${en}` : ar || en
}

export function defaultCommitmentPlan(): CommitmentPlan {
  const seed = ['today-workout', 'water-target', 'protein-target', 'sleep-7h', 'take-supplements']
  return {
    enabled: true,
    items: seed.map((id, i) => createPlanCommitment(id, i)),
  }
}
