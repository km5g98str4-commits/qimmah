import { useEffect, useState } from 'react'
import { nav, product } from '@/config/product'
import { cn } from '@/lib/cn'
import { Icon } from './Icon'

/** الهيدر العلوي — ثابت، شفاف يتحول لزجاجي عند التمرير، مع قائمة جوال. */
export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled ? 'glass border-b border-white/[0.06]' : 'border-b border-transparent',
      )}
    >
      <div className="container-page flex h-16 items-center justify-between">
        <a href="#hero" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-ink-950 shadow-glow">
            <Icon name="Dumbbell" className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-extrabold text-white">{product.name}</span>
        </a>

        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a href="#pricing" className="btn-primary">
            {product.ctaLabel}
          </a>
        </div>

        <button
          type="button"
          aria-label="القائمة"
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-white lg:hidden"
        >
          <Icon name={open ? 'X' : 'Menu'} className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="glass border-t border-white/[0.06] lg:hidden">
          <nav className="container-page flex flex-col gap-1 py-4">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                {item.label}
              </a>
            ))}
            <a href="#pricing" onClick={() => setOpen(false)} className="btn-primary mt-2">
              {product.ctaLabel}
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
