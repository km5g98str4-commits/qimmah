import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { pricingPlans } from '@/data/pricing'
import { product } from '@/config/product'
import { sectionCopy } from '@/config/content'
import { cn } from '@/lib/cn'
import { showExternalPurchase } from '@/lib/platform'

/** قسم قديم محفوظ للقالب — غير معروض في الصفحة الشخصية (التصدير فارغ). */
export function Pricing() {
  // داخل iOS/Capacitor لا نعرض أي مسار شراء خارجي (App Store 3.1.1). على الويب كما هو.
  if (!showExternalPurchase()) return null
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
                  'ring-2 ring-accent border-accent-soft bg-accent-soft shadow-glow lg:-translate-y-4',
              )}
            >
              {plan.badge && (
                <span
                  className={cn(
                    'absolute -top-3 end-7 rounded-full px-3 py-1 text-[11px] font-black text-ink-900',
                    plan.highlighted ? 'bg-accent' : 'bg-primary',
                  )}
                >
                  {plan.badge}
                </span>
              )}

              <div className="flex items-center gap-2">
                {plan.highlighted && <Icon name="Trophy" className="h-5 w-5 text-accent-c" />}
                <h3 className="text-lg font-bold text-ink-900">{plan.name}</h3>
              </div>
              <p className="mt-2 text-sm text-ink-500">{plan.description}</p>

              <div className="mt-5 flex items-end gap-1.5">
                <span
                  className={cn(
                    'text-4xl font-black',
                    plan.highlighted ? 'text-accent-c' : 'text-ink-900',
                  )}
                >
                  {plan.price}
                </span>
                <span className="mb-1 text-sm text-ink-500">{plan.period}</span>
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-ink-700">
                    <Icon
                      name="CheckCircle2"
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0',
                        plan.highlighted ? 'text-accent-c' : 'text-primary-c',
                      )}
                    />
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={product.checkoutUrl}
                style={plan.highlighted ? { backgroundColor: 'var(--c-accent)' } : undefined}
                className={cn(
                  'mt-7',
                  plan.highlighted ? 'btn text-ink-900 active:scale-[0.98]' : 'btn-ghost',
                )}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-ink-400">
          هذا القسم غير معروض في الصفحة الشخصية.
        </p>
      </div>
    </section>
  )
}
