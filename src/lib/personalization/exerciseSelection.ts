// وصل التخصيص بمكتبة التمارين **القائمة** — أربع مراحل.
//
// ═══ لا مكتبة ثانية ═══
// المصدر الوحيد `src/data/exercises.ts` (١٨٨ تمرينًا) بمعرّفاتها ووسومها
// وبدائلها كما هي. هذا الملف **لا ينسخ تمرينًا ولا يخترع معرّفًا**: مخرجه
// معرّفات فقط، ومن أرادها كائنًا ناداها من المكتبة. وسبب القاعدة عملي لا
// مذهبي: نسخة ثانية تعني وسمين يتباعدان، وتعني وسائط تنكسر — والمكتبة موصولة
// بـ`exerciseMedia` و`exerciseGuidance` و`LEGACY_EXERCISE_ID_MAP`.
//
// ═══ الفرق بين «لا يستطيع» و«لا يحب» ═══
// المرحلة ١ **تحذف**: معدّات غائبة، قيد طبّي، تمرين قال المستخدم إنه لا يقدر
// عليه. المرحلة ٣ **تخفض الرتبة**: تمرين لا يحبّه. خلطهما خطأ في الاتجاهين —
// حذف المكروه يفقر الخطة، وإبقاء الممنوع يكسر وعد الأمان.

import { exercises, getExercise, getAlternatives, canonicalExerciseId } from '@/data/exercises'
import type { Exercise, ExLevel, Muscle, MovementPattern } from '@/types/workout'
import type { PersonalizationProfile } from './types'

const LEVEL_ORDER: Record<ExLevel, number> = { beginner: 0, intermediate: 1, advanced: 2 }

/** خريطة منطقة الجسم ← العضلات التفصيلية التي تُحمَّل عند تدريبها. */
const AREA_TO_DETAILED: Record<string, string[]> = {
  shoulder: ['front_delts', 'side_delts', 'rear_delts'],
  elbow: ['biceps', 'triceps', 'forearms'],
  wrist: ['forearms'],
  lower_back: ['lower_back'],
  upper_back: ['upper_back', 'traps', 'lats'],
  hip: ['glutes', 'hamstrings'],
  knee: ['quads', 'hamstrings'],
  ankle: ['calves'],
  neck: ['traps'],
  core: ['abs', 'obliques'],
}

export interface ExclusionReason {
  id: string
  reason: 'equipment' | 'environment' | 'safety_pattern' | 'safety_muscle' | 'user_excluded' | 'overhead' | 'impact' | 'level_cap'
}

export interface RankedExercise {
  id: string
  score: number
  /** تفكيك النقاط — يُعرض في التشخيص ويُفحص في الإثبات، لا يُخترع. */
  parts: Record<string, number>
}

export interface SelectionResult {
  /** المرشّحون بعد كل المراحل، مرتّبين. */
  ranked: RankedExercise[]
  /** ما استُبعد ولماذا — **الشفافية شرط**: خطة تنقص تمرينًا يجب أن تقول لماذا. */
  excluded: ExclusionReason[]
  /** بدائل صالحة لكل مرشّح في القائمة العليا. */
  substitutions: Record<string, string[]>
}

// ————————————————————————— المرحلة ١: الاستبعاد الصارم —————————————————————————

function environmentAllows(ex: Exercise, place: PersonalizationProfile['place']): boolean {
  if (ex.environment === 'both') return true
  if (place === 'gym') return ex.environment === 'gym'
  if (place === 'home') return ex.environment === 'home'
  if (place === 'outdoor') return ex.environment === 'home'
  return true // mixed: كلاهما مقبول
}

function equipmentAvailable(ex: Exercise, owned: readonly string[]): boolean {
  // كل قطعة يحتاجها التمرين يجب أن تكون متاحة — «معظمها» لا يكفي: تمرين بنش
  // بلا مقعد ليس بنشًا ناقصًا بل تمرينًا آخر.
  return ex.equipment.every((e) => owned.includes(e))
}

function touchesArea(ex: Exercise, areas: readonly string[]): boolean {
  const detailed = new Set<string>([...ex.primaryMusclesDetailed, ...ex.secondaryMusclesDetailed])
  return areas.some((area) => (AREA_TO_DETAILED[area] ?? []).some((m) => detailed.has(m)))
}

