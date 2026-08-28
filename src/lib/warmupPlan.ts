// إحماء الجلسة — [SOVEREIGN-TODAY-001] المهمّة ١ · [FOUNDER-QA] الإصلاح P0.
//
// ═══ العطل الأول (مُغلَق) — الوعد يفارق التسليم ═══
// «اليوم» كان يَعِد بـ«إحماء قصير · دقيقتين»، وضغطُ الزرّ يدخل الجلسة الكاملة
// مباشرةً ثم يُعلّم الإحماء **منجزًا** (`completeFirstWin('warmup')` عند بدء
// الجلسة). فالشاشة تُعلن فعلًا مدّته دقيقتان، وتُسلّم فعلًا مدّته خمس وأربعون،
// ثم تُبلّغ نجاحًا لم يقع. خرق §6-٤ «الصدق قبل الطمأنينة».
//
// ═══ العطل الثاني (يُغلقه هذا الملف) — الإحماء صار جهازًا ═══
// بلاغ المؤسس: بطاقة إحماء تعرض **«جهاز ضغط الصدر»** بصورة الجهاز نفسه. سببه
// بنيوي لا تجميلي: كل خطوة إحماء كانت تُشتقّ من تمارين اليوم، وفرعُ «غير البار»
// يُصدر «مجموعة خفيفة من **نفس** التمرين» حاملةً `exerciseId` الجهاز واسمه
// وصورته. فيوم الأجهزة كان إحماؤه **هو الجهاز حرفيًّا** — لا إحماءً له.
//
// ═══ تصحيح مقدّمة كانت مكتوبة هنا ═══
// كان رأس هذا الملف يقول إن أي قائمة حركات إحماء تكون «محتوى مخترعًا لا مصدر له
// في المستودع» — وهي **مقدّمة صارت غير صحيحة**. المستودع يحمل اليوم عشر حركات
// مرونة مُصنَّفة في الكتالوج نفسه، بمصادر مُتحقَّقة:
//
//   المصدر ١ — `src/data/exercises.ts` (سطور ٥٥٦–٥٦٥): عشرة تمارين
//     `movementPattern: 'mobility'` بأسماء عربية وإنجليزية وتكرارات افتراضية.
//   المصدر ٢ — `src/data/exerciseProductionManifest.generated.ts`: الحركات العشر
//     كلّها `imageStatus: 'APPROVED'` و`videoStatus: 'APPROVED'` (صور من
//     yuhonas/free-exercise-db بترخيص Unlicense، ومراجع فيديو مُراجَعة بأسماء
//     قنواتها). فالوسائط هنا مُعتمَدة لا مُستعارة.
//   المصدر ٣ — `src/data/coaching/exerciseCues.generated.ts` ونظيره الإنجليزي:
//     تعليمة أداء مؤلَّفة لكل واحدة من العشر، بالعربية والإنجليزية.
//
// فالإحماء لم يعد يخترع شيئًا حين يصير حركة مرونة: هو **يقرأ من الكتالوج** كما
// تقرأ بقيّة الشاشات. الممنوع بـ§5 هو البيانات الوهمية، لا البيانات المصدَّقة.
//
// ═══ ماذا يبني هذا الملف الآن ═══
//   ١) **حركتا مرونة من الكتالوج** تتصدّران الإحماء، تُختاران **حتميًّا** من
//      أنماط حركة اليوم ثم من عضلاته الأساسية (`MOBILITY_BY_PATTERN` ثم
//      `MOBILITY_BY_MUSCLE`) — بلا `Math.random`، فنفس اليوم يعطي نفس الإحماء
//      دائمًا. وما كان من الحركتين موجودًا في تمارين اليوم يُستبعَد: الإحماء
//      لا يكرّر ما ستفعله بعد قليل.
//   ٢) **سلّم التحميل بالبار** كما هو (barbell · ez-bar · smith بوزن عمل معروف)
//      — فرعٌ صحيح ونافع، لم يُمسّ: `strength/warmup.ts` (البار → ٤٠٪ → ٦٠٪ →
//      ٨٠٪) بلا مجموعة العمل، فتلك تخصّ الجلسة لا الإحماء.
//   ٣) **مجموعة تسخين على التمرين الأول** لما عدا ذلك (دمبل · جهاز · كيبل ·
//      وزن الجسم). بقيت لأنها نافعة، لكن هويّتها صارت مُعلَنة في النصّ:
//      «تسخين على: جهاز ضغط الصدر» لا «جهاز ضغط الصدر». والجهاز لم يعد يُعرض
//      **بصورته** تحت عنوان إحماء إطلاقًا — الوسائط للمرونة وحدها
//      (`WarmupScreen.tsx`)، وحركةٌ بلا وسيط معتمد تُعرض بلا صورة لا ببديل.
//
// ═══ الوعد والتسليم من مصدر واحد ═══
// `estMinutes` تُحسب من الخطوات المبنيّة فعلًا — بما فيها خطوات المرونة — و«اليوم»
// يعرضها في وعده بدل رقم مكتوب بيد. فلا يمكن للوعد أن يفارق التسليم إلا بتغيّرهما
// معًا، والحارسان `scripts/run-warmup-promise-proof.mjs` و
// `scripts/run-warmup-identity-proof.mjs` يُسقطان أي محاولة لفصلهما أو لإعادة
// الجهاز إلى موضع الإحماء.

