// سجلّات المفاتيح البنيوية للإعداد — **نقيّة بلا أي اعتمادية**.
//
// لماذا ملفّ مستقلّ؟ لأن مستهلكيه على طرفَي السلسلة: `onboardingV2Flow` (حالة
// الواجهة والمسودّة) و`onboardingProfile` (تحويل مصدر الحقيقة إلى ملفّ المولّد).
// وضعها في الأوّل كان يجرّ محرّك التخصيص (`personalization/experience`) إلى
// حزمة الإقلاع عبر الثاني — كلفة حزمة مقابل ثلاثة ثوابت.
//
// وكل مصفوفة هنا مرآة حرفية لاتّحاد في `@/types/profile`، ويحرس التطابقَ
// تأكيدُ نوعٍ في نهاية الملف: أي قيمة تُضاف هناك ولا تُضاف هنا تسقط البناء.

import type { Equipment, InjuryAreaKey } from '@/types/profile'

/**
 * الأدوات التي يعلن المستخدم امتلاكها. **المكان سياق، والأداة حاكمة**
 * (`types/profile.ts` · [SOVEREIGN-EQUIPMENT-001]).
 */
export const EQUIPMENT_VALUES = [
  'dumbbell',
  'barbell',
  'bench',
  'machine',
  'cable',
  'bands',
  'smith',
  'pullup_bar',
  'bodyweight',
] as const

/** مناطق الإصابة كمفاتيح ثابتة — لا نصًّا موطَّنًا يُطابَق بتعبير نمطي. */
export const INJURY_AREA_VALUES = ['knee', 'shoulder', 'lower_back', 'wrist', 'elbow', 'ankle'] as const

/** وزن الجسم متاح دائمًا: لا يملكه أحد ولا يفقده أحد. */
export const ALWAYS_AVAILABLE_EQUIPMENT: Equipment = 'bodyweight'

export function isEquipmentKey(value: unknown): value is Equipment {
  return typeof value === 'string' && (EQUIPMENT_VALUES as readonly string[]).includes(value)
}

export function isInjuryAreaKey(value: unknown): value is InjuryAreaKey {
  return typeof value === 'string' && (INJURY_AREA_VALUES as readonly string[]).includes(value)
}

/**
 * يصفّي مدخلًا غير موثوق (تخزين محلي، مزامنة، مسودّة قديمة) إلى مفاتيح صحيحة
 * بلا تكرار وبترتيب السجلّ — فلا يعتمد أي مستهلك على ترتيب إدخال المستخدم.
 */
export function normalizeEquipment(raw: unknown): Equipment[] {
  if (!Array.isArray(raw)) return []
  const picked = new Set(raw.filter(isEquipmentKey))
  return EQUIPMENT_VALUES.filter((key) => picked.has(key))
}

/** المثيل نفسه لمناطق الإصابة. */
export function normalizeInjuryAreas(raw: unknown): InjuryAreaKey[] {
  if (!Array.isArray(raw)) return []
  const picked = new Set(raw.filter(isInjuryAreaKey))
  return INJURY_AREA_VALUES.filter((key) => picked.has(key))
}

// ——— حارس التطابق مع الاتّحادات المعلنة في `@/types/profile` ———
// إسناد في الاتّجاهين: قيمة زائدة هنا تسقط الأولى، وقيمة ناقصة تسقط الثانية.
const _equipmentCoversUnion: readonly Equipment[] = EQUIPMENT_VALUES
const _equipmentIsCovered: (typeof EQUIPMENT_VALUES)[number] extends Equipment
  ? Equipment extends (typeof EQUIPMENT_VALUES)[number]
    ? true
    : never
  : never = true
const _injuryCoversUnion: readonly InjuryAreaKey[] = INJURY_AREA_VALUES
const _injuryIsCovered: (typeof INJURY_AREA_VALUES)[number] extends InjuryAreaKey
  ? InjuryAreaKey extends (typeof INJURY_AREA_VALUES)[number]
    ? true
    : never
  : never = true
void _equipmentCoversUnion
void _equipmentIsCovered
void _injuryCoversUnion
void _injuryIsCovered
