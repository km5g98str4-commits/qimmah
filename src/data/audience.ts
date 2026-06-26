// جمهور المنتج — لمن قِمّة مناسب، ولمن ليس مناسبًا.
// الصدق في التموضع يبني الثقة ويحسّن جودة العملاء.

import type { AudienceItem } from '@/types'

export const forWhom: AudienceItem[] = [
  {
    icon: 'Dumbbell',
    title: 'المتمرّن الجاد',
    description: 'من مبتدئ إلى متقدّم يريد تنظيم تمارينه وتغذيته وقياساته في مكان واحد.',
  },
  {
    icon: 'Users',
    title: 'المدرّب الشخصي',
    description: 'يتابع متدرّبيه ويريد هوية احترافية تعكس مستواه.',
  },
  {
    icon: 'Building2',
    title: 'الصالات الرياضية',
    description: 'تبحث عن نظام بهويتها الخاصة (White-label) لمتابعة الأعضاء.',
  },
  {
    icon: 'Code2',
    title: 'رواد الأعمال والمطوّرون',
    description: 'يريدون إطلاق منتج لياقة عربي بسرعة دون البناء من الصفر.',
  },
]

export const notForWhom: AudienceItem[] = [
  {
    icon: 'Users',
    title: 'من يريد مدرّبًا بشريًا',
    description: 'قِمّة أداة تنظيم ومتابعة، لا بديلًا عن مدرّب يصمم لك البرنامج.',
  },
  {
    icon: 'Smartphone',
    title: 'من يبحث عن تطبيق متاجر',
    description: 'قِمّة حاليًا منصّة ويب responsive، وليس تطبيق جوال أصلي على المتاجر.',
  },
  {
    icon: 'Activity',
    title: 'من يحتاج تكامل أجهزة طبية',
    description: 'لا يوجد حاليًا ربط مباشر بساعات أو أجهزة قياس متقدمة.',
  },
  {
    icon: 'Wallet',
    title: 'من يريد حلًّا مجانيًا بالكامل',
    description: 'قِمّة منتج مدفوع بقيمة واضحة — لا نقدّم نسخة مجانية دائمة.',
  },
]
