// مولّد الخطة بقواعد ثابتة (بلا أي AI/خادم).
// يأخذ الملف الشخصي + الهدف ويولّد: أهداف، جدول تمرين، خطة أكل، التزامات، قياسات.
// محرّك التمرين (v2): يبني التقسيمة من إجابات الإعداد مباشرة — اختيار التقسيمة تلقائي،
// تصفية التمارين حسب الأدوات/نوع النادي، والمجموعات/التكرارات/الراحة حسب الهدف والخبرة.

import type {
  ActivityLevel,
  ExperienceBand,
  GoalType,
  MuscleFocus,
  PlannedSplit,
  Profile,
  Targets,
  TrainingLevel,
} from '@/types/profile'
import type { CommitmentPlan } from '@/types/progress'
import type { MeasurementPlan } from '@/types/progress'
import type { NutritionPlan, PlanMeal } from '@/types/nutrition'
import type { Exercise, Muscle, MovementPattern, PlanDay, PlanExercise, WorkoutPlan } from '@/types/workout'
import type { RoutineDay } from '@/types'
import type { RoutineRow } from '@/lib/customization'
import type { Lang } from '@/lib/appPreferences'
import { computeTargets, calorieGoalFromGoalType, goalTypeLabel } from '@/lib/calculators'
import { exercises, getExercise } from '@/data/exercises'
import { getTemplate } from '@/data/workoutTemplates'
import { workoutDayNameAr, workoutDayNameEn } from '@/lib/workoutDayLabel'
import { createPlanMealFromTemplate, planTotals } from '@/lib/nutritionPlan'
import { createPlanCommitment } from '@/lib/commitmentPlan'
import { templateAllowedForDiet, dietRestrictsSources } from '@/lib/dietFilter'
import { getMealTemplate, mealTemplates } from '@/data/mealTemplates'
import type { DietPattern } from '@/types/onboarding'

