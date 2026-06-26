// إعدادات الموقع العامة — العلامة، التنقل، الروابط.
// عدّل من هنا لتخصيص الهوية بالكامل دون لمس المكونات.

import type { NavItem } from '@/types'

export const site = {
  name: import.meta.env.VITE_APP_NAME ?? 'Gym OS',
  tagline: 'نظامك الكامل للياقة والتغذية',
  description:
    'منصة واحدة فاخرة لمتابعة تمارينك، مكملاتك، أدويتك، تغذيتك، قياساتك، وروتينك — مصممة للسوق السعودي والخليجي.',
  locale: 'ar',
  direction: 'rtl' as const,
  contactUrl: import.meta.env.VITE_CONTACT_URL ?? '#pricing',
  checkoutUrl: import.meta.env.VITE_CHECKOUT_URL ?? '#pricing',
  year: 2026,
}

export const nav: NavItem[] = [
  { label: 'الرئيسية', href: '#hero' },
  { label: 'اللوحة', href: '#dashboard' },
  { label: 'التمارين', href: '#workout' },
  { label: 'المكملات', href: '#supplements' },
  { label: 'التغذية', href: '#meals' },
  { label: 'القياسات', href: '#metrics' },
  { label: 'الروتين', href: '#routine' },
  { label: 'الأسعار', href: '#pricing' },
]
