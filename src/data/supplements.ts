import type { SupplementItem } from '@/types'

export const supplements: SupplementItem[] = [
  {
    name: 'واي بروتين',
    dose: '1 مكيال (30غ)',
    timing: 'بعد التمرين',
    type: 'supplement',
    taken: true,
  },
  {
    name: 'كرياتين مونوهيدرات',
    dose: '5 غرام',
    timing: 'يوميًا — أي وقت',
    type: 'supplement',
    taken: true,
  },
  {
    name: 'أوميغا 3',
    dose: '2 كبسولة',
    timing: 'مع الإفطار',
    type: 'supplement',
    taken: false,
  },
  {
    name: 'فيتامين D3',
    dose: '2000 وحدة',
    timing: 'مع الغداء',
    type: 'supplement',
    taken: false,
    note: 'مهم في حال قلة التعرض للشمس',
  },
  {
    name: 'مغنيسيوم',
    dose: '400 ملغ',
    timing: 'قبل النوم',
    type: 'medication',
    taken: false,
    note: 'يساعد على الاسترخاء وجودة النوم',
  },
]