export interface GeneratedPlan {
  targets: Targets
  suggestedWorkoutTemplateId: string
  weeklySchedule: RoutineRow[]
  workoutPlan: WorkoutPlan
  nutritionPlan: NutritionPlan
  commitmentPlan: CommitmentPlan
  measurementPlan: MeasurementPlan
  explanationAr: string
  planLabelAr: string
  warningsAr: string[]
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/** مستوى التدريب من مدّة الخبرة. */
export function levelFromExperience(band?: ExperienceBand): TrainingLevel {
  if (band === 'lt1m' || band === '1to6m') return 'beginner'
  if (band === '6to12m' || band === '1to2y') return 'intermediate'
  if (band === 'gt2y') return 'advanced'
  return 'intermediate'
}

/** مستوى النشاط مشتقّ من عدد أيام التمرين. */
export function deriveActivityLevel(days: number): ActivityLevel {
  if (days <= 2) return 'light'
  if (days <= 4) return 'moderate'
  if (days <= 6) return 'active'
  return 'very_active'
}

/** وزن هدف منطقي مشتقّ من الوزن والهدف (حين لا يُسأل عنه صراحةً). */
export function deriveTargetWeight(weightKg: number, gt: GoalType): number {
  if (gt === 'cutting') return Math.round(weightKg * 0.92)
  if (gt === 'bulking') return Math.round(weightKg * 1.05)
  return weightKg // recomposition / health / maintenance / returning
}

// ============================================================================
// محرّك التقسيمة (Split Engine)
// ============================================================================

/** درجة الخبرة الفعلية (أربع درجات): تُشتقّ من مدّة الخبرة أو مستوى التدريب. */
type ExpTier = 'beginner' | 'novice' | 'intermediate' | 'advanced'

function expTier(p: Profile): ExpTier {
  switch (p.experienceBand) {
    case 'lt1m':
    case '1to6m':
      return 'beginner'
    case '6to12m':
      return 'novice'
    case '1to2y':
      return 'intermediate'
    case 'gt2y':
      return 'advanced'
    default:
      if (p.trainingLevel === 'beginner') return 'beginner'
      if (p.trainingLevel === 'advanced') return 'advanced'
      return 'intermediate'
  }
}

/** العدد الأساسي للتمارين حسب الخبرة (قبل تعديل مدّة الجلسة). */
function exercisesPerSession(tier: ExpTier): number {
  switch (tier) {
    case 'beginner':
      return 5 // 4–5
    case 'novice':
      return 5
    case 'intermediate':
      return 6 // 5–6
    case 'advanced':
      return 6
  }
}

/**
 * عدد تمارين الجلسة: الأساس من الخبرة، ثم تعديل بحجم العمل حسب مدّة الجلسة.
 * 30=أقل، 45=متوسط، 60=قياسي، 75=أكثر، 90+=أعلى حجم. (يضمن 30 < 75+).
 */
function targetExerciseCount(tier: ExpTier, sessionMinutes: number): number {
  const base = exercisesPerSession(tier)
  const m = sessionMinutes > 0 ? sessionMinutes : 60
  let delta: number
  if (m <= 30) delta = -2
  else if (m <= 45) delta = -1
  else if (m <= 60) delta = 0
  else if (m <= 75) delta = 1
  else delta = 2
  return clamp(base + delta, 3, 9)
}

const COMPOUND_PATTERNS = new Set<MovementPattern>(['squat', 'hinge', 'push', 'pull', 'lunge'])

type ExRole = 'compound' | 'isolation'
function exerciseRole(ex: Exercise): ExRole {
  return COMPOUND_PATTERNS.has(ex.movementPattern) ? 'compound' : 'isolation'
}

/** عدد المجموعات حسب الخبرة ونوع التمرين. */
function setsFor(tier: ExpTier, role: ExRole): number {
  switch (tier) {
    case 'beginner':
    case 'novice':
      return 3
    case 'intermediate':
      return role === 'compound' ? 4 : 3
    case 'advanced':
      return 4
  }
}

/** نظام التكرارات والراحة حسب الهدف ونوع التمرين. */
interface RepScheme {
  compoundReps: string
  isoReps: string
  compoundRest: number
  isoRest: number
}
const SCHEMES: Record<GoalType, RepScheme> = {
  bulking: { compoundReps: '6–10', isoReps: '10–12', compoundRest: 120, isoRest: 75 },
  cutting: { compoundReps: '8–12', isoReps: '12–15', compoundRest: 90, isoRest: 60 },
  recomposition: { compoundReps: '6–10', isoReps: '10–12', compoundRest: 120, isoRest: 75 },
  maintenance: { compoundReps: '8–12', isoReps: '12–15', compoundRest: 90, isoRest: 75 },
  health: { compoundReps: '8–12', isoReps: '12–15', compoundRest: 90, isoRest: 75 },
  returning: { compoundReps: '10–12', isoReps: '12–15', compoundRest: 90, isoRest: 75 },
}

/** فلتر الأدوات حسب نوع النادي (gymType). لا نولّد تمارين مستحيلة للبيئة المختارة. */
function makeEquipFilter(p: Profile): (ex: Exercise) => boolean {
  const access = p.gymAccess ?? (p.workoutEnvironment === 'home' ? 'home' : 'full')
  if (access === 'full') return () => true
  if (access === 'small') {
    // نادٍ صغير: وزن حر + أجهزة أساسية + كيبل أساسي — نستبعد المتخصّص فقط (سميث/حبل).
    const banned = new Set(['smith', 'rope'])
    return (ex) => ex.equipment.every((e) => !banned.has(e))
  }
  if (access === 'home') {
    // دمبل/بار/وزن جسم/مطاط (+ مقعد شائع منزليًا).
    const allowed = new Set(['dumbbell', 'barbell', 'bodyweight', 'band', 'bench'])
    return (ex) => ex.equipment.every((e) => allowed.has(e))
  }
  // bodyweight: وزن الجسم فقط.
  const allowed = new Set(['bodyweight'])
  return (ex) => ex.equipment.every((e) => allowed.has(e))
}

/** هل التمرين مناسب لمستوى الخبرة؟ المبتدئ/المستجد لا نعطيه تمارين متقدّمة. */
function levelOk(ex: Exercise, tier: ExpTier): boolean {
  if (tier === 'beginner' || tier === 'novice') return ex.level !== 'advanced'
  return true
}

// — تفضيل الأجهزة للمبتدئ + استبعاد الكيبل (Phase 2) —
// المبتدئ نادٍ-جديد: الأجهزة الموجّهة أأمن وأسهل ضبطًا. الكيبل (المحطّات الحرّة) دقيق ومربك له،
// فنستبعده ونبقيه للمتقدّم فقط. ملاحظة: أجهزة السحب التي تستخدم بكرة لكنها موجّهة (لات بُل داون،
// تجديف جهاز) مصنّفة machine أيضًا فلا تُعدّ «كيبلًا حرًّا» ولا تُستبعد.

/** جهاز موجّه (يحوي 'machine' ضمن أدواته). */
function isMachineExercise(ex: Exercise): boolean {
  return ex.equipment.includes('machine')
}

/** كيبل حرّ بحت: يتطلّب كيبلًا بلا بديل جهاز موجّه (مثل تفتيح كيبل، دفع ترايسبس كيبل). */
function isFreeCableExercise(ex: Exercise): boolean {
  return ex.equipment.includes('cable') && !ex.equipment.includes('machine')
}

/** هل يُسمح بهذا التمرين من ناحية الكيبل؟ الكيبل الحرّ للمتقدّم فقط. */
function cableOk(ex: Exercise, tier: ExpTier): boolean {
  return tier === 'advanced' || !isFreeCableExercise(ex)
}

/** نفضّل الأجهزة في اختيار التمارين للمبتدئ/المستجد. */
function prefersMachines(tier: ExpTier): boolean {
  return tier === 'beginner' || tier === 'novice'
}

// — تصفية الإصابات: نستبعد التمارين عالية الخطورة ونُبقي بدائل أأمن (بلا نصائح طبية) —
type InjuryArea = 'knee' | 'shoulder' | 'back'

/** يكتشف مناطق الإصابة من نص القيود (معرّفات الإعداد القياسية + التسميات العربية). */
function detectInjuries(injuries?: string): Set<InjuryArea> {
  const out = new Set<InjuryArea>()
  if (!injuries) return out
  const t = injuries.toLowerCase()
  if (/knee|ركبة|ركب/.test(t)) out.add('knee')
  if (/shoulder|كتف|أكتاف|اكتاف/.test(t)) out.add('shoulder')
  if (/back|lower_back|ظهر|عمود/.test(t)) out.add('back')
  return out
}

// تمارين نستبعدها افتراضيًا لكل إصابة — مع إبقاء بدائل أأمن لنفس المجموعة العضلية.
const INJURY_RISKY_IDS: Record<InjuryArea, ReadonlySet<string>> = {
  // الركبة: نتجنّب القرفصاء الثقيل والاندفاع العميق ومدّ الرجل؛ نُبقي ليج برس/قرفصاء خفيف والهيپ.
  knee: new Set([
    'barbell-back-squat', 'front-squat', 'hack-squat', 'smith-machine-squat', 'sissy-squat',
    'pendulum-squat', 'belt-squat', 'leg-press-narrow', 'bulgarian-split-squat', 'walking-lunge',
    'reverse-lunge', 'step-up', 'leg-extension', 'wall-sit',
  ]),
  // الكتف: نتجنّب الضغط العلوي بالبار والتجديف العمودي؛ نُبقي ضغط الدمبل/الجهاز والرفرفات.
  shoulder: new Set(['overhead-press', 'push-press', 'upright-row', 'arnold-press']),
  // الظهر: نتجنّب الهينج الثقيل المحمّل على العمود؛ نُبقي التجديف المدعوم/الجهاز والهيپ ثرَست.
  back: new Set([
    'deadlift', 'sumo-deadlift', 'stiff-leg-deadlift', 'good-morning', 'barbell-row', 't-bar-row',
    'romanian-deadlift', 'dumbbell-rdl', 'single-leg-rdl',
  ]),
}

/** يبني فلتر إصابات يستبعد التمارين عالية الخطورة للإصابات المحددة. */
function makeInjuryFilter(areas: Set<InjuryArea>): (ex: Exercise) => boolean {
  if (!areas.size) return () => true
  const banned = new Set<string>()
  for (const area of areas) for (const id of INJURY_RISKY_IDS[area]) banned.add(id)
  return (ex) => !banned.has(ex.id)
}

// — فتحات اليوم (Slots): قائمة مرتّبة بالأولوية تُملأ بأفضل تمرين متاح —
interface Slot {
  muscles: Muscle[]
  role: ExRole | 'any'
  patterns?: MovementPattern[]
}

type DayType = 'full' | 'upper' | 'lower' | 'push' | 'pull' | 'arms' | 'core'

const SLOTS: Record<DayType, Slot[]> = {
  full: [
    { muscles: ['quads'], role: 'compound', patterns: ['squat', 'lunge'] },
    { muscles: ['chest'], role: 'compound', patterns: ['push'] },
    { muscles: ['back'], role: 'compound', patterns: ['pull'] },
    { muscles: ['hamstrings', 'glutes'], role: 'compound', patterns: ['hinge'] },
    { muscles: ['shoulders'], role: 'compound', patterns: ['push'] },
    { muscles: ['core'], role: 'any' },
    { muscles: ['biceps'], role: 'isolation' },
    { muscles: ['triceps'], role: 'isolation' },
    { muscles: ['calves'], role: 'isolation' },
  ],
  upper: [
    { muscles: ['chest'], role: 'compound', patterns: ['push'] },
    { muscles: ['back'], role: 'compound', patterns: ['pull'] },
    { muscles: ['shoulders'], role: 'compound', patterns: ['push'] },
    { muscles: ['back'], role: 'compound', patterns: ['pull'] },
    { muscles: ['chest'], role: 'any' },
    { muscles: ['shoulders'], role: 'isolation' },
    { muscles: ['biceps'], role: 'isolation' },
    { muscles: ['triceps'], role: 'isolation' },
  ],
  lower: [
    { muscles: ['quads'], role: 'compound', patterns: ['squat'] },
    { muscles: ['hamstrings'], role: 'compound', patterns: ['hinge'] },
    { muscles: ['quads'], role: 'any' },
    { muscles: ['glutes'], role: 'any' },
    { muscles: ['hamstrings'], role: 'isolation' },
    { muscles: ['calves'], role: 'isolation' },
    { muscles: ['core'], role: 'any' },
  ],
  push: [
    { muscles: ['chest'], role: 'compound', patterns: ['push'] },
    { muscles: ['shoulders'], role: 'compound', patterns: ['push'] },
    { muscles: ['chest'], role: 'any' },
    { muscles: ['shoulders'], role: 'isolation' },
    { muscles: ['triceps'], role: 'isolation' },
    { muscles: ['triceps'], role: 'isolation' },
    { muscles: ['core'], role: 'any' },
  ],
  pull: [
    { muscles: ['back'], role: 'compound', patterns: ['pull'] },
    { muscles: ['back'], role: 'compound', patterns: ['pull'] },
    { muscles: ['back'], role: 'any' },
    { muscles: ['shoulders'], role: 'isolation' },
    { muscles: ['biceps'], role: 'isolation' },
    { muscles: ['biceps'], role: 'isolation' },
    { muscles: ['core'], role: 'any' },
  ],
  arms: [
    { muscles: ['shoulders'], role: 'compound', patterns: ['push'] },
    { muscles: ['shoulders'], role: 'isolation' },
    { muscles: ['biceps'], role: 'isolation' },
    { muscles: ['triceps'], role: 'isolation' },
    { muscles: ['biceps'], role: 'isolation' },
    { muscles: ['triceps'], role: 'isolation' },
    { muscles: ['shoulders'], role: 'isolation' },
  ],
  core: [
    { muscles: ['core'], role: 'any' },
    { muscles: ['core'], role: 'any' },
    { muscles: ['core'], role: 'any' },
    { muscles: ['core'], role: 'any' },
    { muscles: ['core'], role: 'any' },
    { muscles: ['core'], role: 'any' },
  ],
}

const TYPE_MUSCLES: Record<DayType, Muscle[]> = {
  full: ['quads', 'chest', 'back', 'shoulders', 'hamstrings', 'glutes', 'biceps', 'triceps', 'calves', 'core'],
  upper: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
  lower: ['quads', 'hamstrings', 'glutes', 'calves', 'core'],
  push: ['chest', 'shoulders', 'triceps'],
  pull: ['back', 'biceps', 'shoulders'],
  arms: ['biceps', 'triceps', 'shoulders'],
  core: ['core'],
}

/** ترتيب المرشّحين: الأجهزة أولًا عند تفضيلها (للمبتدئ)، ثم أبجديًا (ثبات الاختيار). */
function sortCandidates(cands: Exercise[], preferMachines: boolean): Exercise[] {
  return cands.slice().sort((a, b) => {
    if (preferMachines) {
      const rank = (ex: Exercise) => (isMachineExercise(ex) ? 0 : 1)
      const d = rank(a) - rank(b)
      if (d !== 0) return d
    }
    return a.id.localeCompare(b.id)
  })
}

/** يختار تمرينًا لفتحة معيّنة من المجمع المتاح (مع تنويع عبر variation وتجنّب التكرار). */
function pickForSlot(slot: Slot, pool: Exercise[], used: Set<string>, variation: number, preferMachines: boolean): string | undefined {
  let cands = pool.filter(
    (ex) =>
      slot.muscles.includes(ex.primaryMuscle) &&
      (slot.role === 'any' || exerciseRole(ex) === slot.role) &&
      !used.has(ex.id),
  )
  if (slot.patterns) {
    const byPattern = cands.filter((ex) => slot.patterns!.includes(ex.movementPattern))
    if (byPattern.length) cands = byPattern
  }
  if (!cands.length) return undefined
  cands = sortCandidates(cands, preferMachines)
  return cands[variation % cands.length].id
}

/** يبني قائمة معرّفات تمارين ليوم واحد. */
function buildDayExercises(type: DayType, variation: number, pool: Exercise[], target: number, preferMachines: boolean): string[] {
  const used = new Set<string>()
  const ids: string[] = []
  for (const slot of SLOTS[type]) {
    if (ids.length >= target) break
    const id = pickForSlot(slot, pool, used, variation, preferMachines)
    if (id) {
      ids.push(id)
      used.add(id)
    }
  }
  // إكمال النقص من عضلات اليوم الأساسية إن قلّت الفتحات المتاحة (بيئات محدودة الأدوات).
  if (ids.length < target) {
    const extra = sortCandidates(
      pool.filter((ex) => !used.has(ex.id) && TYPE_MUSCLES[type].includes(ex.primaryMuscle)),
      preferMachines,
    )
    for (const ex of extra) {
      if (ids.length >= target) break
      ids.push(ex.id)
      used.add(ex.id)
    }
  }
  return ids
}

// — مواصفات أيام التقسيمة (الأسماء العربية/الإنجليزية + نوع الجدول) —
interface DaySpec {
  type: DayType
  nameAr: string
  nameEn: string
  routineType: RoutineDay['type']
}

const AR_NUM = ['', '١', '٢', '٣', '٤', '٥', '٦', '٧']

// اسم التقسيمة الأساسي فقط — رقم اليوم يُضاف لاحقًا عبر workoutDayName* («اليوم N · جسم كامل»).
function fullDay(): DaySpec {
  return { type: 'full', nameAr: 'جسم كامل', nameEn: 'Full Body', routineType: 'full' }
}
function ulDay(kind: 'upper' | 'lower', n: number): DaySpec {
  return kind === 'upper'
    ? { type: 'upper', nameAr: `علوي ${AR_NUM[n]}`, nameEn: `Upper ${n}`, routineType: 'full' }
    : { type: 'lower', nameAr: `سفلي ${AR_NUM[n]}`, nameEn: `Lower ${n}`, routineType: 'legs' }
}
function pplDay(kind: 'push' | 'pull' | 'legs', n: number): DaySpec {
  if (kind === 'push') return { type: 'push', nameAr: `دفع ${AR_NUM[n]}`, nameEn: `Push ${n}`, routineType: 'push' }
  if (kind === 'pull') return { type: 'pull', nameAr: `سحب ${AR_NUM[n]}`, nameEn: `Pull ${n}`, routineType: 'pull' }
  return { type: 'lower', nameAr: `أرجل ${AR_NUM[n]}`, nameEn: `Legs ${n}`, routineType: 'legs' }
}
function focusDay(focus?: MuscleFocus): DaySpec {
  switch (focus) {
    case 'lower':
      return { type: 'lower', nameAr: 'أرجل (مركّز)', nameEn: 'Legs (Focus)', routineType: 'legs' }
    case 'upper':
    case 'chest':
    case 'back':
    case 'shoulders':
      return { type: 'upper', nameAr: 'علوي (مركّز)', nameEn: 'Upper (Focus)', routineType: 'full' }
    case 'core':
      return { type: 'core', nameAr: 'بطن وكور', nameEn: 'Core', routineType: 'cardio' }
    case 'arms':
    default:
      return { type: 'arms', nameAr: 'ذراعين وأكتاف', nameEn: 'Arms & Shoulders', routineType: 'push' }
  }
}

/** يختار التقسيمة تلقائيًا حسب عدد أيام التمرين (والتركيز عند 5 أيام). */
function splitDays(days: number, focus?: MuscleFocus): DaySpec[] {
  const d = clamp(days, 1, 7)
  if (d <= 2) return Array.from({ length: d }, () => fullDay())
  if (d === 3) return [fullDay(), fullDay(), fullDay()]
  if (d === 4) return [ulDay('upper', 1), ulDay('lower', 1), ulDay('upper', 2), ulDay('lower', 2)]
  if (d === 5) return [ulDay('upper', 1), ulDay('lower', 1), ulDay('upper', 2), ulDay('lower', 2), focusDay(focus)]
  if (d === 6)
    return [pplDay('push', 1), pplDay('pull', 1), pplDay('legs', 1), pplDay('push', 2), pplDay('pull', 2), pplDay('legs', 2)]
  // 7 أيام: PPL ×2 + يوم جسم كامل إضافي.
  return [
    pplDay('push', 1),
    pplDay('pull', 1),
    pplDay('legs', 1),
    pplDay('push', 2),
    pplDay('pull', 2),
    pplDay('legs', 2),
    { type: 'full', nameAr: 'جسم كامل', nameEn: 'Full Body', routineType: 'full' },
  ]
}

function splitId(days: number): string {
  const d = clamp(days, 1, 7)
  if (d <= 3) return 'gen-fullbody'
  if (d === 4) return 'gen-upper-lower-4'
  if (d === 5) return 'gen-upper-lower-5'
  if (d === 6) return 'gen-ppl-6'
  return 'gen-ppl-7'
}

// — التقسيمة المتقدّمة (اختيار المستخدم يتجاوز التلقائي عند الجدولة الصالحة) —
// دورة أنواع الأيام لكل تقسيمة؛ تتكرّر لملء عدد الأيام المختار.
const ADVANCED_CYCLES: Record<PlannedSplit, DayType[]> = {
  full_body: ['full'],
  upper_lower: ['upper', 'lower'],
  push_pull_legs: ['push', 'pull', 'lower'],
  arnold: ['upper', 'arms', 'lower'], // صدر-ظهر / كتف-ذراع / أرجل (تقريب على محرّك الفتحات)
  bro_split: ['push', 'pull', 'arms', 'lower'], // صدر / ظهر / كتف-ذراع / أرجل (تقريب)
}

const ADVANCED_SPLIT_ID: Record<PlannedSplit, string> = {
  full_body: 'gen-adv-fullbody',
  upper_lower: 'gen-adv-upper-lower',
  push_pull_legs: 'gen-adv-ppl',
  arnold: 'gen-adv-arnold',
  bro_split: 'gen-adv-bro',
}

function advancedDaySpec(split: PlannedSplit, type: DayType, n: number): DaySpec {
  switch (type) {
    case 'full':
      return fullDay()
    case 'upper':
      return ulDay('upper', n)
    case 'push':
      return pplDay('push', n)
    case 'pull':
      return pplDay('pull', n)
    case 'arms':
      return { type: 'arms', nameAr: `ذراعين وأكتاف ${AR_NUM[n] ?? ''}`.trim(), nameEn: `Arms & Shoulders ${n}`, routineType: 'push' }
    case 'core':
      return focusDay('core')
    case 'lower':
      // «سفلي» في تقسيمة علوي/سفلي، و«أرجل» في PPL/أرنولد/برو.
      return split === 'upper_lower' ? ulDay('lower', n) : pplDay('legs', n)
  }
}

/** يبني مواصفات أيام تقسيمة متقدّمة، أو null إن لم تكن قابلة للجدولة لعدد الأيام. */
function advancedSplitDays(days: number, split: PlannedSplit): DaySpec[] | null {
  const cycle = ADVANCED_CYCLES[split]
  const d = clamp(days, 1, 7)
  if (!cycle || d < cycle.length) return null // أقل من دورة كاملة → غير صالح، نرجع للتلقائي
  const counts: Record<string, number> = {}
  return Array.from({ length: d }, (_, i) => {
    const type = cycle[i % cycle.length]
    counts[type] = (counts[type] ?? 0) + 1
    return advancedDaySpec(split, type, counts[type])
  })
}

const SPLIT_TITLES: Record<string, { ar: string; en: string }> = {
  'gen-fullbody': { ar: 'جسم كامل', en: 'Full Body' },
  'gen-upper-lower-4': { ar: 'علوي / سفلي', en: 'Upper / Lower' },
  'gen-upper-lower-5': { ar: 'علوي / سفلي + يوم مركّز', en: 'Upper / Lower + Focus' },
  'gen-ppl-6': { ar: 'دفع / سحب / أرجل ×٢', en: 'Push / Pull / Legs ×2' },
  'gen-ppl-7': { ar: 'دفع / سحب / أرجل ×٢ + إضافي', en: 'Push / Pull / Legs ×2 + Extra' },
  'gen-adv-fullbody': { ar: 'جسم كامل (اختيارك)', en: 'Full Body (your choice)' },
  'gen-adv-upper-lower': { ar: 'علوي / سفلي (اختيارك)', en: 'Upper / Lower (your choice)' },
  'gen-adv-ppl': { ar: 'دفع / سحب / أرجل (اختيارك)', en: 'Push / Pull / Legs (your choice)' },
  'gen-adv-arnold': { ar: 'تقسيمة أرنولد (اختيارك)', en: 'Arnold Split (your choice)' },
  'gen-adv-bro': { ar: 'عضلة باليوم (اختيارك)', en: 'Bro Split (your choice)' },
}

/** اسم الخطة للعرض — يدعم تقسيمات المحرّك الجديدة والقوالب القديمة. */
export function planTitle(templateId: string, lang: Lang = 'ar'): string {
  const m = SPLIT_TITLES[templateId]
  if (m) return lang === 'en' ? m.en : m.ar
  const tpl = getTemplate(templateId)
  if (tpl) return lang === 'en' ? tpl.nameEn : tpl.nameAr
  return lang === 'en' ? 'Custom plan' : 'جدول مخصّص'
}

/** يبني عنصر خطة بمجموعات/تكرارات/راحة حسب الهدف والخبرة. */
function createGenExercise(exerciseId: string, dayId: string, order: number, tier: ExpTier, gt: GoalType): PlanExercise {
  const ex = getExercise(exerciseId)
  const role: ExRole = ex ? exerciseRole(ex) : 'isolation'
  const scheme = SCHEMES[gt] ?? SCHEMES.maintenance
  const isCardio = ex?.movementPattern === 'cardio'
  // التمارين المؤقّتة (ثوانٍ/دقائق) والكور نُبقي تكراراتها الافتراضية الطبيعية.
  const keepDefaultReps =
    isCardio || ex?.movementPattern === 'core' || ex?.primaryMuscle === 'core' || /[ثد]/.test(ex?.defaultReps ?? '')
  return {
    id: `${dayId}-${exerciseId}-${order}`,
    exerciseId,
    sets: isCardio ? 1 : setsFor(tier, role),
    reps: keepDefaultReps ? ex?.defaultReps ?? '8–12' : role === 'compound' ? scheme.compoundReps : scheme.isoReps,
    restSec: isCardio ? 0 : role === 'compound' ? scheme.compoundRest : scheme.isoRest,
    startingWeight: '',
    notes: '',
    order,
  }
}

/** يضيف عنصر كارديو ليومين أسبوعيًا (هدف التنشيف). */
function addCutCardio(planDays: PlanDay[], equipOk: (ex: Exercise) => boolean): void {
  const cardio = exercises
    .filter((ex) => ex.primaryMuscle === 'cardio' && equipOk(ex))
    .sort((a, b) => a.id.localeCompare(b.id))
  if (!cardio.length || !planDays.length) return
  const idxs = planDays.length >= 2 ? [0, Math.min(planDays.length - 1, Math.floor(planDays.length / 2))] : [0]
  const unique = [...new Set(idxs)]
  unique.forEach((dayIdx, k) => {
    const day = planDays[dayIdx]
    const ex = cardio[k % cardio.length]
    if (day.exercises.some((pe) => pe.exerciseId === ex.id)) return
    day.exercises.push({
      id: `${day.id}-${ex.id}-cardio`,
      exerciseId: ex.id,
      sets: 1,
      reps: ex.defaultReps,
      restSec: 0,
      startingWeight: '',
      notes: 'كارديو لزيادة الحرق (هدف التنشيف).',
      order: day.exercises.length,
    })
  })
}

/** يبني خطة التمرين كاملة من بيانات الملف الشخصي (تقسيمة + تمارين). */
function generateWorkoutPlan(p: Profile): { plan: WorkoutPlan; specs: DaySpec[] } {
  const days = clamp(p.trainingDays, 1, 7)
  // التقسيمة المتقدّمة (اختيار المستخدم) تتجاوز التلقائي متى كانت قابلة للجدولة.
  const advanced =
    p.splitMode === 'advanced' && p.splitChoice ? advancedSplitDays(days, p.splitChoice) : null
  const specs = advanced ?? splitDays(days, p.muscleFocus)
  const templateId = advanced && p.splitChoice ? ADVANCED_SPLIT_ID[p.splitChoice] : splitId(days)
  const tier = expTier(p)
  const target = targetExerciseCount(tier, p.workoutDuration)
  const equipOk = makeEquipFilter(p)
  const injuryOk = makeInjuryFilter(detectInjuries(p.injuries))
  const preferMachines = prefersMachines(tier)
  const pool = exercises.filter(
    (ex) =>
      equipOk(ex) &&
      injuryOk(ex) &&
      cableOk(ex, tier) && // الكيبل الحرّ للمتقدّم فقط — نستبعده للمبتدئ
      ex.movementPattern !== 'mobility' &&
      ex.primaryMuscle !== 'cardio' &&
      levelOk(ex, tier),
  )

  const counts: Record<string, number> = {}
  const planDays: PlanDay[] = specs.map((spec, di) => {
    const variation = counts[spec.type] ?? 0
    counts[spec.type] = variation + 1
    const dayId = `gen-${di + 1}-${spec.type}`
    const ids = buildDayExercises(spec.type, variation, pool, target, preferMachines)
    return {
      id: dayId,
      nameAr: workoutDayNameAr(spec.nameAr, di),
      nameEn: workoutDayNameEn(spec.nameEn, di),
      exercises: ids.map((id, i) => createGenExercise(id, dayId, i, tier, p.goalType)),
    }
  })

  if (p.goalType === 'cutting') addCutCardio(planDays, equipOk)

  return { plan: { templateId, days: planDays }, specs }
}

const WEEKDAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']
// توزيع أيام التمرين على الأسبوع (فهارس الأيام المدرَّبة)
const TRAIN_PATTERN: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
}

