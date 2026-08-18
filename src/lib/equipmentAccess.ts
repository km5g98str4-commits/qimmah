// Equipment access — the SINGLE source of truth for "which equipment can this
// user actually train with", derived from the onboarding profile. Extracted from
// planGenerator so the plan generator AND the mid-workout substitution engine
// filter by the exact same rule (no divergence between "what we generated" and
// "what we offer as a swap"). Pure + framework-free → unit-testable.
//
// [SOVEREIGN-PLAN-001] **الأداة صارت السلطة، والمكان صار سياقًا.**
// كان المكان وحده يقرّر، فكان «منزل» يعني ضمنًا «أملك بارًا ومقعدًا ودمبلات»:
// **٤٠٢ من ١١٩٧** خانة في خطط المنزل (٣٣٫٦٪) تطلب عدّة لم يعلن أحد امتلاكها.
// و`Profile.equipment` كان موجودًا ولا يُقرأ إطلاقًا. الآن: قائمة معلنة غير
// فارغة ⇒ هي الحاكمة؛ فارغة أو غائبة ⇒ سلوك المكان كما هو حرفيًا (توافق خلفي).

import type { Equipment, Profile } from '@/types/profile'
import type { Exercise } from '@/types/workout'

/** يحسم بيئة التمرين الفعلية من الملف — الأولوية لـ gymAccess الصريح، ثم الاشتقاق الاحتياطي. */
export function resolveGymAccess(p: Profile): NonNullable<Profile['gymAccess']> {
  // نشتق احتياطيًا من gymType أو workoutEnvironment للملفّات القديمة
  // كي لا يحصل مستخدم «جيم منزلي» على أجهزة لمجرد غياب حقل واحد.
  const fallback: NonNullable<Profile['gymAccess']> =
    p.gymType === 'home' || p.workoutEnvironment === 'home'
      ? 'home'
      : p.gymType === 'bodyweight'
        ? 'bodyweight'
        : p.gymType === 'small'
          ? 'small'
          : 'full'
  return p.gymAccess ?? fallback
}

/**
 * مفاتيح الملف ⇒ **رموز الأدوات كما هي في الكتالوج فعلًا** (`src/data/exercises.ts`).
 * الرموز مقروءة من المكتبة لا مفترضة: `band` مفردة لا `bands`، و`ez-bar` و`plate`
 * و`rope` و`kettlebell` رموز قائمة لا مرادفات.
 *
 * قرارات التوسعة معلنة لا ضمنية:
 *   • `barbell` يفتح `ez-bar` و`plate` — من يملك بارًا يملك أقراصه، والبار المتعرّج بارٌ.
 *   • `cable` يفتح `rope` — الحبل ملحق كيبل لا محطّة مستقلّة.
 *   • `bodyweight` **مسموح دائمًا**: جسم المستخدم متاح في كل مكان، فلا تُفرَّغ خطة
 *     لأن أحدًا لم يؤشّر على خانة «وزن الجسم».
 *   • `kettlebell` **بلا مفتاح في `Profile`** — لم نسأل عنه، فلا ندّعي امتلاكه
 *     (`kettlebell-swing` وحده يتأثّر). مذكور في التقرير كحقل ناقص.
 */
const EQUIPMENT_CATALOG_TOKENS: Record<Equipment, readonly string[]> = {
  dumbbell: ['dumbbell'],
  barbell: ['barbell', 'ez-bar', 'plate'],
  bench: ['bench'],
  machine: ['machine'],
  cable: ['cable', 'rope'],
  bands: ['band'],
  smith: ['smith'],
  bodyweight: ['bodyweight'],
  // تجهيزة مثبَّتة لا «أداة» يحملها التمرين في `equipment` — تُحرَس بالمعرّف أدناه.
  pullup_bar: [],
}

/**
 * حركات مُصنَّفة `bodyweight` لكنها **تحتاج تجهيزة مثبَّتة**: عقلة أو متوازيًا
 * أو مثبِّت قدمين. الكتالوج لا يعبّر عن ذلك في `equipment`، فحُرِست بالمعرّف —
 * ولا تُحرَس إلا حين يكون المستخدم قد أعلن أدواته (وإلا فسلوك اليوم كما هو).
 */
export const FIXTURE_DEPENDENT_IDS: ReadonlySet<string> = new Set([
  'pull-up',
  'chin-up',
  'hanging-leg-raise',
  'toes-to-bar',
  'inverted-row',
  'chest-dip',
  'nordic-curl',
])

/** الأدوات المُعلَنة، أو `null` حين لم يُسأل بعد (فارغة/غائبة). */
export function declaredEquipment(p: Profile): Equipment[] | null {
  const list = p.equipment ?? []
  return list.length > 0 ? list : null
}

/** رموز الكتالوج المسموحة من قائمة أدوات مُعلَنة. */
export function catalogTokensFor(list: readonly Equipment[]): Set<string> {
  const out = new Set<string>(['bodyweight'])
  for (const item of list) for (const token of EQUIPMENT_CATALOG_TOKENS[item] ?? []) out.add(token)
  return out
}