export function hardExclude(profile: PersonalizationProfile, pool: readonly Exercise[] = exercises): {
  kept: Exercise[]
  excluded: ExclusionReason[]
} {
  const excluded: ExclusionReason[] = []
  const owned = profile.equipment
  const banned = new Set(profile.excludedExercises.map((id) => canonicalExerciseId(id)))
  const activeAreas = profile.limitations.filter((l) => l.active).map((l) => l.area)
  const kept: Exercise[] = []

  for (const ex of pool) {
    if (banned.has(ex.id)) {
      excluded.push({ id: ex.id, reason: 'user_excluded' })
      continue
    }
    if (!environmentAllows(ex, profile.place)) {
      excluded.push({ id: ex.id, reason: 'environment' })
      continue
    }
    if (!equipmentAvailable(ex, owned)) {
      excluded.push({ id: ex.id, reason: 'equipment' })
      continue
    }
    if (profile.safety.excludedPatterns.includes(ex.movementPattern)) {
      excluded.push({ id: ex.id, reason: 'safety_pattern' })
      continue
    }
    if (profile.safety.excludedMuscles.includes(ex.primaryMuscle)) {
      excluded.push({ id: ex.id, reason: 'safety_muscle' })
      continue
    }
    if (activeAreas.length && touchesArea(ex, activeAreas) && profile.safety.needsClearance) {
      excluded.push({ id: ex.id, reason: 'safety_muscle' })
      continue
    }
    if (profile.safety.noOverhead && isOverhead(ex)) {
      excluded.push({ id: ex.id, reason: 'overhead' })
      continue
    }
    if (profile.safety.noImpact && isImpact(ex)) {
      excluded.push({ id: ex.id, reason: 'impact' })
      continue
    }
    kept.push(ex)
  }
  return { kept, excluded }
}

/** فوق الرأس — يُعرف بالنمط والعضلة، لا بقائمة أسماء تشيخ مع كل تمرين جديد. */
function isOverhead(ex: Exercise): boolean {
  if (ex.movementPattern !== 'push') return false
  return ex.primaryMusclesDetailed.includes('front_delts') || ex.primaryMusclesDetailed.includes('side_delts')
}

function isImpact(ex: Exercise): boolean {
  return ex.movementPattern === 'cardio' && !/bike|row|elliptical|swim|walk/i.test(ex.nameEn)
}

// ————————————————————————— المرحلة ٢: الملاءمة —————————————————————————

export function suitabilityFilter(profile: PersonalizationProfile, pool: readonly Exercise[]): {
  kept: Exercise[]
  excluded: ExclusionReason[]
} {
  const cap = LEVEL_ORDER[profile.planConstraints.maxExerciseLevel]
  const kept: Exercise[] = []
  const excluded: ExclusionReason[] = []
  for (const ex of pool) {
    if (LEVEL_ORDER[ex.level] > cap) {
      excluded.push({ id: ex.id, reason: 'level_cap' })
      continue
    }
    kept.push(ex)
  }
  return { kept, excluded }
}

// ————————————————————————— المرحلة ٣: الترتيب —————————————————————————

const GOAL_PATTERN_BONUS: Record<PersonalizationProfile['primaryGoal'], Partial<Record<MovementPattern, number>>> = {
  bulk: { push: 3, pull: 3, squat: 3, hinge: 2, isolation: 2 },
  cut: { push: 2, pull: 2, squat: 2, hinge: 2, cardio: 3, isolation: 1 },
  maintain: { push: 2, pull: 2, squat: 2, hinge: 2, core: 2, mobility: 1 },
}

const STYLE_BONUS: Record<PersonalizationProfile['trainingStyle'], (ex: Exercise) => number> = {
  machines: (ex) => (ex.equipment.includes('machine') || ex.equipment.includes('cable') ? 3 : 0),
  free_weights: (ex) => (ex.equipment.includes('barbell') || ex.equipment.includes('dumbbell') ? 3 : 0),
  bodyweight: (ex) => (ex.equipment.includes('bodyweight') ? 3 : 0),
  mixed: () => 1,
}

