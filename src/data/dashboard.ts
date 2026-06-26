import type { DashboardCard, ProgressPoint } from '@/types'

export const dashboardCards: DashboardCard[] = [
  {
    icon: 'Flame',
    label: 'سعرات اليوم',
    value: '2,140',
    sub: 'من هدف 2,600',
    accent: 'text-orange-400',
  },
  {
    icon: 'Dumbbell',
    label: 'تمارين الأسبوع',
    value: '4 / 6',
    sub: 'يومان متبقّيان',
    accent: 'text-brand-400',
  },
  {
    icon: 'Droplets',
    label: 'الماء',
    value: '2.4 لتر',
    sub: 'من 3 لتر',
    accent: 'text-sky-400',
  },
  {
    icon: 'Moon',
    label: 'النوم',
    value: '7.2 س',
    sub: 'جودة جيدة',
    accent: 'text-violet-400',
  },
]

// نقاط تقدم الوزن خلال 8 أسابيع (kg)
export const weightProgress: ProgressPoint[] = [
  { label: 'أسبوع 1', value: 86 },
  { label: 'أسبوع 2', value: 85.4 },
  { label: 'أسبوع 3', value: 85 },
  { label: 'أسبوع 4', value: 84.2 },
  { label: 'أسبوع 5', value: 83.6 },
  { label: 'أسبوع 6', value: 83.1 },
  { label: 'أسبوع 7', value: 82.5 },
  { label: 'أسبوع 8', value: 81.8 },
]
