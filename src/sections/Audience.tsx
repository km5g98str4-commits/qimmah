import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { forWhom, notForWhom } from '@/data/audience'
import { sectionCopy } from '@/config/content'
import type { AudienceItem } from '@/types'

interface ColumnProps {
  title: string
  tone: 'positive' | 'negative'
  items: AudienceItem[]
}

function Column({ title, tone, items }: ColumnProps) {
  const positive = tone === 'positive'
  return (
    <div
      className={[
        'card p-6 sm:p-8',
        positive ? 'border-brand-500/25' : 'border-white/[0.06]',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <span
          className={[
            'grid h-10 w-10 place-items-center rounded-xl',
            positive ? 'bg-brand-500/15 text-brand-300' : 'bg-red-500/10 text-red-400',
          ].join(' ')}
        >
          <Icon name={positive ? 'CheckCircle2' : 'X'} className="h-5 w-5" />
        </span>
        <h3 className="text-lg font-bold text-white">{title}</h3>
      </div>

      <ul className="mt-6 space-y-5">
        {items.map((item) => (
          <li key={item.title} className="flex items-start gap-3.5">
            <span
              className={[
                'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg',
                positive ? 'bg-white/[0.04] text-brand-300' : 'bg-white/[0.03] text-slate-500',
              ].join(' ')}
            >
              <Icon name={item.icon} className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-white">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{item.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** قسم الجمهور — لمن قِمّة مناسب ولمن ليس مناسبًا (تموضع صادق). */
export function Audience() {
  return (
    <section id="audience" className="section">
      <div className="container-page">
        <div className="flex justify-center">
          <SectionHeading {...sectionCopy.audience} align="center" />
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <Column title="قِمّة مثالي لك إن كنت" tone="positive" items={forWhom} />
          <Column title="قد لا يناسبك إن كنت" tone="negative" items={notForWhom} />
        </div>
      </div>
    </section>
  )
}