/** يحسب فهارس أيام التمرين خلال الأسبوع (من تفضيل المستخدم أو النمط الافتراضي). */
function trainingIndexes(days: number, preferredDays?: number[]): number[] {
  if (preferredDays && preferredDays.length) {
    const idx = [...new Set(preferredDays)]
      .filter((i) => i >= 0 && i < 7)
      .sort((a, b) => a - b)
      .slice(0, days)
    if (idx.length < days) {
      for (const i of TRAIN_PATTERN[days] ?? []) {
        if (idx.length >= days) break
        if (!idx.includes(i)) idx.push(i)
      }
      idx.sort((a, b) => a - b)
    }
    return idx
  }
  return TRAIN_PATTERN[days] ?? TRAIN_PATTERN[3]
}

function dayType(nameEn: string): RoutineRow['type'] {
  const n = nameEn.toLowerCase()
  if (n.includes('push')) return 'push'
  if (n.includes('pull')) return 'pull'
  if (n.includes('leg') || n.includes('lower')) return 'legs'
  if (n.includes('cardio')) return 'cardio'
  return 'full'
}

/** يبني جدولًا أسبوعيًا من مواصفات التقسيمة المولّدة. */
function buildScheduleFromSpecs(specs: DaySpec[], trainingDays: number, preferredDays?: number[]): RoutineRow[] {
  const days = clamp(trainingDays, 1, 7)
  const trainIdx = trainingIndexes(days, preferredDays)
  const rows: RoutineRow[] = []
  let c = 0
  WEEKDAYS.forEach((d, i) => {
    if (specs.length && trainIdx.includes(i)) {
      const spec = specs[c % specs.length]
      rows.push({ day: d, title: workoutDayNameAr(spec.nameAr, c % specs.length), type: spec.routineType })
      c++
    } else {
      rows.push({ day: d, title: 'راحة واستشفاء', type: 'rest' })
    }
  })
  return rows
}

