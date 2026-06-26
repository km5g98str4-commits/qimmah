import type { BodyMetric } from '@/types'

export const bodyMetrics: BodyMetric[] = [
  { label: 'الوزن', value: '81.8', unit: 'كجم', change: -4.9, icon: 'Scale' },
  { label: 'نسبة الدهون', value: '15.2', unit: '%', change: -2.1, icon: 'Percent' },
  { label: 'الكتلة العضلية', value: '38.4', unit: 'كجم', change: 1.8, icon: 'Activity' },
  { label: 'محيط الخصر', value: '84', unit: 'سم', change: -3.0, icon: 'Ruler' },
  { label: 'محيط الصدر', value: '104', unit: 'سم', change: 1.5, icon: 'Maximize' },
  { label: 'محيط الذراع', value: '38.5', unit: 'سم', change: 1.2, icon: 'Dumbbell' },
]
