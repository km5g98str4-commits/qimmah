import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { benefits } from '@/data/benefits'
import { sectionCopy } from '@/config/content'

/** قسم المزايا — يبرز القيمة المميِّزة لقِمّة في بطاقات. */
export function Benefits() {
  return (
    <section id="benefits" className="section">
      <div className="container-page">
        <SectionHeading {...sectionCopy.benefits} align="center" />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="group card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/30"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-500/15 text-brand-300 transition-colors group-hover:bg-brand-500 group-hover:text-white">
                <Icon name={b.icon} className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-base font-bold text-ink-900">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
