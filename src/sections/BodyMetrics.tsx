import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { bodyMetrics } from '@/data/metrics'
import { sectionCopy } from '@/config/content'

/** قسم قياسات الجسم — بطاقات مع نسبة التغيّر واتجاهه. */
export function BodyMetrics() {
  return (
    <section id="metrics" className="section">
      <div className="container-page">
        <SectionHeading {...sectionCopy.metrics} />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bodyMetrics.map((m) => {
            const positive = m.change > 0
            const trendIcon = positive ? 'TrendingUp' : 'TrendingDown'
            const trendColor = positive ? 'text-brand-300' : 'text-sky-300'
            return (
              <div key={m.label} className="card p-6">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-beige text-ink-700">
                    <Icon name={m.icon} className="h-5 w-5" />
                  </span>
                  <span className={`flex items-center gap-1 text-xs font-bold ${trendColor}`}>
                    <Icon name={trendIcon} className="h-4 w-4" />
                    {positive ? '+' : ''}
                    {m.change}
                  </span>
                </div>
                <p className="mt-5 text-sm text-ink-500">{m.label}</p>
                <p className="mt-1">
                  <span className="text-3xl font-black text-ink-900">{m.value}</span>
                  <span className="ms-1.5 text-sm text-ink-500">{m.unit}</span>
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
