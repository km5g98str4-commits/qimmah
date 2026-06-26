import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { pricingPlans } from '@/data/pricing'
import { product } from '@/config/product'
import { sectionCopy, finalCta } from '@/config/content'
import { cn } from '@/lib/cn'

/** قسم الأسعار والدعوة للفعل — خطط قابلة للتعديل من data/pricing. */
export function Pricing() {
  return (
    <section id="pricing" className="section">
      <div className="container-page">
        <SectionHeading {...sectionCopy.pricing} align="center" />

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                'card relative flex flex-col p-7',
                plan.highlighted && 'ring-2 ring-brand-500/50 lg:-translate-y-3',
              )}
            >
              {plan.badge && (
                <span className="absolute -top-3 end-7 rounded-full bg-brand-500 px-3 py-1 text-[11px] font-black text-ink-950">
                  {plan.badge}
                </span>
              )}
              <h3 className="text-lg font-bold text-white">{plan.name}</h3>
              <p className="mt-2 text-sm text-slate-400">{plan.description}</p>
              <div className="mt-5 flex items-end gap-1.5">
                <span className="text-4xl font-black text-white">{plan.price}</span>
                <span className="mb-1 text-sm text-slate-400">{plan.period}</span>
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <Icon name="CheckCircle2" className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={product.checkoutUrl}
                className={cn('mt-7', plan.highlighted ? 'btn-primary' : 'btn-ghost')}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        {/* CTA ختامي */}
        <div className="mt-14 overflow-hidden rounded-3xl border border-brand-500/20 bg-gradient-to-l from-brand-500/10 to-gold-500/5 p-8 text-center sm:p-12">
          <h3 className="text-2xl font-black text-white sm:text-3xl">{finalCta.title}</h3>
          <p className="mx-auto mt-3 max-w-xl text-slate-400">
            {product.name} {finalCta.description}
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <a href={product.contactUrl} className="btn-primary text-base">
              {finalCta.primary}
              <Icon name="ArrowLeft" className="h-4 w-4" />
            </a>
            <a href="#hero" className="btn-ghost text-base">
              {finalCta.secondary}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
