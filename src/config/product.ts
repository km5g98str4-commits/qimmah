// هوية المنتج العامة — الاسم، الشعار، الروابط، التنقل.
// 👈 هذا أول ملف يعدّله المشتري لتخصيص علامته بالكامل دون لمس المكونات.

import type { NavItem } from '@/types'

export const product = {
  // اسم الصفحة الشخصية (يمكن أيضًا ضبطه عبر VITE_APP_NAME في .env)
  name: import.meta.env.VITE_APP_NAME ?? 'قِمّة',
  nameLatin: 'Qimmah',
  tagline: 'خطتك الشخصية للنادي',
  description:
    'قِمّة يجمع تمارينك، أكلك، مكملاتك، أدويتك، قياساتك، والتزامك اليومي في مكان واحد — تطبيق شخصي للرياضي الفرد، عربي بالكامل، يعمل على جهازك.',
  locale: 'ar',
  direction: 'rtl' as const,

  // روابط داخلية (يمكن ضبطها عبر .env)
  contactUrl: import.meta.env.VITE_CONTACT_URL ?? '#goal',
  checkoutUrl: import.meta.env.VITE_CHECKOUT_URL ?? '#goal',

  // تسميات عامة
  ctaLabel: 'افتح خطتي',
  footerNote: 'تطبيقك الشخصي للتمرين والتغذية والمتابعة',
  rightsNote: 'تطبيق شخصي للرياضي الفرد.',
  year: 2026,
}

// روابط التنقّل في الهيدر والفوتر — أقسام الخطة الشخصية
export const nav: NavItem[] = [
  { label: 'يومي', href: '#today' },
  { label: 'هدفي', href: '#goal' },
  { label: 'بياناتي', href: '#profile' },
  { label: 'جدولي', href: '#routine' },
  { label: 'تماريني', href: '#workout' },
  { label: 'أكلي', href: '#meals' },
  { label: 'مكملاتي', href: '#supplements' },
  { label: 'التزامي', href: '#commitment' },
]
