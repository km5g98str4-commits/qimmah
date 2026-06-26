// لمن هذه الصفحة الشخصية — وما الذي لا تقدّمه.
// صفحة فردية لتنظيم خطتك، وليست منصة أو خدمة جماعية.

import type { AudienceItem } from '@/types'

export const forWhom: AudienceItem[] = [
  {
    icon: 'Dumbbell',
    title: 'من بدأ رحلته',
    description: 'تبي مكان واحد واضح يجمع هدفك وجدولك وتمارينك وأكلك بدون تشتت.',
  },
  {
    icon: 'Target',
    title: 'من عنده هدف محدّد',
    description: 'وزن تبي توصله أو لياقة تبي تبنيها، وتحتاج خطة مرتبة تتابعها يوميًا.',
  },
  {
    icon: 'Smartphone',
    title: 'من يحب البساطة',
    description: 'صفحة واحدة تفتحها من جوالك بأي وقت — بدل أدوات متفرقة.',
  },
]

export const notForWhom: AudienceItem[] = [
  {
    icon: 'AlertTriangle',
    title: 'ليست استشارة طبية',
    description: 'الصفحة لتنظيم خطتك فقط، وليست بديلًا عن رأي مختص أو طبيب.',
  },
  {
    icon: 'Activity',
    title: 'ليست ربط أجهزة',
    description: 'لا يوجد حاليًا ربط مباشر بساعات أو أجهزة قياس متقدمة.',
  },
]
