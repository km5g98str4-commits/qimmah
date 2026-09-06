// تسميات المعدّات المعرّبة — طبقة عرض فقط، تعيد استخدام قاموس المكتبة الموجود
// (src/i18n/dict/library.ts) بدل قاموس جديد. لا تلمس بيانات التمارين المصدرية:
// المعرّفات الخام (barbell/machine/…) تبقى كما هي في البيانات، وتُترجَم عند الرسم.

import type { Lang } from '@/lib/appPreferences'
import { libraryStrings, type LibraryStrings } from '@/i18n/dict/library'

const EQUIP_KEY: Record<string, keyof LibraryStrings> = {
  barbell: 'equipBarbell',
  dumbbell: 'equipDumbbell',
  machine: 'equipMachine',
  cable: 'equipCable',
  bodyweight: 'equipBodyweight',
  bench: 'equipBench',
  kettlebell: 'equipKettlebell',
  smith: 'equipSmith',
  'ez-bar': 'equipEzBar',
  band: 'equipBand',
  plate: 'equipPlate',
  rope: 'equipRope',
}

/** Localized equipment label for a raw equipment id; falls back to the id itself. */
export function equipmentLabel(eq: string, lang: Lang): string {
  const key = EQUIP_KEY[eq]
  return key ? libraryStrings[lang][key] : eq
}
