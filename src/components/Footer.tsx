import { nav, product } from '@/config/product'
import { Icon } from './Icon'

/** الفوتر — هوية، روابط، حقوق. */
export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-ink-900/50">
      <div className="container-page py-14">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <a href="#hero" className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-ink-950">
                <Icon name="Dumbbell" className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <span className="text-lg font-extrabold text-white">{product.name}</span>
            </a>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">{product.description}</p>
          </div>

          <nav className="grid grid-cols-2 gap-x-12 gap-y-2 sm:grid-cols-2">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm text-slate-400 transition-colors hover:text-brand-300"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/[0.06] pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {product.year} {product.name}. {product.rightsNote}
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
