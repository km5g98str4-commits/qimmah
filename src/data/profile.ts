import type { ProfileField } from '@/types'

// البيانات الأساسية للشخص — عدّلها لتناسب حالتك.
export const profileFields: ProfileField[] = [
  { icon: 'Users', label: 'العمر', value: '24', unit: 'سنة' },
  { icon: 'Maximize', label: 'الطول', value: '178', unit: 'سم' },
  { icon: 'Scale', label: 'الوزن الحالي', value: '86', unit: 'كجم' },
  { icon: 'Target', label: 'الوزن الهدف', value: '78', unit: 'كجم' },
  { icon: 'Activity', label: 'مستوى النشاط', value: 'متوسط' },
  { icon: 'Flame', label: 'سعرات اليوم', value: '2,600', unit: 'سعرة' },
]