/** (إرث) يبني جدولًا أسبوعيًا من قالب جاهز — يُستخدم في مسار «اختيار جدول آخر». */
export function buildWeeklySchedule(templateId: string, trainingDays: number, preferredDays?: number[]): RoutineRow[] {
  const tpl = getTemplate(templateId)
  const days = clamp(trainingDays, 1, 7)
  const trainIdx = trainingIndexes(days, preferredDays)
  const rows: RoutineRow[] = []
  let c = 0
  WEEKDAYS.forEach((d, i) => {
    if (tpl && trainIdx.includes(i)) {
      const td = tpl.days[c % tpl.days.length]
      rows.push({ day: d, title: workoutDayNameAr(td.nameAr, c % tpl.days.length), type: dayType(td.nameEn) })
      c++
    } else {
      rows.push({ day: d, title: 'راحة واستشفاء', type: 'rest' })
    }
  })
  return rows
}

// ============================================================================
// التغذية والالتزامات والقياسات (بلا تغيير منطقي)
// ============================================================================

const STYLE_TEMPLATES: Record<Profile['nutritionStyle'], { breakfast: string; lunch: string; dinner: string; snack: string }> = {
  simple: { breakfast: 'eggs-and-bread', lunch: 'chicken-rice', dinner: 'light-dinner', snack: 'greek-yogurt-snack' },
  high_protein: { breakfast: 'high-protein-breakfast', lunch: 'chicken-rice', dinner: 'salmon-quinoa', snack: 'greek-yogurt-snack' },
  saudi: { breakfast: 'fava-bread-breakfast', lunch: 'kabsa-chicken', dinner: 'light-dinner', snack: 'nuts-dates-snack' },
  economical: { breakfast: 'oats-and-whey', lunch: 'chicken-rice', dinner: 'beef-rice', snack: 'tuna-sandwich' },
  flexible: { breakfast: 'oats-and-whey', lunch: 'chicken-sweet-potato', dinner: 'light-dinner', snack: 'cottage-fruit' },
}

