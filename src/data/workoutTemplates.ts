import type { WorkoutTemplate } from '@/types/workout'

// برامج التمرين المعتمدة (النهائية) — أجهزة فقط، بمعرّفات الكتالوج القانونية حصريًا.
// أربعة برامج: علوي/سفلي، جسم كامل، تقسيمة أرنولد، ودفع/سحب/أرجل (بنسختَي ٣ و٦ أيام لنفس البرنامج).
// لا وزن حرّ، لا كيبل، لا كارديو داخل أي برنامج. الكيبل/الوزن الحرّ يبقى للمكتبة والبنّاء المخصّص فقط.
//
// ترتيب تمارين كل يوم صريحٌ ومقصود (Q19)، لا أبجدي ولا عشوائي، ويتبع قانون
// `src/lib/workoutOrder.ts` المشتقّ من الكتالوج:
//   ١) الحركة الأساسية/الأكثر تطلّبًا أولًا — مركّبات الأرجل (سكوات/هينج).
//   ٢) الحركات المركّبة التالية — دفع/سحب (مركّبات علوية).
//   ٣) تمارين العزل بعدها.
//   ٤) السمانة/الكور/النهايات في الأخير.
// برهان `npm run test:workout-order` يفشل إن خالف أيّ يومٍ هذا الترتيب.

