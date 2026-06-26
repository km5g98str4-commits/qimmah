import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { pricingPlans } from '@/data/pricing'
import { product } from '@/config/product'
import { sectionCopy } from '@/config/content'
import { cn } from '@/lib/cn'

/** قسم الأسعار — خطط قابلة للتعديل من data/pricing. باقة المدربين مميّزة ذهبيًا. */
export function Pricing() {
  return (
    <section id="pricing" className="section">
      <div className="container-page">
        <div className="flex justify-center">
          <SectionHeading {...sectionCopy.pricing} align="center" />
        </div>

        <div className="mt-16 grid items-stretch gap-6 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                'card relative flex flex-col p-7',
                plan.highlighted &&
                  'ring-2 ring-gold-400/50 border-gold-400/30 bg-gradient-to-b from-gold-500/[0.08] to-transparent shadow-glow lg:-translate-y-4',
              )}
            >
              {plan.badge && (
                <span
                  className={cn(
                    'absolute -top-3 end-7 rounded-full px-3 py-1 text-[11px] font-black',
                    plan.highlighted ? 'bg-gold-400 text-ink-950' : 'bg-brand-500 text-ink-950',
                  )}
                >
                  {plan.badge}
                </span>
              )}

              <div className="flex items-center gap-2">
                {plan.highlighted && <Icon name="Trophy" className="h-5 w-5 text-gold-400" />}
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
              </div>
              <p className="mt-2 text-sm text-slate-400">{plan.description}</p>

              <div className="mt-5 flex items-end gap-1.5">
                <span
                  className={cn(
                    'text-4xl font-black',
                    plan.highlighted ? 'text-gold-300' : 'text-white',
                  )}
                >
                  {plan.price}
                </span>
                <span className="mb-1 text-sm text-slate-400">{plan.period}</span>
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <Icon
                      name="CheckCircle2"
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0',
                        plan.highlighted ? 'text-gold-400' : 'text-brand-400',
                      )}
                    />
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={product.checkoutUrl}
                className={cn(
                  'mt-7',
                  plan.highlighted
                    ? 'btn bg-gold-400 text-ink-950 hover:bg-gold-300 active:scale-[0.98]'
                    : 'btn-ghost',
                )}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          كل الأسعار قابلة للتعديل من ملف واحد · جميع الباقات تشمل الواجهة العربية الكاملة.
        </p>
      </div>
    </section>
  )
}
