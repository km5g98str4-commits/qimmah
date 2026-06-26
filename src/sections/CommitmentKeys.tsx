import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { sectionCopy } from '@/config/content'
import { commitmentKeys } from '@/data/commitment'

/** قسم مفاتيح الالتزام — مبادئ/عادات يومية بسيطة. */
export function CommitmentKeys() {
  return (
    <section id="commitment" className="section">
      <div className="container-page">
        <SectionHeading {...sectionCopy.commitment} />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {commitmentKeys.map((k) => (
            <div key={k.title} className="card flex items-start gap-4 p-6">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
                <Icon name={k.icon} className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-ink-900">{k.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{k.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