export const workoutTemplates: WorkoutTemplate[] = [
  {
    id: 'upper-lower',
    nameAr: 'علوي / سفلي',
    nameEn: 'Upper / Lower',
    descriptionAr: 'أربعة أيام: يومان علوي ويومان سفلي — توازن قوي بين التكرار والاستشفاء.',
    descriptionEn: 'Four days — two upper and two lower — a strong balance of frequency and recovery.',
    recommendedFor: 'متوسط',
    days: [
      { id: 'upper-lower-d1', nameAr: 'علوي', nameEn: 'Upper', exerciseIds: ['incline-chest-press-machine', 'chest-press-machine', 'lat-pulldown-machine', 'shoulder-press-machine', 'pec-deck-machine', 'triceps-extension-machine', 'preacher-curl-machine'] },
      { id: 'upper-lower-d2', nameAr: 'سفلي', nameEn: 'Lower', exerciseIds: ['leg-press-machine', 'glute-machine', 'seated-leg-curl', 'leg-extension-machine', 'hip-abduction-machine', 'seated-calf-raise-machine'] },
      { id: 'upper-lower-d3', nameAr: 'علوي', nameEn: 'Upper', exerciseIds: ['chest-supported-row-machine', 'lat-pulldown-machine', 'incline-chest-press-machine', 'rear-delt-row-machine', 'lateral-raise-machine', 'triceps-extension-machine', 'preacher-curl-machine'] },
      { id: 'upper-lower-d4', nameAr: 'سفلي', nameEn: 'Lower', exerciseIds: ['leg-press-machine', 'glute-machine', 'seated-leg-curl', 'leg-extension-machine', 'hip-abduction-machine', 'seated-calf-raise-machine'] },
    ],
  },
  {
    id: 'full-body',
    nameAr: 'جسم كامل',
    nameEn: 'Full Body',
    descriptionAr: 'ثلاثة أيام لكامل الجسم — مثالي للبداية وللأسابيع المزدحمة.',
    descriptionEn: 'Three whole-body days — ideal for starting out and for busy weeks.',
    recommendedFor: 'مبتدئ–متوسط',
    days: [
      { id: 'full-body-d1', nameAr: 'جسم كامل', nameEn: 'Full Body', exerciseIds: ['leg-press-machine', 'incline-chest-press-machine', 'lat-pulldown-machine', 'shoulder-press-machine', 'hip-abduction-machine'] },
      { id: 'full-body-d2', nameAr: 'جسم كامل', nameEn: 'Full Body', exerciseIds: ['glute-machine', 'chest-supported-row-machine', 'chest-press-machine', 'seated-leg-curl', 'preacher-curl-machine', 'triceps-extension-machine'] },
      { id: 'full-body-d3', nameAr: 'جسم كامل', nameEn: 'Full Body', exerciseIds: ['lat-pulldown-machine', 'rear-delt-row-machine', 'leg-extension-machine', 'pec-deck-machine', 'lateral-raise-machine', 'seated-calf-raise-machine'] },
    ],
  },
  {
    id: 'arnold',
    nameAr: 'تقسيمة أرنولد',
    nameEn: 'Arnold Split',
    descriptionAr: 'ستة أيام: صدر وظهر، أكتاف وذراعان، أرجل — مكرّرة مرتين بحجم عمل عالٍ.',
    descriptionEn: 'Six days — chest & back, shoulders & arms, legs — twice through, high volume.',
    recommendedFor: 'متقدّم',
    days: [
      { id: 'arnold-d1', nameAr: 'صدر وظهر', nameEn: 'Chest & Back', exerciseIds: ['incline-chest-press-machine', 'chest-press-machine', 'lat-pulldown-machine', 'chest-supported-row-machine', 'rear-delt-row-machine', 'pec-deck-machine'] },
      { id: 'arnold-d2', nameAr: 'أكتاف وذراعان', nameEn: 'Shoulders & Arms', exerciseIds: ['shoulder-press-machine', 'rear-delt-row-machine', 'lateral-raise-machine', 'preacher-curl-machine', 'triceps-extension-machine'] },
      { id: 'arnold-d3', nameAr: 'أرجل', nameEn: 'Legs', exerciseIds: ['leg-press-machine', 'glute-machine', 'seated-leg-curl', 'leg-extension-machine', 'hip-abduction-machine', 'seated-calf-raise-machine'] },
      { id: 'arnold-d4', nameAr: 'صدر وظهر', nameEn: 'Chest & Back', exerciseIds: ['chest-press-machine', 'incline-chest-press-machine', 'chest-supported-row-machine', 'lat-pulldown-machine', 'rear-delt-row-machine', 'pec-deck-machine'] },
      { id: 'arnold-d5', nameAr: 'أكتاف وذراعان', nameEn: 'Shoulders & Arms', exerciseIds: ['shoulder-press-machine', 'rear-delt-row-machine', 'lateral-raise-machine', 'preacher-curl-machine', 'triceps-extension-machine'] },
      { id: 'arnold-d6', nameAr: 'أرجل', nameEn: 'Legs', exerciseIds: ['leg-press-machine', 'glute-machine', 'seated-leg-curl', 'leg-extension-machine', 'hip-abduction-machine', 'seated-calf-raise-machine'] },
    ],
  },
  {
    id: 'ppl-3',
    nameAr: 'دفع / سحب / أرجل — ٣ أيام',
    nameEn: 'Push / Pull / Legs — 3 Days',
    descriptionAr: 'دورة واحدة أسبوعيًا: يوم دفع، يوم سحب، يوم أرجل.',
    descriptionEn: 'One cycle a week — a push day, a pull day, and a legs day.',
    recommendedFor: 'متوسط',
    days: [
      { id: 'ppl-3-push', nameAr: 'دفع', nameEn: 'Push', exerciseIds: ['incline-chest-press-machine', 'chest-press-machine', 'shoulder-press-machine', 'pec-deck-machine', 'lateral-raise-machine', 'triceps-extension-machine'] },
      { id: 'ppl-3-pull', nameAr: 'سحب', nameEn: 'Pull', exerciseIds: ['lat-pulldown-machine', 'chest-supported-row-machine', 'rear-delt-row-machine', 'preacher-curl-machine'] },
      { id: 'ppl-3-legs', nameAr: 'أرجل', nameEn: 'Legs', exerciseIds: ['leg-press-machine', 'glute-machine', 'seated-leg-curl', 'leg-extension-machine', 'hip-abduction-machine', 'seated-calf-raise-machine'] },
    ],
  },
  {
    id: 'ppl-6',
    nameAr: 'دفع / سحب / أرجل — ٦ أيام',
    nameEn: 'Push / Pull / Legs — 6 Days',
    descriptionAr: 'نفس برنامج الدفع/السحب/الأرجل بدورتين أسبوعيًا لتكرار أعلى.',
    descriptionEn: 'The same Push/Pull/Legs program run twice a week for higher frequency.',
    recommendedFor: 'متقدّم',
    days: [
      { id: 'ppl-6-push-1', nameAr: 'دفع', nameEn: 'Push', exerciseIds: ['incline-chest-press-machine', 'chest-press-machine', 'shoulder-press-machine', 'pec-deck-machine', 'lateral-raise-machine', 'triceps-extension-machine'] },
      { id: 'ppl-6-pull-1', nameAr: 'سحب', nameEn: 'Pull', exerciseIds: ['lat-pulldown-machine', 'chest-supported-row-machine', 'rear-delt-row-machine', 'preacher-curl-machine'] },
      { id: 'ppl-6-legs-1', nameAr: 'أرجل', nameEn: 'Legs', exerciseIds: ['leg-press-machine', 'glute-machine', 'seated-leg-curl', 'leg-extension-machine', 'hip-abduction-machine', 'seated-calf-raise-machine'] },
      { id: 'ppl-6-push-2', nameAr: 'دفع', nameEn: 'Push', exerciseIds: ['incline-chest-press-machine', 'chest-press-machine', 'shoulder-press-machine', 'pec-deck-machine', 'lateral-raise-machine', 'triceps-extension-machine'] },
      { id: 'ppl-6-pull-2', nameAr: 'سحب', nameEn: 'Pull', exerciseIds: ['lat-pulldown-machine', 'chest-supported-row-machine', 'rear-delt-row-machine', 'preacher-curl-machine'] },
      { id: 'ppl-6-legs-2', nameAr: 'أرجل', nameEn: 'Legs', exerciseIds: ['leg-press-machine', 'glute-machine', 'seated-leg-curl', 'leg-extension-machine', 'hip-abduction-machine', 'seated-calf-raise-machine'] },
    ],
  },
  {
    // ليس برنامجًا — هيكل «البنّاء المخصّص»: يوم فارغ يُضيف منه المستخدم تمارينه من المكتبة (يشمل الكيبل).
    id: 'custom',
    nameAr: 'مخصّص',
    nameEn: 'Custom',
    descriptionAr: 'ابدأ من يوم فارغ وأضف تمارينك من المكتبة بنفسك.',
    descriptionEn: 'Start from an empty day and add exercises from the library yourself.',
    recommendedFor: 'الكل',
    days: [{ id: 'custom-d1', nameAr: 'تمرين', nameEn: 'Workout', exerciseIds: [] }],
  },
]

export const templateMap: Record<string, WorkoutTemplate> = Object.fromEntries(
  workoutTemplates.map((t) => [t.id, t]),
)

export function getTemplate(id: string): WorkoutTemplate | undefined {
  return templateMap[id]
}
