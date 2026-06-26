// خيارات ألوان الصفحة المعروضة في قسم التخصيص.
// لوحة دافئة فاتحة تناسب هوية الخطة الشخصية.

import type { CustomizationOption } from '@/types'

export const accentOptions: CustomizationOption[] = [
  {
    id: 'orange',
    label: 'برتقالي',
    swatch: '#F26A21',
    description: 'الافتراضي — دافئ ونشِط',
  },
  {
    id: 'amber',
    label: 'كهرماني',
    swatch: '#E0941F',
    description: 'دفء وهدوء',
  },
  {
    id: 'terracotta',
    label: 'طيني',
    swatch: '#C2562E',
    description: 'ترابي وأنيق',
  },
  {
    id: 'olive',
    label: 'زيتوني',
    swatch: '#7C7A3A',
    description: 'طبيعي ومريح',
  },
  {
    id: 'clay',
    label: 'قرميدي',
    swatch: '#B14A3B',
    description: 'جريء ودافئ',
  },
]
