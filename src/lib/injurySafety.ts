// ملاءمة التمرين للإصابة — **نموذج بنيوي لا قائمة أسماء**.
//
// [SOVEREIGN-PLAN-001] كان الترشيح كلّه `INJURY_RISKY_IDS`: ٩٤ معرّفًا مكتوبًا
// باليد. قائمة الكتف منها **أربعة معرّفات**، فمرّ «ضغط الكتف بالدمبل» و«الرفرفة
// الأمامية» و«مدّ الترايسبس فوق الرأس» لمن أعلن إصابة كتف — لأن أحدًا لم يكتب
// أسماءها. المسح المرجعي: **٧٢٠/٧٢٠** تهيئة تصف حركة ممنوعة واحدة على الأقل.
//
// النموذج الآن ثلاث طبقات مترابطة:
//   ١) **الميكانيكا** — كل تمرين يعلن `jointLoads` (أحمال مفاصله) في المكتبة.
//   ٢) **المنطقة → أحمال ممنوعة** — جدول واحد معلن أدناه.
//   ٣) **اتحاد لا استبدال** — القائمة اليدوية تبقى فوق النموذج، لأنها تعبّر عن
//      ثلاثة أشياء لا تقولها الأحمال: ثني المرفق (كل التمارين الاثني عشر للبايسبس
//      تحمل `[]`)، وحِمل القبضة/الرسغ (الرفعة الميتة، التجديف، العقلة)، وعدم
//      ثبات الكاحل (الطعنات، الصعود على الصندوق). حذفها ارتداد لا تبسيط.
//
// **الفشل مغلقًا:** حركة مركّبة **غير مصنَّفة** (`jointLoads` غائبة) تُستبعَد عند
// أي إصابة مُعلَنة. `[]` تعني «مراجَعة وآمنة» فتبقى مؤهَّلة — الفرق بينهما هو
// كامل الفرق بين «لا نعرف» و«نعرف أنه لا يحمل».
//
// هذه **ملاءمة تمرين لا تشخيص طبي**، ولا يخرج من هنا نصّ الإصابة إطلاقًا (§9).

import type { InjuryAreaKey, Profile } from '@/types/profile'
import type { Exercise, JointLoad, MovementPattern } from '@/types/workout'
import { canonicalExerciseId } from '@/data/exercises'

/**
 * منطقة الإصابة داخل المحرّك.
 *
 * `InjuryAreaKey` الستّة كما تصل من الإعداد، **زائد `hip` منطقة مشتقّة**: لا
 * وجود لها في `InjuryAreaKey` (وذلك حقل نوع لا نملكه)، فلا تصل من شرائح الإعداد
 * إطلاقًا — لكنها تصل من النصّ الحرّ («خشونة الورك» · "hip labral tear") وكانت
 * تسقط صامتة. الأحمال تصفها بدقّة كافية: ثني الركبة العميق (قرفصاء/طعن) والهينج
 * (وهو حرفيًا مفصلة الورك) والارتطام.
 */
export type InjuryRegion = InjuryAreaKey | 'hip'

/** الاسم الداخلي القديم `back` مرادف معلن لـ`lower_back`. */
export const LEGACY_BACK_ALIAS: InjuryRegion = 'lower_back'

/**
 * المنطقة → الأحمال الممنوعة عليها. **هذا هو النموذج**؛ ما عداه احتياط.
 */
export const REGION_FORBIDDEN_LOADS: Record<InjuryRegion, readonly JointLoad[]> = {
  shoulder: ['overhead', 'shoulder_anterior', 'shoulder_abduction'],
  knee: ['deep_knee_flexion', 'knee_shear', 'impact'],
  lower_back: ['spinal_axial', 'spinal_hinge'],
  wrist: ['wrist_extension'],
  elbow: ['elbow_extension'],
  ankle: ['ankle_dorsiflexion', 'impact'],
  // منطقة مشتقّة (نصّ حرّ فقط) — الورك يحمله الهينج وثني الركبة العميق والارتطام.
  hip: ['deep_knee_flexion', 'spinal_hinge', 'impact'],
}

/**
 * القائمة اليدوية — **تبقى اتحادًا مع النموذج لا بديلًا عنه**.
 * نُقلت كما هي من `planGenerator` (كانت `INJURY_RISKY_IDS`) لأنها تحمل مراجعة
 * بشرية حقيقية لثلاثة أشياء لا يعبّر عنها `jointLoads`:
 *   • **ثني المرفق تحت حِمل** — كل تمارين البايسبس تحمل `[]` (لا حِمل مفصلي
 *     مقيَّد بمعنى الأحمال المعلنة)، فلولا القائمة لمرّت كلها لمصاب المرفق.
 *   • **حِمل القبضة/الرسغ** — الرفعة الميتة والتجديف والعقلة لا تحمل
 *     `wrist_extension` (لا استناد على الكفّ) لكنها قبضة ثقيلة.
 *   • **عدم ثبات الكاحل** — الطعنات والصعود على الصندوق بلا `ankle_dorsiflexion`.
 */
