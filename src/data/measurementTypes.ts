import type { MeasurementType } from '@/types/progress'

// أنواع القياسات المتاحة للاختيار.
// القياسات الصحية المتقدمة (ضغط/سكر) للتسجيل فقط وليست للتشخيص.

export const measurementTypes: MeasurementType[] = [
  { id: 'weightKg', nameAr: 'الوزن', nameEn: 'Weight', unit: 'كجم', category: 'body' },
  { id: 'waistCm', nameAr: 'محيط الخصر', nameEn: 'Waist', unit: 'سم', category: 'body' },
  { id: 'chestCm', nameAr: 'محيط الصدر', nameEn: 'Chest', unit: 'سم', category: 'body' },
  { id: 'armCm', nameAr: 'محيط الذراع', nameEn: 'Arm', unit: 'سم', category: 'body' },
  { id: 'thighCm', nameAr: 'محيط الفخذ', nameEn: 'Thigh', unit: 'سم', category: 'body' },
  { id: 'neckCm', nameAr: 'محيط الرقبة', nameEn: 'Neck', unit: 'سم', category: 'body' },
  { id: 'hipCm', nameAr: 'محيط الورك', nameEn: 'Hip', unit: 'سم', category: 'body' },
  { id: 'bodyFatPercent', nameAr: 'نسبة الدهون', nameEn: 'Body fat', unit: '%', category: 'body' },
  { id: 'steps', nameAr: 'الخطوات', nameEn: 'Steps', unit: 'خطوة', category: 'performance' },
  { id: 'sleepHours', nameAr: 'ساعات النوم', nameEn: 'Sleep', unit: 'ساعة', category: 'lifestyle' },
  { id: 'energyLevel', nameAr: 'مستوى الطاقة', nameEn: 'Energy level', unit: '/10', category: 'lifestyle' },
  { id: 'mood', nameAr: 'المزاج', nameEn: 'Mood', unit: '', category: 'lifestyle' },
  { id: 'progressPhotoNote', nameAr: 'ملاحظة صورة التقدّم', nameEn: 'Progress photo note', unit: '', category: 'photo' },
  { id: 'bloodPressure', nameAr: 'ضغط الدم', nameEn: 'Blood pressure', unit: 'mmHg', category: 'advanced', isAdvanced: true, noteAr: 'للتسجيل فقط، وليس للتشخيص.', noteEn: 'For recording only, not diagnosis.' },
  { id: 'bloodSugar', nameAr: 'سكر الدم', nameEn: 'Blood sugar', unit: 'mg/dL', category: 'advanced', isAdvanced: true, noteAr: 'للتسجيل فقط، وليس للتشخيص.', noteEn: 'For recording only, not diagnosis.' },
]

export const measurementTypeMap: Record<string, MeasurementType> = Object.fromEntries(
  measurementTypes.map((m) => [m.id, m]),
)

export function getMeasurementType(id: string): MeasurementType | undefined {
  return measurementTypeMap[id]
}
