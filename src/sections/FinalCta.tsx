import { Icon } from '@/components/Icon'
import { finalCta } from '@/config/content'
import { product } from '@/config/product'

/** الدعوة النهائية للفعل — قسم مستقل قبل الفوتر. */
export function FinalCta() {
  return (
    <section id="cta" className="section pt-0">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-3xl border border-brand-500/20 bg-gradient-to-l from-brand-500/12 to-gold-500/[0.07] p-8 text-center sm:p-14">
          <div className="pointer-events-none absolute inset-0 bg-radial-brand opacity-70" />
          <div className="relative">
            <span className="eyebrow">
              <Icon name="Sparkles" className="h-3.5 w-3.5" />
              {finalCta.eyebrow}
            </span>
            <h2 className="mx-auto mt-5 max-w-2xl text-2xl font-black text-ink-900 sm:text-4xl">
              {finalCta.title}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-ink-500">{finalCta.description}</p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <a href={product.checkoutUrl} className="btn-primary text-base">
                {finalCta.primary}
                <Icon name="ArrowLeft" className="h-4 w-4" />
              </a>
              <a href="#pricing" className="btn-ghost text-base">
                {finalCta.secondary}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
