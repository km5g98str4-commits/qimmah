import { nav, product } from '@/config/product'
import { useCustomization } from '@/lib/customizationContext'
import { Icon } from './Icon'

/** الفوتر — هوية، روابط، حقوق. */
export function Footer() {
  const { customization } = useCustomization()
  const brandName = customization.identity.brandName || product.name
  return (
    <footer className="border-t border-line bg-beige">
      <div className="container-page py-14">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <a href="#hero" className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white">
                <Icon name="Dumbbell" className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <span className="text-lg font-extrabold text-ink-900">{brandName}</span>
            </a>
            <p className="mt-4 text-sm leading-relaxed text-ink-500">{product.description}</p>
          </div>

          <nav className="grid grid-cols-2 gap-x-12 gap-y-2 sm:grid-cols-2">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm text-ink-500 transition-colors hover:text-brand-300"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {product.year} {brandName}. {product.rightsNote}
          </p>
          <p className="flex items-center gap-1.5">
            {product.footerNote}
            <Icon name="Sparkles" className="h-3.5 w-3.5 text-gold-400" />
          </p>
        </div>
      </div>
    </footer>
  )
}
