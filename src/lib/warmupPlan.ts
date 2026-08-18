// إحماء الجلسة — [SOVEREIGN-TODAY-001] المهمّة ١.
//
// ═══ العطل الذي يغلقه هذا الملف ═══
// «اليوم» كان يَعِد بـ«إحماء قصير · دقيقتين»، وضغطُ الزرّ يدخل الجلسة الكاملة
// مباشرةً ثم يُعلّم الإحماء **منجزًا** (`completeFirstWin('warmup')` عند بدء
// الجلسة). فالشاشة تُعلن فعلًا مدّته دقيقتان، وتُسلّم فعلًا مدّته خمس وأربعون،
// ثم تُبلّغ نجاحًا لم يقع. خرق §6-٤ «الصدق قبل الطمأنينة».
//
// ═══ لماذا الإحماء يُشتقّ من الجلسة ولا يُؤلَّف ═══
// أي قائمة حركات عامّة («دوران كتف ٣٠ث») تكون **محتوى مخترعًا** لا مصدر له في
// المستودع — وهو ما يمنعه §5 («لا بيانات وهمية في مسار إنتاجي»). فالإحماء هنا
// لا يعرف حركةً واحدة خارج تمارين اليوم نفسه: هو **تمارينك أنت، أخفّ**.
//   • حديد بالبار (barbell · ez-bar · smith) بوزن عمل معروف ⇒ سلّم التحميل
//     القائم في `strength/warmup.ts` (البار → ٤٠٪ → ٦٠٪ → ٨٠٪)، بلا مجموعة
//     العمل — تلك تخصّ الجلسة لا الإحماء.
//   • ما عداه (دمبل · جهاز · كيبل · وزن الجسم) ⇒ **مجموعة خفيفة من نفس
//     التمرين** بتكرارات الخطة. تعليمة قياسية، ومصدرها اليوم نفسه.
//
// ═══ الوعد والتسليم من مصدر واحد ═══
// `estMinutes` تُحسب من الخطوات المبنيّة فعلًا، و«اليوم» يعرضها في وعده بدل رقم
// مكتوب بيد. فلا يمكن للوعد أن يفارق التسليم إلا بتغيّرهما معًا — والحارس
// `scripts/run-warmup-promise-proof.mjs` يُسقط أي محاولة لفصلهما.

import type { PlanDay, PlanExercise } from '@/types/workout'
import { getExercise } from '@/data/exercises'
import { getRecord } from '@/lib/exerciseHistory'
import { generateWarmup } from '@/lib/strength/warmup'
import { defaultPlateConfig, loadPlateConfig, type PlateConfig } from '@/lib/strength/plates'

/** أدوات يُحمَّل عليها بالأقراص — وحدها تستحقّ سلّم النِّسَب. */
const RAMPABLE_EQUIPMENT = new Set(['barbell', 'ez-bar', 'smith'])

/** وسم الخطوة — مفتاح بنيوي يترجمه القاموس، لا نصّ عربي في المنطق (§6). */
export type WarmupStepLabel = 'bar' | 'pct40' | 'pct60' | 'pct80' | 'light'

/** أقصى عدد تمارين تُشتقّ منها خطوات الإحماء — أوائل اليوم لا عيّنة. */
export const WARMUP_SOURCE_EXERCISES = 2
/** سقف الخطوات: الإحماء قصير بتعريفه؛ خمس خطوات ≈ دقيقتان. */
export const WARMUP_MAX_STEPS = 5
/** ثوانٍ لكل خطوة — سلّم البار أسرع من مجموعة كاملة خفيفة. */
export const WARMUP_RAMP_SECONDS = 25
export const WARMUP_LIGHT_SECONDS = 40

export interface WarmupStep {
  /** `ramp` = خطوة من سلّم التحميل · `light` = مجموعة خفيفة من نفس التمرين. */
  kind: 'ramp' | 'light'
  exerciseId: string
  nameAr: string
  nameEn: string
  /** الوزن المقرَّب لتحميل قابل للتحقيق — غائب في المجموعة الخفيفة بلا وزن معروف. */
  weightKg?: number
  reps: number
  label: WarmupStepLabel
  seconds: number
}

export interface WarmupPlan {
  steps: WarmupStep[]
  /** المدّة التقديرية بالدقائق — **مشتقّة من الخطوات**، وهي نفسها التي يَعِد بها «اليوم». */
  estMinutes: number
  /** معرّفات تمارين اليوم التي بُني منها الإحماء — لإثبات أنه ليس عامًّا. */
  sourceExerciseIds: string[]
}

export const EMPTY_WARMUP: WarmupPlan = { steps: [], estMinutes: 0, sourceExerciseIds: [] }

