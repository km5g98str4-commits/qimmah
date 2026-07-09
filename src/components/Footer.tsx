import { product } from '@/config/product'
import { useCustomization } from '@/lib/customizationContext'
import { BUILD_LABEL } from '@/lib/buildInfo'
import { getLanguage } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import { miscStrings } from '@/i18n/dict/misc'
import { Icon } from './Icon'

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
          <div className="flex items-center gap-4">
            <a href="#/privacy" className="text-ink-500 transition-colors hover:text-brand-300">{d.privacy}</a>
            <a href="#/terms" className="text-ink-500 transition-colors hover:text-brand-300">{d.terms}</a>
            <a href="#/contact" className="text-ink-500 transition-colors hover:text-brand-300">{d.contact}</a>
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