// — توزيع حجم الوجبات (P2.5): أوزان نسبية لكل فتحة حسب تفضيل المستخدم —
// ترتيب الفتحات: فطور، غداء، عشاء، سناك، شيك بروتين (يطابق ترتيب slots أدناه).
const SLOT_BASE_WEIGHT = [1, 1, 1, 0.55, 0.45]
type Timing = NonNullable<Profile['appetiteTiming']>
type Distribution = NonNullable<Profile['mealDistribution']>
// وقت الجوع: الصباح يثقّل الوجبات الباكرة، المساء يثقّل العشاء.
const TIMING_WEIGHT: Record<Timing, number[]> = {
  balanced: [1, 1, 1, 1, 1],
  morning: [1.3, 1.1, 0.75, 1.05, 0.9],
  evening: [0.75, 0.95, 1.35, 1.05, 1.15],
}
// توزيع الحجم: «أكبر وأقل» يركّز في الرئيسية ويصغّر السناك؛ «أصغر وأكثر» يكبّر السناك.
const DISTRIBUTION_WEIGHT: Record<Distribution, number[]> = {
  balanced: [1, 1, 1, 1, 1],
  fewer_larger: [1.15, 1.15, 1.15, 0.5, 0.45],
  more_smaller: [0.95, 0.95, 0.95, 1.35, 1.3],
}

