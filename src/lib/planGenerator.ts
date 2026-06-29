// مولّد الخطة بقواعد ثابتة (بلا أي AI/خادم).
// يأخذ الملف الشخصي + الهدف ويولّد: أهداف، جدول تمرين، خطة أكل، التزامات، قياسات.
// محرّك التمرين (v2): يبني التقسيمة من إجابات الإعداد مباشرة — اختيار التقسيمة تلقائي،
// تصفية التمارين حسب الأدوات/نوع النادي، والمجموعات/التكرارات/الراحة حسب الهدف والخبرة.

import type {
  ActivityLevel,
  AdvancedSplit,
  ExperienceBand,
  GoalType,
  MuscleFocus,
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
import { createPlanMealFromTemplate, planTotals } from '@/lib/nutritionPlan'
import { createPlanCommitment } from '@/lib/commitmentPlan'

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
  if (gt === 'bulking' || gt === 'strength') return Math.round(weightKg * 1.05)
  return weightKg // recomposition / health / maintenance / returning
}

// ============================================================================
// محرّك التقسيمة (Split Engine)
// ============================================================================

/** درجة الخبرة الفعلية (أربع درجات): تُشتقّ من مدّة الخبرة أو مستوى التدريب. */
type ExpTier = 'beginner' | 'novice' | 'intermediate' | 'advanced'