import type { Muscle, MovementPattern, PlanDay, PlanExercise } from '@/types/workout'
import { getExercise } from '@/data/exercises'
import { getRecord } from '@/lib/exerciseHistory'
import { generateWarmup } from '@/lib/strength/warmup'
import { defaultPlateConfig, loadPlateConfig, type PlateConfig } from '@/lib/strength/plates'
import { foldDigits } from './numberFormat'

/** أدوات يُحمَّل عليها بالأقراص — وحدها تستحقّ سلّم النِّسَب. */
const RAMPABLE_EQUIPMENT = new Set(['barbell', 'ez-bar', 'smith'])

/** وسم الخطوة — مفتاح بنيوي يترجمه القاموس، لا نصّ عربي في المنطق (§6). */
export type WarmupStepLabel = 'mobility' | 'bar' | 'pct40' | 'pct60' | 'pct80' | 'light'

/** أقصى عدد تمارين تُشتقّ منها خطوات القوّة — أوائل اليوم لا عيّنة. */
export const WARMUP_SOURCE_EXERCISES = 2
/** سقف خطوات **القوّة** وحدها (السلّم والتسخين). المرونة لها ميزانيتها أدناه. */
export const WARMUP_MAX_STEPS = 5
/** كم حركة مرونة تتصدّر الإحماء. اثنتان: واحدة للمفصل القائد وأخرى للسلسلة المساندة. */
export const WARMUP_MOBILITY_STEPS = 2
/** ثوانٍ لكل خطوة — سلّم البار أسرع من مجموعة كاملة خفيفة. */
export const WARMUP_RAMP_SECONDS = 25
export const WARMUP_LIGHT_SECONDS = 40
/** حركة المرونة بالزمن لا بالعدّ — نصف دقيقة لكل واحدة. */
export const WARMUP_MOBILITY_SECONDS = 30

interface WarmupStepBase {
  exerciseId: string
  nameAr: string
  nameEn: string
  label: WarmupStepLabel
  seconds: number
}

/** حركة مرونة من الكتالوج — **ليست من تمارين اليوم**، وتُقاس بالزمن لا بالتكرار. */
export interface WarmupMobilityStep extends WarmupStepBase {
  kind: 'mobility'
  label: 'mobility'
}

/** خطوة مشتقّة من تمرين اليوم: درجة في سلّم التحميل، أو مجموعة تسخين عليه. */
export interface WarmupStrengthStep extends WarmupStepBase {
  /** `ramp` = درجة من سلّم التحميل · `light` = مجموعة تسخين على التمرين نفسه. */
  kind: 'ramp' | 'light'
  /** الوزن المقرَّب لتحميل قابل للتحقيق — غائب في مجموعة التسخين بلا وزن معروف. */
  weightKg?: number
  reps: number
}

export type WarmupStep = WarmupMobilityStep | WarmupStrengthStep

export interface WarmupPlan {
  steps: WarmupStep[]
  /** المدّة التقديرية بالدقائق — **مشتقّة من الخطوات**، وهي نفسها التي يَعِد بها «اليوم». */
  estMinutes: number
  /** معرّفات تمارين اليوم التي بُنيت منها خطوات القوّة — لإثبات أنها ليست عامّة. */
  sourceExerciseIds: string[]
  /** معرّفات حركات المرونة المُختارة — **من الكتالوج لا من اليوم**، لإثبات أن الإحماء إحماء. */
  mobilityExerciseIds: string[]
}

export const EMPTY_WARMUP: WarmupPlan = {
  steps: [],
  estMinutes: 0,
  sourceExerciseIds: [],
  mobilityExerciseIds: [],
}

/**
 * حركات المرونة المرشَّحة لكل نمط حركة — **جدول ثابت مقروء**، لا اختيار عشوائي.
 *
 * كل معرّف هنا موجود في `src/data/exercises.ts` بـ`movementPattern: 'mobility'`
 * وبأداة `bodyweight` (فلا يفترض الإحماء عتادًا لا يملكه صاحبه). والحارس
 * `scripts/run-warmup-identity-proof.mjs` يفحص الشرطين على كل معرّف في الجدولين،
 * فانزياح معرّف أو تغيّر تصنيفه يسقط الإثبات باسمه بدل أن يمرّ صامتًا.
 *
 * `isolation` و`mobility` غير مذكورين عمدًا: الأول لا يقول شيئًا عن المفصل
 * المستهدَف فيُحسم بالعضلة، والثاني لا يحتاج إحماءَ مرونة قبل مرونة.
 */