/** أول رقم في نطاق التكرارات («٨–١٢» ⇒ ٨). صفر/غياب ⇒ ١٠. */
function firstReps(reps: string | undefined): number {
  const m = String(reps ?? '').match(/\d+/)
  const n = m ? Number(m[0]) : NaN
  return Number.isFinite(n) && n > 0 ? Math.min(30, n) : 10
}

/** وزن العمل المعروف لهذا التمرين: وزن الخطة، وإلا آخر وزن مسجَّل. NaN إن مجهول. */
function knownWorkingKg(pe: PlanExercise): number {
  const fromPlan = Number(String(pe.startingWeight ?? '').match(/[\d.]+/)?.[0])
  if (Number.isFinite(fromPlan) && fromPlan > 0) return fromPlan
  const fromHistory = Number(String(getRecord(pe.exerciseId)?.lastWeight ?? '').match(/[\d.]+/)?.[0])
  return Number.isFinite(fromHistory) && fromHistory > 0 ? fromHistory : Number.NaN
}

const PCT_LABEL: Record<string, WarmupStepLabel> = {
  'البار': 'bar',
  '٤٠٪': 'pct40',
  '٦٠٪': 'pct60',
  '٨٠٪': 'pct80',
}

export interface BuildWarmupOptions {
  /** إعداد الأقراص لهذا الحساب — يُقرأ من التخزين حين لا يُمرَّر. */
  plateConfig?: PlateConfig
  /** وزن العمل المعروف — يُحقن في الإثباتات بدل قراءة التخزين. */
  workingKgFor?: (pe: PlanExercise) => number
}

/**
 * يبني إحماء الجلسة من **تمارين اليوم نفسه**. يُرجِع خطة فارغة إن كان اليوم بلا
 * تمارين — ولا يخترع حينها شيئًا؛ لا إحماء بلا تمرين يُحمى له.
 */
export function buildWarmupPlan(day: PlanDay | null | undefined, options: BuildWarmupOptions = {}): WarmupPlan {
  if (!day || day.exercises.length === 0) return EMPTY_WARMUP
  const config = options.plateConfig ?? (typeof window === 'undefined' ? defaultPlateConfig() : loadPlateConfig())
  const workingKgFor = options.workingKgFor ?? knownWorkingKg

  // أوائل اليوم — ما سيبدأ به المستخدم فعلًا، مرتّبًا كما في الخطة.
  const sources = [...day.exercises]
    .sort((a, b) => a.order - b.order)
    .filter((pe) => !pe.optional)
    .slice(0, WARMUP_SOURCE_EXERCISES)
  const pool = sources.length > 0 ? sources : day.exercises.slice(0, WARMUP_SOURCE_EXERCISES)

  const steps: WarmupStep[] = []
  const sourceExerciseIds: string[] = []

  for (const pe of pool) {
    if (steps.length >= WARMUP_MAX_STEPS) break
    const ex = getExercise(pe.exerciseId)
    const nameAr = pe.customNameAr || ex?.nameAr || pe.exerciseId
    const nameEn = pe.customNameEn || ex?.nameEn || pe.exerciseId
    const rampable = (ex?.equipment ?? []).some((e) => RAMPABLE_EQUIPMENT.has(e))
    const working = workingKgFor(pe)

    if (rampable && Number.isFinite(working) && working > config.barKg) {
      // مجموعة العمل تُستبعد: هي أول مجموعة في الجلسة، لا خطوة إحماء.
      const ladder = generateWarmup(working, config, firstReps(pe.reps)).filter((s) => !s.isWork)
      for (const rung of ladder) {
        if (steps.length >= WARMUP_MAX_STEPS) break
        steps.push({
          kind: 'ramp',
          exerciseId: pe.exerciseId,
          nameAr,
          nameEn,
          weightKg: rung.weightKg,
          reps: rung.reps,
          label: PCT_LABEL[rung.label] ?? 'light',
          seconds: WARMUP_RAMP_SECONDS,
        })
      }
      if (ladder.length > 0) {
        sourceExerciseIds.push(pe.exerciseId)
        continue
      }
    }

    // مجموعة خفيفة من **نفس** التمرين — بلا وزن مقترح، فالخفّة يقدّرها صاحبها.
    steps.push({
      kind: 'light',
      exerciseId: pe.exerciseId,
      nameAr,
      nameEn,
      reps: firstReps(pe.reps),
      label: 'light',
      seconds: WARMUP_LIGHT_SECONDS,
    })
    sourceExerciseIds.push(pe.exerciseId)
  }

  const seconds = steps.reduce((sum, s) => sum + s.seconds, 0)
  return {
    steps,
    estMinutes: steps.length === 0 ? 0 : Math.max(1, Math.round(seconds / 60)),
    sourceExerciseIds,
  }
}