function expTier(p: Profile): ExpTier {
  // مصدر الحقيقة: مستوى الخبرة الدلالي من الإعداد (أربع درجات مستقلة).
  // ملاحظة: لا نشتقّ من experienceBand لأن خريطته تدمج «المستجد» مع «المبتدئ».
  if (p.experienceLevel) return p.experienceLevel
  // رجوع للقديم (هجرة/ملفات بلا مستوى دلالي).
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

/**
 * عدد التمارين في الجلسة = أساس حسب الخبرة + تعديل حسب مدّة الجلسة.
 * الخبرة ترفع الحجم (مبتدئ أبسط/أقل … متقدّم أعلى)، والمدّة تضبط العدد:
 * 30د أقل، 45د معتدل، 60د قياسي، 75/90د أكثر حجمًا.
 */
function exercisesPerSession(tier: ExpTier, durationMin?: number): number {
  const base: Record<ExpTier, number> = { beginner: 4, novice: 5, intermediate: 6, advanced: 7 }
  const delta =
    !durationMin || durationMin >= 90
      ? tier === 'beginner'
        ? 1
        : 2 // 90د: أكثر حجم (المبتدئ بزيادة محدودة)
      : durationMin <= 30
      ? -2
      : durationMin <= 45
      ? -1
      : durationMin >= 75
      ? 1
      : 0 // 60د قياسي
  return clamp(base[tier] + delta, 3, 9)
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
  strength: { compoundReps: '4–6', isoReps: '6–8', compoundRest: 180, isoRest: 90 },
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
    // صالة صغيرة: وزن حر + أجهزة أساسية + كيبل أساسي. نستبعد التخصصي (سميث/أوزان حرة نادرة).
    const allowed = new Set(['dumbbell', 'barbell', 'bench', 'machine', 'cable', 'bodyweight', 'band'])
    return (ex) => ex.equipment.every((e) => allowed.has(e))
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

/** القيود/الإصابات المكتشفة من إجابات الإعداد (كلمات مفتاحية عربية/إنجليزية). */
interface InjuryFlags {
  knee: boolean
  shoulder: boolean
  back: boolean
}
function detectInjuries(p: Profile): InjuryFlags {
  const s = (p.injuries ?? '').toLowerCase()
  return {
    knee: s.includes('knee') || s.includes('ركب'),
    shoulder: s.includes('shoulder') || s.includes('كتف'),
    back: s.includes('lower_back') || s.includes('back') || s.includes('ظهر'),
  }
}

/**
 * فلتر سلامة حسب القيود — يستبعد الافتراضيات الخطرة فقط ويُبقي بدائل أكثر أمانًا:
 * - الركبة: نتجنّب السكوات/الطعنات بالأوزان الحرّة (نُبقي الأجهزة كبديل أأمن).
 * - الكتف: نتجنّب الضغط فوق الرأس الخطر (نُبقي ضغط الجهاز والرفعات الجانبية).
 * - الظهر: نتجنّب الـ hinge الثقيل بالبار (نُبقي الأجهزة/الكيبل والصفوف).
 * ليست نصيحة طبية — مجرّد اختيار افتراضي أكثر تحفّظًا.
 */
function makeInjuryFilter(flags: InjuryFlags): (ex: Exercise) => boolean {
  if (!flags.knee && !flags.shoulder && !flags.back) return () => true
  return (ex) => {
    const free = ex.equipment.some((e) => e === 'barbell' || e === 'dumbbell' || e === 'smith')
    if (flags.knee && (ex.movementPattern === 'squat' || ex.movementPattern === 'lunge') && free) return false
    if (flags.back && ex.movementPattern === 'hinge' && free) return false
    if (flags.shoulder) {
      if (/overhead|behind-neck|military|arnold-press|upright-row/.test(ex.id)) return false
      if (ex.primaryMuscle === 'shoulders' && ex.movementPattern === 'push' && ex.equipment.includes('barbell')) return false
    }
    return true
  }
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

/** يختار تمرينًا لفتحة معيّنة من المجمع المتاح (مع تنويع عبر variation وتجنّب التكرار). */
function pickForSlot(slot: Slot, pool: Exercise[], used: Set<string>, variation: number): string | undefined {
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
  cands = cands.slice().sort((a, b) => a.id.localeCompare(b.id))
  return cands[variation % cands.length].id
}

/** يبني قائمة معرّفات تمارين ليوم واحد. */
function buildDayExercises(type: DayType, variation: number, pool: Exercise[], target: number): string[] {
  const used = new Set<string>()
  const ids: string[] = []
  for (const slot of SLOTS[type]) {
    if (ids.length >= target) break
    const id = pickForSlot(slot, pool, used, variation)
    if (id) {
      ids.push(id)
      used.add(id)
    }
  }
  // إكمال النقص من عضلات اليوم الأساسية إن قلّت الفتحات المتاحة (بيئات محدودة الأدوات).
  if (ids.length < target) {
    const extra = pool
      .filter((ex) => !used.has(ex.id) && TYPE_MUSCLES[type].includes(ex.primaryMuscle))
      .sort((a, b) => a.id.localeCompare(b.id))
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

const AR_ALPHA = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز']
const AR_NUM = ['', '١', '٢', '٣', '٤', '٥', '٦', '٧']

function fullDay(i: number): DaySpec {
  return { type: 'full', nameAr: `جسم كامل ${AR_ALPHA[i]}`, nameEn: `Full Body ${String.fromCharCode(65 + i)}`, routineType: 'full' }
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
  if (d <= 2) return Array.from({ length: d }, (_, i) => fullDay(i))
  if (d === 3) return [fullDay(0), fullDay(1), fullDay(2)]
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

// — أيام التقسيمة المتقدّمة (يحترم اختيار المستخدم عند splitMode=advanced) —
function broDay(kind: 'chest' | 'back' | 'shoulders' | 'arms' | 'legs', n: number): DaySpec {
  const nn = n > 1 ? ` ${AR_NUM[n]}` : ''
  switch (kind) {
    case 'chest':
      return { type: 'push', nameAr: `صدر${nn}`, nameEn: `Chest${n > 1 ? ` ${n}` : ''}`, routineType: 'push' }
    case 'back':
      return { type: 'pull', nameAr: `ظهر${nn}`, nameEn: `Back${n > 1 ? ` ${n}` : ''}`, routineType: 'pull' }
    case 'shoulders':
      return { type: 'arms', nameAr: `أكتاف${nn}`, nameEn: `Shoulders${n > 1 ? ` ${n}` : ''}`, routineType: 'push' }
    case 'arms':
      return { type: 'arms', nameAr: `ذراعين${nn}`, nameEn: `Arms${n > 1 ? ` ${n}` : ''}`, routineType: 'push' }
    case 'legs':
      return { type: 'lower', nameAr: `أرجل${nn}`, nameEn: `Legs${n > 1 ? ` ${n}` : ''}`, routineType: 'legs' }
  }
}
function arnoldDay(kind: 'chestback' | 'shoulderarms' | 'legs', n: number): DaySpec {
  const nn = n > 1 ? ` ${AR_NUM[n]}` : ''
  if (kind === 'chestback')
    return { type: 'upper', nameAr: `صدر وظهر${nn}`, nameEn: `Chest & Back${n > 1 ? ` ${n}` : ''}`, routineType: 'full' }
  if (kind === 'shoulderarms')
    return { type: 'arms', nameAr: `كتف وذراع${nn}`, nameEn: `Shoulders & Arms${n > 1 ? ` ${n}` : ''}`, routineType: 'push' }
  return { type: 'lower', nameAr: `أرجل${nn}`, nameEn: `Legs${n > 1 ? ` ${n}` : ''}`, routineType: 'legs' }
}

const ADV_SPLIT_IDS: Record<AdvancedSplit, string> = {
  full_body: 'adv-full-body',
  upper_lower: 'adv-upper-lower',
  push_pull_legs: 'adv-ppl',
  arnold: 'adv-arnold',
  bro_split: 'adv-bro',
}

/**
 * يبني أيام التقسيمة المتقدّمة المختارة، موزّعة على عدد أيام المستخدم.
 * التقسيمات الدورية (PPL/أرنولد/عضلة-باليوم) تُكرَّر لملء الأيام مع ترقيم تلقائي.
 */
function advancedSplitDays(split: AdvancedSplit, days: number): DaySpec[] {
  const d = clamp(days, 1, 7)
  const cycle = (build: (i: number) => DaySpec) => Array.from({ length: d }, (_, i) => build(i))
  switch (split) {
    case 'full_body':
      return cycle((i) => fullDay(i))
    case 'upper_lower':
      return cycle((i) => ulDay(i % 2 === 0 ? 'upper' : 'lower', Math.floor(i / 2) + 1))
    case 'push_pull_legs': {
      const order: Array<'push' | 'pull' | 'legs'> = ['push', 'pull', 'legs']
      return cycle((i) => pplDay(order[i % 3], Math.floor(i / 3) + 1))
    }
    case 'arnold': {
      const order: Array<'chestback' | 'shoulderarms' | 'legs'> = ['chestback', 'shoulderarms', 'legs']
      return cycle((i) => arnoldDay(order[i % 3], Math.floor(i / 3) + 1))
    }
    case 'bro_split': {
      const order: Array<'chest' | 'back' | 'shoulders' | 'arms' | 'legs'> = ['chest', 'back', 'shoulders', 'arms', 'legs']
      return cycle((i) => broDay(order[i % 5], Math.floor(i / 5) + 1))
    }
  }
}

/** يحلّ التقسيمة النهائية: متقدّمة (اختيار المستخدم) أو تلقائية حسب الأيام. */
function resolveSplit(p: Profile): { specs: DaySpec[]; templateId: string } {
  const days = clamp(p.trainingDays, 1, 7)
  if (p.splitMode === 'advanced' && p.advancedSplit) {
    return { specs: advancedSplitDays(p.advancedSplit, days), templateId: ADV_SPLIT_IDS[p.advancedSplit] }
  }
  return { specs: splitDays(days, p.muscleFocus), templateId: splitId(days) }
}

const SPLIT_TITLES: Record<string, { ar: string; en: string }> = {
  'gen-fullbody': { ar: 'جسم كامل', en: 'Full Body' },
  'gen-upper-lower-4': { ar: 'علوي / سفلي', en: 'Upper / Lower' },
  'gen-upper-lower-5': { ar: 'علوي / سفلي + يوم مركّز', en: 'Upper / Lower + Focus' },
  'gen-ppl-6': { ar: 'دفع / سحب / أرجل ×٢', en: 'Push / Pull / Legs ×2' },
  'gen-ppl-7': { ar: 'دفع / سحب / أرجل ×٢ + إضافي', en: 'Push / Pull / Legs ×2 + Extra' },
  // تقسيمات متقدّمة (اختيار المستخدم).
  'adv-full-body': { ar: 'جسم كامل', en: 'Full Body' },
  'adv-upper-lower': { ar: 'علوي / سفلي', en: 'Upper / Lower' },
  'adv-ppl': { ar: 'دفع / سحب / أرجل', en: 'Push / Pull / Legs' },
  'adv-arnold': { ar: 'تقسيمة أرنولد', en: 'Arnold Split' },
  'adv-bro': { ar: 'عضلة باليوم', en: 'Bro Split' },
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
  const { specs, templateId } = resolveSplit(p)
  const tier = expTier(p)
  const target = exercisesPerSession(tier, p.workoutDuration)
  const equipOk = makeEquipFilter(p)
  const injuryOk = makeInjuryFilter(detectInjuries(p))
  const pool = exercises.filter(
    (ex) =>
      equipOk(ex) &&
      injuryOk(ex) &&
      ex.movementPattern !== 'mobility' &&
      ex.primaryMuscle !== 'cardio' &&
      levelOk(ex, tier),
  )

  const counts: Record<string, number> = {}
  const planDays: PlanDay[] = specs.map((spec, di) => {
    const variation = counts[spec.type] ?? 0
    counts[spec.type] = variation + 1
    const dayId = `gen-${di + 1}-${spec.type}`
    const ids = buildDayExercises(spec.type, variation, pool, target)
    return {
      id: dayId,
      nameAr: spec.nameAr,
      nameEn: spec.nameEn,
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
      rows.push({ day: d, title: spec.nameAr, type: spec.routineType })
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
      rows.push({ day: d, title: td.nameAr, type: dayType(td.nameEn) })
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

/** يولّد خطة أكل تقريبية من الأهداف والتفضيلات (يحاول الاقتراب من السعرات/البروتين). */
export function generateNutrition(p: Profile, targets: Targets): { plan: NutritionPlan; warning?: string } {
  const goal = calorieGoalFromGoalType(p.goalType)
  const targetCalories =
    targets.targetCalories ||
    (goal === 'cut' ? targets.cuttingCalories : goal === 'bulk' ? targets.bulkingCalories : targets.maintenanceCalories)
  const mealsCount = Math.max(3, Math.min(5, p.mealsPerDay))
  const s = STYLE_TEMPLATES[p.nutritionStyle] ?? STYLE_TEMPLATES.high_protein

  const slots: string[] = [s.breakfast, s.lunch, s.dinner]
  if (mealsCount >= 4) slots.push(s.snack)
  if (mealsCount >= 5) slots.push('protein-shake')

  let meals: PlanMeal[] = slots.map((id, i) => createPlanMealFromTemplate(id, i))

  // محاولة تقريب السعرات ضمن ±10% عبر معامل قياس بسيط على الماكروز المعروضة
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
  }
  return { plan, warning: within ? undefined : 'هذه أمثلة وجبات مبدئية وليست خطة كاملة مطابقة للأهداف.' }
}

const COMMITMENTS_BY_GOAL: Record<GoalType, string[]> = {
  cutting: ['today-workout', 'steps-10k', 'water-target', 'sleep-7h', 'protein-target'],
  bulking: ['today-workout', 'protein-target', 'calories-target', 'sleep-7h', 'post-workout-meal'],
  strength: ['today-workout', 'warm-up', 'protein-target', 'sleep-7h', 'water-target'],
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

/** التزام متقطّع (on/off): بداية متحفّظة قليلًا — نخفّف المجموعات العالية فقط (≥4 → 3). */
function applyMildConservative(plan: WorkoutPlan): WorkoutPlan {
  return {
    ...plan,
    days: plan.days.map((d) => ({
      ...d,
      exercises: d.exercises.map((pe) => (pe.sets >= 4 ? { ...pe, sets: pe.sets - 1 } : pe)),
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
  const isReturning = p.goalType === 'returning' || p.consistency === 'returning'

  const isOnOff = !isReturning && p.consistency === 'onoff'

  const { plan, specs } = generateWorkoutPlan(p)
  let workoutPlan = plan
  workoutPlan = applyMuscleFocus(workoutPlan, p.muscleFocus ?? 'balanced')
  if (isReturning) workoutPlan = applyDeload(workoutPlan)
  else if (isOnOff) workoutPlan = applyMildConservative(workoutPlan)

  const weeklySchedule = buildScheduleFromSpecs(specs, p.trainingDays, p.preferredDays)
  const { plan: nutritionPlan, warning: nutritionWarning } = generateNutrition(p, targets)

  const warnings: string[] = []
  if (isReturning) warnings.push('خفّفنا حجم أسبوعك الأول للرجوع بأمان — زِد تدريجيًا بعدها.')
  else if (isOnOff) warnings.push('بدأنا بحجم متحفّظ قليلًا يناسب الالتزام المتقطّع — زِد تدريجيًا مع الانتظام.')
  // تنبيهات سلامة حسب القيود (ليست نصيحة طبية — مجرّد اختيار افتراضي أكثر تحفّظًا).
  const inj = detectInjuries(p)
  if (inj.knee) warnings.push('راعينا حساسية الركبة: قلّلنا تمارين السكوات الثقيلة بالأوزان الحرّة وفضّلنا بدائل أأمن.')
  if (inj.shoulder) warnings.push('راعينا حساسية الكتف: تجنّبنا الضغط فوق الرأس الخطر وفضّلنا ضغط الجهاز والرفعات الجانبية.')
  if (inj.back) warnings.push('راعينا حساسية أسفل الظهر: تجنّبنا الـ hinge الثقيل بالبار وفضّلنا الأجهزة/الكيبل.')
  if (p.trainingLevel === 'beginner' && p.trainingDays >= 5) {
    warnings.push('للمبتدئ ننصح بـ3–4 أيام في البداية لبناء الالتزام والاستشفاء.')
  }
  // فحص تكرار الأرجل لخطط التضخيم متعددة الأيام
  if ((p.goalType === 'bulking' || p.goalType === 'recomposition') && p.trainingDays >= 4) {
    const legDays = weeklySchedule.filter((d) => d.type === 'legs' || d.type === 'full').length
    if (legDays < 2) warnings.push('تأكد من تدريب الأرجل مرتين أسبوعيًا على الأقل في خطط التضخيم.')
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