const MOBILITY_BY_PATTERN: Partial<Record<MovementPattern, readonly string[]>> = {
  push: ['arm-circles', 'thoracic-rotation'],
  pull: ['cat-cow', 'thoracic-rotation'],
  squat: ['leg-swings', 'ankle-mobility'],
  lunge: ['leg-swings', 'hip-flexor-stretch'],
  hinge: ['leg-swings', 'hamstring-stretch'],
  core: ['cat-cow', 'world-greatest-stretch'],
  carry: ['thoracic-rotation', 'ankle-mobility'],
  cardio: ['leg-swings', 'ankle-mobility'],
}

/** المرتبة الثانية من الحسم: العضلة الأساسية — تُستعمل حين لا يكفي نمط الحركة (`isolation`). */
const MOBILITY_BY_MUSCLE: Record<Muscle, readonly string[]> = {
  chest: ['arm-circles', 'thoracic-rotation'],
  shoulders: ['arm-circles', 'thoracic-rotation'],
  triceps: ['arm-circles', 'thoracic-rotation'],
  back: ['cat-cow', 'thoracic-rotation'],
  biceps: ['cat-cow', 'arm-circles'],
  core: ['cat-cow', 'world-greatest-stretch'],
  legs: ['leg-swings', 'ankle-mobility'],
  quads: ['leg-swings', 'hip-flexor-stretch'],
  hamstrings: ['leg-swings', 'hamstring-stretch'],
  glutes: ['leg-swings', 'world-greatest-stretch'],
  calves: ['ankle-mobility', 'leg-swings'],
  cardio: ['leg-swings', 'ankle-mobility'],
}

/** أول رقم في نطاق التكرارات («٨–١٢» ⇒ ٨). صفر/غياب ⇒ ١٠. */
function firstReps(reps: string | undefined): number {
  const m = String(reps ?? '').match(/\d+/)
  const n = m ? Number(m[0]) : NaN
  return Number.isFinite(n) && n > 0 ? Math.min(30, n) : 10
}

/** وزن العمل المعروف لهذا التمرين: وزن الخطة، وإلا آخر وزن مسجَّل. NaN إن مجهول. */
function knownWorkingKg(pe: PlanExercise): number {
  // الطيّ أولًا: «وزن البداية» يُكتب في محرّر الخطة بحقل نصّي حرّ، فقد يصل عربيًّا.
  // وبلا طيّ يسقط سلّم التحميل كلّه إلى خطوة عامّة بلا أوزان — إحماءٌ أفقر بصمت.
  const fromPlan = Number(foldDigits(String(pe.startingWeight ?? '')).match(/[\d.]+/)?.[0])
  if (Number.isFinite(fromPlan) && fromPlan > 0) return fromPlan
  const fromHistory = Number(foldDigits(String(getRecord(pe.exerciseId)?.lastWeight ?? '')).match(/[\d.]+/)?.[0])
  return Number.isFinite(fromHistory) && fromHistory > 0 ? fromHistory : Number.NaN
}

const PCT_LABEL: Record<string, WarmupStepLabel> = {
  'البار': 'bar',
  '٤٠٪': 'pct40',
  '٦٠٪': 'pct60',
  '٨٠٪': 'pct80',
}

/**
 * يختار حركات المرونة **حتميًّا** من محتوى اليوم — نفس اليوم ⇒ نفس الحركتين دائمًا.
 *
 * الترتيب: تمارين اليوم بترتيب الخطة ← نمط الحركة أوّلًا فالعضلة ← أوّل ما لم
 * يُختَر بعد و**ليس أصلًا من تمارين اليوم**. لا عشوائية، ولا حركة خارج الكتالوج،
 * ولا اختراع عند نفاد المرشّحين: قائمة أقصر أصدق من حركة مؤلَّفة.
 */
