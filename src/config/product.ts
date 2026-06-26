// هوية المنتج العامة — الاسم، الشعار، الروابط، التنقل.
// 👈 هذا أول ملف يعدّله المشتري لتخصيص علامته بالكامل دون لمس المكونات.

import type { NavItem } from '@/types'

export const product = {
  // اسم المنتج (يمكن أيضًا ضبطه عبر VITE_APP_NAME في .env)
  name: import.meta.env.VITE_APP_NAME ?? 'قِمّة',
  nameLatin: 'Qimmah',
  tagline: 'نظام تشغيل اللياقة العربي',
  description:
    'قِمّة — منصة واحدة فاخرة تجمع تمارينك، مكملاتك، أدويتك، تغذيتك، وقياساتك في مكان واحد. عربية بالكامل، ومصممة للسوق السعودي والخليجي.',
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
  { label: 'المشكلة', href: '#problem' },
  { label: 'الحل', href: '#solution' },
  { label: 'المزايا', href: '#benefits' },
  { label: 'لمن قِمّة؟', href: '#audience' },
  { label: 'الأسعار', href: '#pricing' },
  { label: 'الأسئلة', href: '#faq' },
]