export function rank(profile: PersonalizationProfile, pool: readonly Exercise[]): RankedExercise[] {
  const preferred = new Set(profile.preferredExercises.map(canonicalExerciseId))
  const priorities = new Set<Muscle>(profile.musclePriorities)
  const styleFn = STYLE_BONUS[profile.trainingStyle]
  const goalBonus = GOAL_PATTERN_BONUS[profile.primaryGoal]

  return pool
    .map((ex) => {
      const parts: Record<string, number> = {}
      parts.goal = goalBonus[ex.movementPattern] ?? 0
      parts.preference = preferred.has(ex.id) ? 5 : 0
      parts.style = styleFn(ex)
      parts.priority = priorities.has(ex.primaryMuscle) ? 4 : 0
      // ملاءمة المستوى: الأقرب لسقف المستخدم أفضل من الأسهل بكثير — تمرين
      // مبتدئ لمتقدّم ليس خطأً لكنه لا يستحق الصدارة.
      parts.level = 2 - Math.abs(LEVEL_ORDER[ex.level] - LEVEL_ORDER[profile.planConstraints.maxExerciseLevel])
      parts.pattern = profile.planConstraints.requiredPatterns.includes(ex.movementPattern) ? 3 : 0
      // جودة السجلّ: تمرين له بدائل معرَّفة أصلح للخطط لأنه قابل للاستبدال.
      parts.quality = ex.alternatives.length ? 1 : 0
      const score = Object.values(parts).reduce((s, v) => s + v, 0)
      return { id: ex.id, score, parts }
    })
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.id.localeCompare(b.id)))
}

// ————————————————————————— المرحلة ٤: البدائل —————————————————————————

/**
 * بدائل صالحة لتمرين. تبدأ من `alternatives` المعرَّفة في المكتبة، ثم تُكمل
 * بمن يشاركه النمط والعضلة الأساسية — **ثم تمرّ كلّها بنفس الاستبعاد الصارم**.
 * بديل لا يمرّ بفلتر المستخدم ليس بديلًا.
 */
export function substitutionsFor(id: string, profile: PersonalizationProfile, allowed: ReadonlySet<string>): string[] {
  const base = getExercise(canonicalExerciseId(id))
  if (!base) return []
  const declared = getAlternatives(base.id).map((x) => x.id)
  const sameShape = exercises
    .filter((x) => x.id !== base.id && x.movementPattern === base.movementPattern && x.primaryMuscle === base.primaryMuscle)
    .map((x) => x.id)
  const seen = new Set<string>()
  const out: string[] = []
  for (const candidate of [...declared, ...sameShape]) {
    if (candidate === base.id || seen.has(candidate) || !allowed.has(candidate)) continue
    const ex = getExercise(candidate)
    if (!ex) continue
    // صعوبة مشابهة: درجة واحدة فرقًا على الأكثر، وضمن سقف المستخدم.
    if (Math.abs(LEVEL_ORDER[ex.level] - LEVEL_ORDER[base.level]) > 1) continue
    if (LEVEL_ORDER[ex.level] > LEVEL_ORDER[profile.planConstraints.maxExerciseLevel]) continue
    seen.add(candidate)
    out.push(candidate)
    if (out.length >= 3) break
  }
  return out
}

// ————————————————————————— التشغيل الكامل —————————————————————————

export function selectExercises(profile: PersonalizationProfile, topN = 40): SelectionResult {
  const stage1 = hardExclude(profile)
  const stage2 = suitabilityFilter(profile, stage1.kept)
  const ranked = rank(profile, stage2.kept)
  const allowed = new Set(stage2.kept.map((x) => x.id))
  const substitutions: Record<string, string[]> = {}
  for (const r of ranked.slice(0, topN)) substitutions[r.id] = substitutionsFor(r.id, profile, allowed)
  return { ranked, excluded: [...stage1.excluded, ...stage2.excluded], substitutions }
}

/** تغطية أنماط الحركة المطلوبة — يكشف خطة عمياء عن نمط كامل. */
export function patternCoverage(profile: PersonalizationProfile, ranked: readonly RankedExercise[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const p of profile.planConstraints.requiredPatterns) counts[p] = 0
  for (const r of ranked) {
    const ex = getExercise(r.id)
    if (ex && counts[ex.movementPattern] !== undefined) counts[ex.movementPattern] += 1
  }
  return counts
}
