import type { Feature, Stat } from '@/types'

export const heroStats: Stat[] = [
  { value: '7', label: 'أقسام متكاملة' },
  { value: '100%', label: 'قابل للتخصيص' },
  { value: 'RTL', label: 'عربي أولاً' },
]

export const features: Feature[] = [
  {
    icon: 'Dumbbell',
    title: 'متابعة التمارين',
    description: 'سجّل المجموعات والتكرارات والأوزان، وتابع تقدمك في كل تمرين.',
  },
  {
    icon: 'Pill',
    title: 'المكملات والأدوية',
    description: 'تذكيرات بالجرعات والتوقيت، مع فصل واضح بين المكمل والدواء.',
  },
  {
    icon: 'Salad',
    title: 'التغذية والماكروز',
    description: 'احسب البروتين والكربوهيدرات والدهون لكل وجبة بسهولة.',
  },
  {
    icon: 'Ruler',
    title: 'قياسات الجسم',
    description: 'الوزن، نسبة الدهون، محيط الخصر والصدر — كلها في مكان واحد.',
  },
  {
    icon: 'CalendarDays',
    title: 'الروتين الأسبوعي',
    description: 'خطّط أسبوعك بين Push وPull وLegs وكارديو وراحة.',
  },
  {
    icon: 'Target',
    title: 'الأهداف الشخصية',
    description: 'حدّد أهدافك وتابع نسبة إنجازها بصريًا وبشكل محفّز.',
  },
]