export const INJURY_RISKY_IDS: Record<InjuryRegion, ReadonlySet<string>> = {
  // الركبة: نتجنّب القرفصاء الثقيل والاندفاع العميق ومدّ الرجل؛ نُبقي ليج برس/قرفصاء خفيف والهيپ.
  knee: new Set([
    'barbell-back-squat', 'front-squat', 'hack-squat-machine', 'smith-machine-squat', 'sissy-squat',
    'belt-squat', 'leg-press-narrow', 'bulgarian-split-squat', 'walking-lunge',
    'reverse-lunge', 'step-up', 'leg-extension-machine', 'wall-sit',
  ]),
  // الكتف: القائمة الأصلية أربعة معرّفات — النموذج أعلاه هو من يحمل الحِمل الآن.
  shoulder: new Set(['overhead-press', 'push-press', 'upright-row', 'arnold-press']),
  // أسفل الظهر: نتجنّب الهينج الثقيل المحمّل على العمود؛ نُبقي التجديف المدعوم/الجهاز والهيپ ثرَست.
  lower_back: new Set([
    'deadlift', 'sumo-deadlift', 'stiff-leg-deadlift', 'good-morning', 'barbell-row', 't-bar-row-machine',
    'romanian-deadlift', 'dumbbell-rdl', 'single-leg-rdl',
  ]),
  // الرسغ: القبضة الثقيلة (رفعات/عقلة/تجديف بار)، وحمل وزن الجسم على الكفّ، والبار المستقيم.
  wrist: new Set([
    'deadlift', 'sumo-deadlift', 'rack-pull', 'barbell-row', 'pendlay-row', 't-bar-row-machine',
    'meadows-row', 'pull-up', 'chin-up', 'inverted-row', 'dumbbell-shrug', 'barbell-shrug',
    'kettlebell-swing', 'hanging-leg-raise', 'toes-to-bar', 'front-squat',
    'barbell-curl', 'ez-bar-curl', 'cable-biceps-curl', 'reverse-curl', 'preacher-curl-machine', 'spider-curl',
    'skull-crusher', 'close-grip-bench-press', 'jm-press',
    'push-up', 'incline-push-up', 'knee-push-up', 'diamond-push-up', 'chest-dip', 'bench-dip',
    'ab-wheel-rollout', 'mountain-climber', 'burpees',
  ]),
  // المرفق: ثني/مدّ المرفق تحت حِمل مباشر — **ثني المرفق لا يعبّر عنه أي حِمل معلن**.
  elbow: new Set([
    'barbell-curl', 'dumbbell-curl', 'hammer-curl', 'preacher-curl-machine', 'cable-biceps-curl',
    'concentration-curl', 'incline-dumbbell-curl', 'ez-bar-curl', 'spider-curl', 'cable-hammer-curl',
    'reverse-curl', 'machine-curl',
    'skull-crusher', 'overhead-triceps-extension', 'cable-overhead-extension', 'dumbbell-kickback',
    'close-grip-bench-press', 'jm-press', 'bench-dip', 'chest-dip', 'assisted-dip-machine',
    'diamond-push-up',
  ]),
  // الكاحل: القفز/الارتطام، ورفع السمانة واقفًا (توازن)، والاندفاع (عدم ثبات).
  ankle: new Set([
    'bulgarian-split-squat', 'walking-lunge', 'reverse-lunge', 'step-up',
    'standing-calf-raise-machine', 'bodyweight-calf-raise', 'donkey-calf-raise', 'single-leg-calf-raise',
    'jump-rope', 'burpees', 'high-knees', 'mountain-climber',
  ]),
  // الورك منطقة مشتقّة حديثًا — لا قائمة يدوية تاريخية لها، والنموذج وحده يحرسها.
  hip: new Set<string>(),
}

/** أنماط الحركة المركّبة — هي وحدها التي يسري عليها «غير مصنَّف ⇒ يُستبعَد». */
const COMPOUND_PATTERNS: ReadonlySet<MovementPattern> = new Set<MovementPattern>([
  'squat',
  'hinge',
  'push',
  'pull',
  'lunge',
])

/**
 * هل التمرين **غير مصنَّف**؟ أي `jointLoads` ليست مصفوفة.
 * `[]` ليست «غير مصنَّف» — هي إعلان صريح بأنه مراجَع ولا يحمل حِملًا مقيَّدًا.
 * المكتبة اليوم تُلزم الحقل (١٨١/١٨١)، لكن الكائن قد يصل من استيراد/مزامنة/امتداد،
 * فالحارس يبقى قائمًا: **ما لا نعرفه لا نصفه لمصاب**.
 */
export function isUnclassifiedExercise(ex: Exercise): boolean {
  return !Array.isArray((ex as { jointLoads?: unknown }).jointLoads)
}

