// خيارات التخصيص المعروضة في قسم Customization.
// هذه بيانات عرض فقط في القالب — يمكن ربطها بحالة فعلية عند التطوير.

import type { CustomizationOption } from '@/types'

export const accentOptions: CustomizationOption[] = [
  {
    id: 'emerald',
    label: 'زمردي',
    swatch: '#10b981',
    description: 'الافتراضي — طاقة وانتعاش',
  },
  {
    id: 'gold',
    label: 'ذهبي',
    swatch: '#d4af37',
    description: 'فخامة وهيبة',
  },
  {
    id: 'azure',
    label: 'أزرق',
    swatch: '#3b82f6',
    description: 'هدوء واحترافية',
  },
  {
    id: 'crimson',
    label: 'قرمزي',
    swatch: '#ef4444',
    description: 'قوة وحماس',
  },
  {
    id: 'violet',
    label: 'بنفسجي',
    swatch: '#8b5cf6',
    description: 'إبداع وتميّز',
  },
]
