import { product } from '@/config/product'
import { useCustomization } from '@/lib/customizationContext'
import { BUILD_LABEL } from '@/lib/buildInfo'
import { getLanguage } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import { miscStrings } from '@/i18n/dict/misc'
import { Icon } from './Icon'
import { POLICY_LINKS } from '@/legal/canonicalLegalContent'

/**
 * الفوتر — هوية + روابط الثقة (الخصوصية/الشروط/التواصل) + حقوق.
 * أُزيلت شبكة مراسي التسويق القديمة (#hero/#today/…) — أقسامها حُذفت في M3 فكانت روابط ميتة.
 */
export function Footer() {
  const { customization } = useCustomization()
  const lang = getLanguage()
  const d = miscStrings[lang]
  const brandName = customization.identity.brandName || getStrings(lang).brand
  return (
    <footer className="border-t border-line bg-beige">
      <div className="container-page py-10">
        <div className="max-w-sm">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white">
              <Icon name="Mountain" className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <span className="text-lg font-extrabold text-ink-900">{brandName}</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-500">{d.footerBlurb}</p>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 text-xs text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {product.year} {brandName}. {d.footerRights}
            <span className="ms-2 text-ink-400" title={d.buildIdTitle}>{BUILD_LABEL}</span>
          </p>
          {/* [CTO-009/WP-7] روابط الفوتر القانونية كانت ١٦بكسل ارتفاعًا (نصّ عارٍ
              بلا حشو) — أصغر أهداف اللمس في التطبيق كلّه، وهي روابط امتثال
              تُفتح على الجوال. `inline-flex` + `min-h-[44px]` يرفعها للحدّ بلا
              تغيير حجم الخطّ ولا معنى النصّ. */}
          <div className="flex flex-wrap items-center gap-x-4">
            <a href={POLICY_LINKS.privacy} className="inline-flex min-h-[44px] items-center text-ink-500 transition-colors hover:text-brand-300">{d.privacy}</a>
            <a href={POLICY_LINKS.terms} className="inline-flex min-h-[44px] items-center text-ink-500 transition-colors hover:text-brand-300">{d.terms}</a>
            <a href="#/contact" className="inline-flex min-h-[44px] items-center text-ink-500 transition-colors hover:text-brand-300">{d.contact}</a>
            <p className="flex items-center gap-1.5">
              {d.footerNote}
              <Icon name="Sparkles" className="h-3.5 w-3.5 text-gold-400" />
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