/** يكتشف مناطق الإصابة من نصّ القيود (مفاتيح الإعداد + التسميات العربية + النصّ الحرّ). */
export function detectInjuryRegionsFromText(injuries?: string): Set<InjuryRegion> {
  const out = new Set<InjuryRegion>()
  if (!injuries) return out
  const t = injuries.toLowerCase()
  if (/knee|ركبة|ركب/.test(t)) out.add('knee')
  if (/shoulder|كتف|أكتاف|اكتاف/.test(t)) out.add('shoulder')
  if (/back|lower_back|ظهر|عمود/.test(t)) out.add(LEGACY_BACK_ALIAS)
  if (/wrist|رسغ|معصم/.test(t)) out.add('wrist')
  if (/elbow|مرفق|كوع/.test(t)) out.add('elbow')
  if (/ankle|كاحل|كعب/.test(t)) out.add('ankle')
  // منطقة مشتقّة: لا تصل من الشرائح، وكانت تسقط صامتة من النصّ الحرّ.
  if (/hip|ورك|حوض/.test(t)) out.add('hip')
  return out
}

/**
 * مناطق الإصابة الفعّالة للملف.
 *
 * **الحقل البنيوي `injuryAreas` هو المصدر**، ويُضمّ إليه ما يتعرّف عليه النصّ
 * الحرّ (اتحاد لا استبدال): الاثنان مدخلان مختلفان — الشرائح والملاحظة الحرّة —
 * وضمّهما **لا ينقص أبدًا** عمّا كان يفعله النصّ وحده، فالتوافق الخلفي محفوظ
 * حرفيًا: ملف بلا `injuryAreas` يسلك سلوك اليوم بالضبط.
 */
export interface InjuryInput {
  /** النصّ الحرّ/المفاتيح المجمّعة — يبقى للتوافق مع الملفّات القديمة. */
  injuries?: string
  /** المفاتيح البنيوية من الإعداد. */
  injuryAreas?: Profile['injuryAreas']
}

export function detectInjuryRegions(p: InjuryInput): Set<InjuryRegion> {
  const out = detectInjuryRegionsFromText(p.injuries)
  for (const area of p.injuryAreas ?? []) out.add(area)
  return out
}

/** هل يتعرّف المحرّك على منطقة واحدة على الأقل من مدخلات الإصابة؟ */
export function hasRecognizedInjury(p: InjuryInput): boolean {
  return detectInjuryRegions(p).size > 0
}

/**
 * حالة ترشيح الإصابات الثلاثية — والحالة الوسطى هي الصدق:
 * `unrecognized` = المستخدم أعلن شيئًا **لم نستطع تحويله إلى قاعدة**، فلا يُقال
 * له إننا حميناه.
 */
export type InjuryFilterState = 'applied' | 'unrecognized' | 'notApplied'

export function injuryFilterState(p: InjuryInput): InjuryFilterState {
  if (detectInjuryRegions(p).size > 0) return 'applied'
  const declaredText = Boolean(p.injuries?.trim())
  const declaredKeys = (p.injuryAreas?.length ?? 0) > 0
  return declaredText || declaredKeys ? 'unrecognized' : 'notApplied'
}

/**
 * يبني مُرشِّح الملاءمة: `true` = يجوز وصفه لهذا المستخدم.
 *
 * ثلاث قواعد بالترتيب:
 *   ١) القائمة اليدوية (اتحاد المناطق) — استبعاد بالمعرّف القانوني.
 *   ٢) النموذج — أي حِمل مفصلي ممنوع لأي منطقة مُعلَنة.
 *   ٣) الفشل مغلقًا — مركّب غير مصنَّف يُستبعَد ما دامت هناك إصابة.
 */
export function makeInjurySafetyFilter(regions: Set<InjuryRegion>): (ex: Exercise) => boolean {
  if (!regions.size) return () => true
  const bannedIds = new Set<string>()
  const bannedLoads = new Set<JointLoad>()
  for (const region of regions) {
    for (const id of INJURY_RISKY_IDS[region]) bannedIds.add(canonicalExerciseId(id))
    for (const load of REGION_FORBIDDEN_LOADS[region]) bannedLoads.add(load)
  }
  return (ex) => {
    if (bannedIds.has(ex.id)) return false
    if (isUnclassifiedExercise(ex)) return !COMPOUND_PATTERNS.has(ex.movementPattern)
    for (const load of ex.jointLoads) if (bannedLoads.has(load)) return false
    return true
  }
}

/** مُرشِّح جاهز من الملف مباشرة — الاستعمال الشائع. */
export function makeProfileInjuryFilter(p: InjuryInput): (ex: Exercise) => boolean {
  return makeInjurySafetyFilter(detectInjuryRegions(p))
}

/** الأحمال الممنوعة لمجموعة مناطق — يستعمله الإثبات ليقيس المخرَج لا الدالة. */
export function forbiddenLoadsFor(regions: Iterable<InjuryRegion>): Set<JointLoad> {
  const out = new Set<JointLoad>()
  for (const region of regions) for (const load of REGION_FORBIDDEN_LOADS[region]) out.add(load)
  return out
}
