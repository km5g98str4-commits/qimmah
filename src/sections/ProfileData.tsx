import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { sectionCopy } from '@/config/content'
import { profileFields } from '@/data/profile'

/** قسم البيانات الأساسية — بطاقات العمر/الطول/الوزن/الهدف… */
export function ProfileData() {
  return (
    <section id="profile" className="section bg-beige">
      <div className="container-page">
        <SectionHeading {...sectionCopy.profile} />

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {profileFields.map((f) => (
            <div key={f.label} className="card p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary-c">
                <Icon name={f.icon} className="h-5 w-5" />
              </span>
              <p className="mt-4 text-xs text-ink-500">{f.label}</p>
              <p className="mt-1">
                <span className="text-xl font-black text-ink-900">{f.value}</span>
                {f.unit && <span className="ms-1 text-xs text-ink-500">{f.unit}</span>}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