/** قاعدة المكان — **سلوك ما قبل هذه الموجة حرفيًا**، ويبقى مرجعًا للملفّات التي لم تُسأل. */
function placeRuleset(access: NonNullable<Profile['gymAccess']>): (equipment: string[]) => boolean {
  if (access === 'full') return () => true
  if (access === 'small') {
    // نادٍ صغير: وزن حر + أجهزة أساسية + كيبل أساسي — نستبعد المتخصّص فقط (سميث/حبل).
    const banned = new Set(['smith', 'rope'])
    return (equipment) => equipment.every((e) => !banned.has(e))
  }
  if (access === 'home') {
    // دمبل/بار/وزن جسم/مطاط (+ مقعد شائع منزليًا).
    const allowed = new Set(['dumbbell', 'barbell', 'bodyweight', 'band', 'bench'])
    return (equipment) => equipment.every((e) => allowed.has(e))
  }
  // bodyweight: وزن الجسم فقط.
  const allowed = new Set(['bodyweight'])
  return (equipment) => equipment.every((e) => allowed.has(e))
}

/**
 * Does the user's environment allow an exercise requiring `equipment`? An
 * exercise is trainable only if EVERY tool it needs is available. `homeOnly`
 * forces the home ruleset regardless of the profile — the "أنا في المنزل اليوم"
 * substitution case (a gym member training at home for one session).
 *
 * **لا يرى معرّف التمرين**، فلا يستطيع حراسة التجهيزات المثبَّتة — لذلك
 * `makeExerciseGate` أدناه هو البوّابة المعتمدة في المولّد والاستبدال.
 */
export function makeEquipmentGate(p: Profile, opts?: { homeOnly?: boolean }): (equipment: string[]) => boolean {
  if (opts?.homeOnly) return placeRuleset('home')
  const declared = declaredEquipment(p)
  if (declared) {
    const allowed = catalogTokensFor(declared)
    return (equipment) => equipment.every((e) => allowed.has(e))
  }
  return placeRuleset(resolveGymAccess(p))
}

/**
 * البوّابة الكاملة على مستوى التمرين: الأدوات **والتجهيزات المثبَّتة**.
 * تُستعمل في كل موضع اختيار (حوض المولّد + محرّك الاستبدال) كي لا يفترق
 * ما نولّده عمّا نعرضه بديلًا.
 */
export function makeExerciseGate(p: Profile, opts?: { homeOnly?: boolean }): (ex: Exercise) => boolean {
  const gate = makeEquipmentGate(p, opts)
  const declared = opts?.homeOnly ? null : declaredEquipment(p)
  const fixtureOk = declared && !declared.includes('pullup_bar')
    ? (ex: Exercise) => !FIXTURE_DEPENDENT_IDS.has(ex.id)
    : () => true
  return (ex) => gate(ex.equipment) && fixtureOk(ex)
}

/**
 * نيّة «نسخة الأجهزة» — **مستقلّة عن `resolveGymAccess` تمامًا** (D3).
 *
 * كان `machinesOnly = access === 'full' || access === 'small'`، فكان «نادي»
 * و«أجهزة فقط» متطابقين بايتًا في **٠/٤٨** تهيئة: عضو النادي التجاري لا يرى
 * بارًا ولا دمبلًا أبدًا، وزرّ «التحويل لنسخة الأجهزة» لا يملك حقلًا يكتب فيه
 * نيّته فيولّد الخطة نفسها ويدّعي النجاح.
 *
 * الترتيب: نيّة صريحة ⇒ أدوات مُعلَنة ⇒ المكان (**«أجهزة فقط» وحده**).
 * الحقل الصريح `preferMachines?: boolean` **غير موجود في `Profile` بعد** —
 * يُقرأ بنيويًا هنا كي يعمل فور إضافته، والإضافة مذكورة في التقرير.
 */
export function resolveMachinesOnly(p: Profile): boolean {
  const intent = (p as Profile & { preferMachines?: boolean }).preferMachines
  if (typeof intent === 'boolean') return intent
  const declared = declaredEquipment(p)
  if (declared) {
    return declared.includes('machine') && declared.every((e) => e === 'machine' || e === 'bodyweight')
  }
  return resolveGymAccess(p) === 'small'
}


/**
 * [SOVEREIGN-003] D7 — **كاتب النيّة**، مقابلًا لقارئها `resolveMachinesOnly`.
 *
 * الحقل `preferMachines` ظلّ يُقرأ ولا يُكتب: زرّ «التحويل لنسخة الأجهزة» كان
 * يعيد التوليد من **نفس الملف بلا أي تعديل**، والمولّد حتميّ، فالمخرَج مطابق
 * بايتًا — ثم تُعلَن رسالة نجاح. القارئ بلا كاتبٍ = زرٌّ لا يفعل شيئًا ويدّعي.
 *
 * الحقل غير مُعلَن في `Profile` بعد (`src/types/profile.ts` خارج هذه الحارة)،
 * فيُكتب بنيويًا كما يُقرأ. التخزين يدمج الملف بالنشر (`{...base, ...saved}`)
 * فيبقى الحقل عبر الحفظ والتحميل. وإضافته للنوع مرفوعة في تقرير الحارة.
 */
export function withMachinePreference(p: Profile, prefer: boolean): Profile {
  const next: Profile & { preferMachines?: boolean } = { ...p, preferMachines: prefer }
  return next
}

/** قراءة النيّة الصريحة وحدها (بلا اشتقاق من الأدوات/المكان) — للواجهة والإثبات. */
export function declaredMachinePreference(p: Profile): boolean | undefined {
  const intent = (p as Profile & { preferMachines?: boolean }).preferMachines
  return typeof intent === 'boolean' ? intent : undefined
}
