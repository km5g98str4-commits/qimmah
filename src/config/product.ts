// هوية المنتج العامة — الاسم، الشعار، الروابط، التنقل.
// 👈 هذا أول ملف يعدّله المشتري لتخصيص علامته بالكامل دون لمس المكونات.

import type { NavItem } from '@/types'

export const product = {
  // اسم المنتج (يمكن أيضًا ضبطه عبر VITE_APP_NAME في .env)
  name: import.meta.env.VITE_APP_NAME ?? 'Gym OS',
  tagline: 'نظامك الكامل للياقة والتغذية',
  description:
    'منصة واحدة فاخرة لمتابعة تمارينك، مكملاتك، أدويتك، تغذيتك، قياساتك، وروتينك — مصممة للسوق السعودي والخليجي.',
  locale: 'ar',
  direction: 'rtl' as const,

  // روابط الدعوة للفعل (يمكن ضبطها عبر .env)
  contactUrl: import.meta.env.VITE_CONTACT_URL ?? '#pricing',
  checkoutUrl: import.meta.env.VITE_CHECKOUT_URL ?? '#pricing',

  // تسميات عامة
  ctaLabel: 'ابدأ الآن',
  footerNote: 'صُمّم بعناية للسوق السعودي والخليجي',
  rightsNote: 'جميع الحقوق محفوظة.',
  year: 2026,
}

// روابط التنقّل في الهيدر والفوتر
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