/**
 * يعيد توزيع السعرات على الوجبات حسب تفضيل الحجم/الوقت (P2.5) مع تثبيت الإجمالي على
 * السعرات المستهدفة (لا مضاعفة احتساب — المجموع يبقى = targetCalories تقريبًا).
 */
function redistributeMeals(meals: PlanMeal[], targetCalories: number, timing: Timing, dist: Distribution): PlanMeal[] {
  if (!meals.length || targetCalories <= 0) return meals
  const weights = meals.map((_, i) => {
    const idx = Math.min(i, SLOT_BASE_WEIGHT.length - 1)
    return SLOT_BASE_WEIGHT[idx] * TIMING_WEIGHT[timing][idx] * DISTRIBUTION_WEIGHT[dist][idx]
  })
  const sum = weights.reduce((a, b) => a + b, 0)
  if (sum <= 0) return meals
  return meals.map((m, i) => {
    const perMeal = targetCalories * (weights[i] / sum)
    const base = m.calories > 0 ? m.calories : 1
    const factor = Math.max(0.4, Math.min(2.4, perMeal / base))
    return {
      ...m,
      calories: Math.round(m.calories * factor),
      protein: Math.round(m.protein * factor),
      carbs: Math.round(m.carbs * factor),
      fat: Math.round(m.fat * factor),
    }
  })
}

