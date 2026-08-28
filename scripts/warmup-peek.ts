import { buildWarmupPlan } from '@/lib/warmupPlan'
import { warmupStrings } from '@/i18n/dict/warmup'
import { approvedImageFor } from '@/lib/exerciseProductionMedia'
import { defaultPlateConfig } from '@/lib/strength/plates'
import type { PlanDay, PlanExercise } from '@/types/workout'
const pe = (exerciseId: string, order: number, extra: Partial<PlanExercise> = {}): PlanExercise =>
  ({ id: `pe-${order}`, exerciseId, sets: 4, reps: '8–10', restSec: 120, order, ...extra })
const day = (id: string, ex: PlanExercise[]): PlanDay => ({ id, nameAr: 'يوم', nameEn: 'Day', exercises: ex })
const config = defaultPlateConfig()
for (const [label, d, opts] of [
  ['يوم الأجهزة (بلاغ المؤسس)', day('m', [pe('chest-press-machine',1), pe('lat-pulldown',2), pe('leg-press',3)]), { workingKgFor: () => Number.NaN }],
  ['يوم البار', day('b', [pe('barbell-back-squat',1,{startingWeight:'100'})]), {}],
] as const) {
  const p = buildWarmupPlan(d, { plateConfig: config, ...opts })
  const w = warmupStrings.ar
  console.log(`\n════ ${label} — ${w.title} · ${w.estimate(p.estMinutes)}`)
  console.log(`     ${w.subtitle}`)
  for (const s of p.steps) {
    const img = s.kind === 'mobility' ? (approvedImageFor(s.exerciseId)?.start ?? 'لا صورة') : 'لا صورة (خطوة قوّة)'
    const head = s.kind === 'mobility' ? '' : `${w.setOfPrefix}: `
    const line = s.kind === 'mobility' ? w.mobilityLine(s.seconds) : (s.weightKg !== undefined ? w.loadLine(s.weightKg, s.reps) : w.lightLine(s.reps))
    console.log(`  • [${s.kind.padEnd(8)}] ${head}${s.nameAr} — ${line}`)
    console.log(`      صورة: ${img}`)
  }
}
