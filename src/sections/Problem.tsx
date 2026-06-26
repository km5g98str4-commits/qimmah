import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { painPoints } from '@/data/problems'
import { sectionCopy } from '@/config/content'

/** قسم المشكلة — يبرز ألم تشتّت الأدوات قبل تقديم الحل. */
export function Problem() {
  return (
    <section id="problem" className="section">
      <div className="container-page">
        <SectionHeading {...sectionCopy.problem} align="center" />

        <div className="mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-2">
          {painPoints.map((p) => (
            <div
              key={p.title}
              className="card flex items-start gap-4 p-6"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-500/10 text-red-400">
                <Icon name={p.icon} className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{p.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