/**
 * يختار قالب وجبة متوافقًا مع النمط الغذائي. إن كان القالب المفضّل مخالفًا (مثل دجاج لنباتي)
 * نستبدله بأفضل بديل متوافق من نفس نوع الوجبة (الأعلى بروتينًا)؛ وإلا نُبقي المفضّل.
 */
function pickTemplateForDiet(preferredId: string, dietPattern: DietPattern | undefined): string {
  const preferred = getMealTemplate(preferredId)
  if (!preferred || !dietRestrictsSources(dietPattern)) return preferredId
  if (templateAllowedForDiet(preferred, dietPattern)) return preferredId
  const byProtein = (a: { protein: number }, b: { protein: number }) => b.protein - a.protein
  const compliant = mealTemplates
    .filter((t) => templateAllowedForDiet(t, dietPattern))
    .map((t) => ({ id: t.id, mealType: t.mealType, protein: createPlanMealFromTemplate(t.id, 0).protein }))
  // فضّل نفس نوع الوجبة؛ وإن لم يوجد بديل متوافق من النوع نفسه، اختر أعلى بديل متوافق من أي نوع.
  const sameType = compliant.filter((t) => t.mealType === preferred.mealType).sort(byProtein)
  if (sameType.length) return sameType[0].id
  const any = [...compliant].sort(byProtein)
  return any.length ? any[0].id : preferredId
}

/** يولّد خطة أكل تقريبية من الأهداف والتفضيلات (يحاول الاقتراب من السعرات/البروتين). */
export function generateNutrition(p: Profile, targets: Targets): { plan: NutritionPlan; warning?: string } {
  const goal = calorieGoalFromGoalType(p.goalType)
  const targetCalories =
    targets.targetCalories ||
    (goal === 'cut' ? targets.cuttingCalories : goal === 'bulk' ? targets.bulkingCalories : targets.maintenanceCalories)
  // أسلوب العرض من الإعداد — افتراضيًا اقتراح وجبات للحفاظ على سلوك المستخدمين الحاليين.
  const displayStyle = p.nutritionDisplayStyle ?? 'meal_suggestions'
  const mealsCount = Math.max(3, Math.min(5, p.mealsPerDay))

  // ماكروز فقط / إرشاد مبسّط: لا نفرض اقتراح وجبات — نكتفي بالأهداف + التسجيل (لا بيانات وهمية).
  if (displayStyle !== 'meal_suggestions') {
    const plan: NutritionPlan = {
      enabled: p.trackNutrition,
      targetCalories,
      targetProtein: targets.proteinGrams,
      targetCarbs: targets.carbsGrams,
      targetFat: targets.fatGrams,
      targetWaterLiters: targets.waterLiters,
      meals: [],
      style: displayStyle,
      mealsPerDay: p.mealsPerDay,
    }
    return { plan }
  }

  const s = STYLE_TEMPLATES[p.nutritionStyle] ?? STYLE_TEMPLATES.high_protein

  // اقتراح الوجبات يُبنى حسب عدد الوجبات من الإعداد (meals_per_day).
  const slots: string[] = [s.breakfast, s.lunch, s.dinner]
  if (mealsCount >= 4) slots.push(s.snack)
  if (mealsCount >= 5) slots.push('protein-shake')

  // احترام النمط الغذائي: استبدل أي قالب مخالف (لحم/سمك) ببديل متوافق من نفس النوع.
  const dietPattern = p.dietPattern
  let meals: PlanMeal[] = slots
    .map((id) => pickTemplateForDiet(id, dietPattern))
    .map((id, i) => createPlanMealFromTemplate(id, i))

  // توزيع حجم الوجبات حسب تفضيل المستخدم (P2.5): عند اختيار توزيع/وقت جوع غير «متوازن»
  // نعيد توزيع السعرات على الوجبات (مع تثبيت الإجمالي)؛ غير ذلك نُبقي السلوك الموحّد القديم.
  const timing: Timing = p.appetiteTiming ?? 'balanced'
  const dist: Distribution = p.mealDistribution ?? 'balanced'
  if (timing !== 'balanced' || dist !== 'balanced') {
    meals = redistributeMeals(meals, targetCalories, timing, dist)
  } else {
    // المسار القديم: محاولة تقريب السعرات ضمن ±10% عبر معامل قياس موحّد على الماكروز.
    const totals0 = planTotals(meals)
    if (totals0.calories > 0) {
      const factor = targetCalories / totals0.calories
      const clamped = Math.max(0.6, Math.min(1.6, factor)) // لا نبالغ في التحجيم
      if (Math.abs(factor - 1) > 0.1) {
        meals = meals.map((m) => ({
          ...m,
          calories: Math.round(m.calories * clamped),
          protein: Math.round(m.protein * clamped),
          carbs: Math.round(m.carbs * clamped),
          fat: Math.round(m.fat * clamped),
        }))
      }
    }
  }

  const totals = planTotals(meals)
  const within =
    targetCalories > 0 && Math.abs(totals.calories - targetCalories) / targetCalories <= 0.12 &&
    targets.proteinGrams > 0 && Math.abs(totals.protein - targets.proteinGrams) / targets.proteinGrams <= 0.15

  const plan: NutritionPlan = {
    enabled: p.trackNutrition,
    targetCalories,
    targetProtein: targets.proteinGrams,
    targetCarbs: targets.carbsGrams,
    targetFat: targets.fatGrams,
    targetWaterLiters: targets.waterLiters,
    meals,
    style: displayStyle,
    mealsPerDay: p.mealsPerDay,
  }
  return { plan, warning: within ? undefined : 'هذه أمثلة وجبات مبدئية وليست خطة كاملة مطابقة للأهداف.' }
}

const COMMITMENTS_BY_GOAL: Record<GoalType, string[]> = {
  cutting: ['today-workout', 'steps-10k', 'water-target', 'sleep-7h', 'protein-target'],
  bulking: ['today-workout', 'protein-target', 'calories-target', 'sleep-7h', 'post-workout-meal'],
  returning: ['today-workout', 'stretching', 'light-walk', 'water-target', 'sleep-7h'],
  health: ['today-workout', 'steps-10k', 'water-target', 'sleep-7h', 'vegetables'],
  maintenance: ['today-workout', 'protein-target', 'water-target', 'sleep-7h', 'steps-10k'],
  recomposition: ['today-workout', 'protein-target', 'steps-10k', 'water-target', 'sleep-7h'],
}

