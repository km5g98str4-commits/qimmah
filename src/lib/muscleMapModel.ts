import type { MuscleCoverage, MuscleId, MuscleStatus, MuscleView } from '@/types/muscles'
import type { TrainingLevel } from '@/types/profile'
import { weeklyTargetFor } from './muscleCoverage'
import { muscleGroupLabel } from '@/data/muscleGroups'
import { regionsFor, type MapRegion } from '@/data/muscleMapRegions'
import { MUSCLE_GROUPS } from './muscleGroupCoverage'
import { muscleCoverageStrings } from '@/i18n/dict/muscleCoverage'

// نموذج خريطة العضلات — منطق خالص بلا واجهة.
//
// يحوّل مخرجات computeWeeklyCoverage (مصدر الحقيقة الوحيد) إلى ما يحتاجه
// المخطّط: لكل منطقة مجموعُ مجموعاتها وهدفها وحالتها وشدّة إبرازها.
// فصل المنطق عن الرسم يجعل الاختبار ممكنًا بلا متصفّح.

/** شدّة الإبراز — خمس درجات بدل تدرّج مستمر كي يبقى الفرق مقروءًا بالعين. */
export type HeatLevel = 0 | 1 | 2 | 3 | 4

export interface RegionModel {
  id: string
  /** اسم المنطقة المعروض (من قاموس أسماء العضلات المركزي). */
  label: string
  muscles: MuscleId[]
  /** مجموع المجموعات المرجّحة لكل عضلات المنطقة. */
  sets: number
  /** مجموع الهدف الأسبوعي لعضلات المنطقة. */
  target: number
  /** نسبة الإنجاز 0..1 (مقصوصة عند 1). */
  ratio: number
  heat: HeatLevel
  status: MuscleStatus
  /** تفصيل كل عضلة داخل المنطقة — للوحة التفاصيل. */
  breakdown: { id: MuscleId; label: string; sets: number; target: number }[]
}

/** يحوّل نسبة الإنجاز إلى درجة إبراز. صفر مجموعات = صفر دائمًا. */
export function heatFor(sets: number, ratio: number): HeatLevel {
  if (sets <= 0) return 0
  if (ratio >= 0.9) return 4
  if (ratio >= 0.6) return 3
  if (ratio >= 0.3) return 2
  return 1
}

/**
 * اسم المنطقة — بلا نصوص مكرّرة وبلا تسمية مضلّلة:
 *   • عضلة واحدة        → اسمها.
 *   • تغطية مجموعة كاملة → اسم المجموعة (مثلًا الصدر الثلاثي = «الصدر»).
 *   • تغطية جزئية        → أسماء عضلاتها مسرودة (لا نسمّي الصدر كلّه «صدر علوي»).
 * كل الأسماء والفواصل من القواميس المركزية.
 */
function regionLabel(muscles: MuscleId[], lang: 'ar' | 'en'): string {
  if (muscles.length === 1) return muscleGroupLabel(muscles[0], lang)
  const group = MUSCLE_GROUPS.find(
    (g) => muscles.length === g.muscles.length && muscles.every((m) => g.muscles.includes(m)),
  )
  if (group) return group.name
  return muscles.map((m) => muscleGroupLabel(m, lang)).join(muscleCoverageStrings[lang].listSeparator)
}

/** حالة المنطقة: تُشتقّ من حالات عضلاتها بترتيب أولوية واضح. */
function statusFor(
  muscles: MuscleId[],
  coverage: Record<string, MuscleCoverage>,
  sets: number,
  target: number,
): MuscleStatus {
  if (sets <= 0) return 'undertrained'
  const states = muscles.map((m) => coverage[m]?.status).filter(Boolean) as MuscleStatus[]
  if (states.includes('fresh')) return 'fresh'
  if (states.includes('recovering')) return 'recovering'
  if (target > 0 && sets >= target) return 'trained'
  if (target > 0 && sets >= target * 0.5) return 'ready'
  return 'undertrained'
}

/** يبني نموذج كل مناطق جهة واحدة. */
export function buildRegionModels(
  view: MuscleView,
  coverage: Record<string, MuscleCoverage>,
  level: TrainingLevel = 'intermediate',
  lang: 'ar' | 'en' = 'ar',
): RegionModel[] {
  return regionsFor(view).map((r) => modelForRegion(r, coverage, level, lang))
}

function modelForRegion(
  r: MapRegion,
  coverage: Record<string, MuscleCoverage>,
  level: TrainingLevel,
  lang: 'ar' | 'en',
): RegionModel {
  let sets = 0
  let target = 0
  const breakdown = r.muscles.map((m) => {
    const c = coverage[m]
    const s = c?.sets ?? 0
    const tgt = weeklyTargetFor(m, level)
    sets += s
    target += tgt
    return { id: m, label: muscleGroupLabel(m, lang), sets: Math.round(s * 10) / 10, target: tgt }
  })
  sets = Math.round(sets * 10) / 10
  const ratio = target > 0 ? Math.min(1, sets / target) : 0
  return {
    id: r.id,
    label: regionLabel(r.muscles, lang),
    muscles: r.muscles,
    sets,
    target,
    ratio,
    heat: heatFor(sets, ratio),
    status: statusFor(r.muscles, coverage, sets, target),
    breakdown,
  }
}

/** ملخّص علوي للبطاقة: كم عضلة فُعّلت هذا الأسبوع ومجموع المجموعات. */
export function summarize(coverage: Record<string, MuscleCoverage>, all: MuscleId[]) {
  let trained = 0
  let totalSets = 0
  for (const m of all) {
    const s = coverage[m]?.sets ?? 0
    if (s > 0) trained += 1
    totalSets += s
  }
  return { trained, total: all.length, totalSets: Math.round(totalSets * 10) / 10 }
}
