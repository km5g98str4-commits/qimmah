import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'

/**
 * سطح تراكب على مستوى التطبيق — [MOBILE-SHELL-001]
 *
 * ═══ لماذا بوّابة لا `fixed` في مكانه ═══
 * كل حوار وورقة في قِمّة كان `fixed inset-0` **حيث كُتب** — أي داخل متمرّر القشرة
 * (`main.app-scroll`) في التبويبات الرئيسية. وWebKit على iOS يحبس العنصر الثابت
 * داخل متمرّر التمرير فيصير `absolute` عمليًا: الحاجب لا يغطّي الهيدر ولا شريط
 * التنقّل (يبقيان قابلَين للنقر خلف «حوار»)، والورقة السفلية تجلس فوق الشريط،
 * ولوح الباركود يُقصّ. مقيس بمحاكاة الحبس (`transform` على المتمرّر) في رحلة
 * `scripts/e2e/mobile-shell.mjs`، ووقع فعلًا على آيفون المؤسس في باني الجدول.
 *
 * ═══ العقد ═══
 *   • يُرسَم في `document.body` — خارج أي متمرّر — فلا سلف يحبسه.
 *   • يملأ **المنطقة المرئية** لا الشاشة: `.app-viewport-h` تنكمش مع لوحة المفاتيح
 *     (`--qimmah-vvh`) فتبقى الورقة السفلية فوق اللوحة لا تحتها.
 *   • يبقى شجرة React نفسها (السياقات والتركيز والأحداث كما هي) — البوّابة تنقل
 *     DOM لا المكوّن.
 *   • يحمل وسم `data-app-overlay` للقياس؛ وما عداه `div` عادي بخصائصه.
 */
export const AppOverlay = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(function AppOverlay(
  { className, ...rest },
  ref,
) {
  const node = <div ref={ref} data-app-overlay="" className={cn('fixed inset-x-0 top-0 app-viewport-h', className)} {...rest} />
  // بلا DOM (تصيير خادم في البراهين) لا معنى للبوّابة: يُصيَّر السطح نفسه في مكانه
  // فتبقى محتوياته مقيسة (test:numeral-policy) بدل أن تختفي من HTML بصمت.
  if (typeof document === 'undefined') return node
  return createPortal(node, document.body)
})