export function generateCommitments(gt: GoalType): CommitmentPlan {
  const ids = COMMITMENTS_BY_GOAL[gt] ?? COMMITMENTS_BY_GOAL.health
  return { enabled: true, items: ids.map((id, i) => createPlanCommitment(id, i)) }
}

/** الخطة الافتراضية للقياسات (بدون «المزاج»). */
export function defaultMeasurementPlan(): MeasurementPlan {
  return { enabled: true, selectedTypeIds: ['weightKg', 'waistCm', 'bodyFatPercent'] }
}

// عضلات كل تركيز — لزيادة حجم العمل عليها.
const FOCUS_MUSCLES: Record<MuscleFocus, Muscle[]> = {
  balanced: [],
  upper: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
  lower: ['quads', 'hamstrings', 'glutes', 'calves'],
  core: ['core'],
  chest: ['chest'],
  back: ['back'],
  shoulders: ['shoulders'],
  arms: ['biceps', 'triceps'],
}

/** يزيد مجموعة واحدة على تمارين العضلات المستهدفة (توزيع حجم العمل). */
function applyMuscleFocus(plan: WorkoutPlan, focus: MuscleFocus): WorkoutPlan {
  const muscles = FOCUS_MUSCLES[focus] ?? []
  if (!muscles.length) return plan
  const set = new Set(muscles)
  return {
    ...plan,
    days: plan.days.map((d) => ({
      ...d,
      exercises: d.exercises.map((pe) => {
        const ex = getExercise(pe.exerciseId)
        if (ex && set.has(ex.primaryMuscle) && pe.sets < 5) return { ...pe, sets: pe.sets + 1 }
        return pe
      }),
    })),
  }
}

/** رجوع بعد انقطاع: تخفيف حجم الأسبوع الأول (مجموعة أقل، حد أدنى مجموعتان). */
function applyDeload(plan: WorkoutPlan): WorkoutPlan {
  return {
    ...plan,
    days: plan.days.map((d) => ({
      ...d,
      exercises: d.exercises.map((pe) => ({ ...pe, sets: Math.max(2, pe.sets - 1) })),
    })),
  }
}

/** اسم/وسم الخطة المختصر. */
export function planLabel(p: Profile, templateId: string): string {
  const days = clamp(p.trainingDays, 1, 7)
  return `خطة ${goalTypeLabel(p.goalType)} · ${days} أيام · ${planTitle(templateId, 'ar')}`
}

/** المولّد الكامل. */
export function generatePlan(profile: Profile): GeneratedPlan {
  const p: Profile = { ...profile, goal: calorieGoalFromGoalType(profile.goalType) }
  const targets = computeTargets(p)
  // بداية متحفّظة: الرجوع بعد انقطاع أو الانتظام المتقطّع → حجم أسبوع أوّل أخفّ.
  const isConservativeStart =
    p.goalType === 'returning' || p.consistency === 'returning' || p.consistency === 'onoff'

  const { plan, specs } = generateWorkoutPlan(p)
  let workoutPlan = plan
  workoutPlan = applyMuscleFocus(workoutPlan, p.muscleFocus ?? 'balanced')
  if (isConservativeStart) workoutPlan = applyDeload(workoutPlan)

  const weeklySchedule = buildScheduleFromSpecs(specs, p.trainingDays, p.preferredDays)
  const { plan: nutritionPlan, warning: nutritionWarning } = generateNutrition(p, targets)

  const warnings: string[] = []
  if (isConservativeStart) warnings.push('بدأنا بحجم أخفّ هذا الأسبوع لبداية آمنة — زِد تدريجيًا بعدها.')
  if (p.trainingLevel === 'beginner' && p.trainingDays >= 5) {
    warnings.push('للمبتدئ ننصح بـ3–4 أيام في البداية لبناء الالتزام والاستشفاء.')
  }
  // تنبيه عند تصفية الإصابات: استبعدنا تمارين عالية الخطورة واخترنا بدائل أأمن.
  const injuryAreas = detectInjuries(p.injuries)
  if (injuryAreas.size) {
    warnings.push('راعينا الإصابات المحددة باستبعاد تمارين عالية الخطورة واختيار بدائل أأمن لنفس العضلات.')
  }
  // فحص تكرار الأرجل: القاعدة مضمونة في التلقائي؛ هنا ننبّه إذا اختار المستخدم تقسيمة متقدّمة تدرّب الأرجل أقل من مرّتين.
  const legDays = weeklySchedule.filter((d) => d.type === 'legs' || d.type === 'full').length
  if (p.splitMode === 'advanced' && p.splitChoice && legDays < 2) {
    warnings.push('تقسيمتك المختارة تدرّب الأرجل أقل من مرّتين أسبوعيًا — فكّر بزيادة الأيام أو تقسيمة أخرى.')
  } else if ((p.goalType === 'bulking' || p.goalType === 'recomposition') && p.trainingDays >= 4 && legDays < 2) {
    warnings.push('تأكد من تدريب الأرجل مرتين أسبوعيًا على الأقل في خطط التضخيم.')
  }
  if (nutritionWarning) warnings.push(nutritionWarning)

  const levelAr = p.trainingLevel === 'beginner' ? 'مبتدئ' : p.trainingLevel === 'intermediate' ? 'متوسط' : 'متقدّم'
  const envAr = p.workoutEnvironment === 'home' ? ' في المنزل' : ''
  const explanationAr = `اخترنا تقسيمة «${planTitle(workoutPlan.templateId, 'ar')}» تلقائيًا لأنك ${goalTypeLabel(p.goalType)} بمستوى ${levelAr} و${clamp(p.trainingDays, 1, 7)} أيام تمرين${envAr}.`

  return {
    targets,
    suggestedWorkoutTemplateId: workoutPlan.templateId,
    weeklySchedule,
    workoutPlan,
    nutritionPlan,
    commitmentPlan: generateCommitments(p.goalType),
    measurementPlan: defaultMeasurementPlan(),
    explanationAr,
    planLabelAr: planLabel(p, workoutPlan.templateId),
    warningsAr: warnings,
  }
}