function pickMobilityIds(day: PlanDay, dayExerciseIds: Set<string>): string[] {
  const ordered = [...day.exercises].sort((a, b) => a.order - b.order)
  const picked: string[] = []

  for (const pe of ordered) {
    if (picked.length >= WARMUP_MOBILITY_STEPS) break
    const ex = getExercise(pe.exerciseId)
    if (!ex) continue
    const candidates = [
      ...(MOBILITY_BY_PATTERN[ex.movementPattern] ?? []),
      ...(MOBILITY_BY_MUSCLE[ex.primaryMuscle] ?? []),
    ]
    for (const id of candidates) {
      if (picked.length >= WARMUP_MOBILITY_STEPS) break
      if (picked.includes(id)) continue
      // الإحماء لا يكرّر تمرينًا في اليوم نفسه — ولا يقترح معرّفًا سقط من الكتالوج.
      if (dayExerciseIds.has(id)) continue
      const drill = getExercise(id)
      if (!drill || drill.movementPattern !== 'mobility') continue
      picked.push(id)
    }
  }

  return picked
}

export interface BuildWarmupOptions {
  /** إعداد الأقراص لهذا الحساب — يُقرأ من التخزين حين لا يُمرَّر. */
  plateConfig?: PlateConfig
  /** وزن العمل المعروف — يُحقن في الإثباتات بدل قراءة التخزين. */
  workingKgFor?: (pe: PlanExercise) => number
}

/**
 * يبني إحماء الجلسة: **حركتا مرونة من الكتالوج** ثم تحميل تدريجي مشتقّ من تمارين
 * اليوم. يُرجِع خطة فارغة إن كان اليوم بلا تمارين — لا إحماء بلا تمرين يُحمى له.
 */
export function buildWarmupPlan(day: PlanDay | null | undefined, options: BuildWarmupOptions = {}): WarmupPlan {
  if (!day || day.exercises.length === 0) return EMPTY_WARMUP
  const config = options.plateConfig ?? (typeof window === 'undefined' ? defaultPlateConfig() : loadPlateConfig())
  const workingKgFor = options.workingKgFor ?? knownWorkingKg

  const steps: WarmupStep[] = []

  // ── ١) المرونة أوّلًا: الإحماء يبدأ بحركته الخاصّة، لا بتمرين اليوم ──
  const dayExerciseIds = new Set(day.exercises.map((pe) => pe.exerciseId))
  const mobilityExerciseIds = pickMobilityIds(day, dayExerciseIds)
  for (const id of mobilityExerciseIds) {
    const drill = getExercise(id)
    if (!drill) continue
    steps.push({
      kind: 'mobility',
      exerciseId: id,
      nameAr: drill.nameAr,
      nameEn: drill.nameEn,
      label: 'mobility',
      seconds: WARMUP_MOBILITY_SECONDS,
    })
  }

  // ── ٢) التحميل التدريجي: أوائل اليوم — ما سيبدأ به المستخدم فعلًا ──
  const sources = [...day.exercises]
    .sort((a, b) => a.order - b.order)
    .filter((pe) => !pe.optional)
    .slice(0, WARMUP_SOURCE_EXERCISES)
  const pool = sources.length > 0 ? sources : day.exercises.slice(0, WARMUP_SOURCE_EXERCISES)

  const sourceExerciseIds: string[] = []
  let strengthSteps = 0

  for (const pe of pool) {
    if (strengthSteps >= WARMUP_MAX_STEPS) break
    const ex = getExercise(pe.exerciseId)
    const nameAr = pe.customNameAr || ex?.nameAr || pe.exerciseId
    const nameEn = pe.customNameEn || ex?.nameEn || pe.exerciseId
    const rampable = (ex?.equipment ?? []).some((e) => RAMPABLE_EQUIPMENT.has(e))
    const working = workingKgFor(pe)

    if (rampable && Number.isFinite(working) && working > config.barKg) {
      // مجموعة العمل تُستبعد: هي أول مجموعة في الجلسة، لا خطوة إحماء.
      const ladder = generateWarmup(working, config, firstReps(pe.reps)).filter((s) => !s.isWork)
      for (const rung of ladder) {
        if (strengthSteps >= WARMUP_MAX_STEPS) break
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
        strengthSteps++
      }
      if (ladder.length > 0) {
        sourceExerciseIds.push(pe.exerciseId)
        continue
      }
    }

    // مجموعة تسخين **على** هذا التمرين — بلا وزن مقترح، فالخفّة يقدّرها صاحبها.
    // هويّتها تُعلَن في النصّ («تسخين على: …») فلا يُقرأ الجهاز كأنه الإحماء.
    steps.push({
      kind: 'light',
      exerciseId: pe.exerciseId,
      nameAr,
      nameEn,
      reps: firstReps(pe.reps),
      label: 'light',
      seconds: WARMUP_LIGHT_SECONDS,
    })
    strengthSteps++
    sourceExerciseIds.push(pe.exerciseId)
  }

  const seconds = steps.reduce((sum, s) => sum + s.seconds, 0)
  return {
    steps,
    estMinutes: steps.length === 0 ? 0 : Math.max(1, Math.round(seconds / 60)),
    sourceExerciseIds,
    mobilityExerciseIds,
  }
}
