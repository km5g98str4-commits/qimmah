import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { accentOptions } from '@/config/theme'
import { sectionCopy, customizationPoints, customizationSwatchLabel } from '@/config/content'

/** قسم التخصيص — يعرض قابلية تغيير الهوية بصريًا (عرض ثابت في القالب). */
export function Customization() {
  return (
    <section id="customization" className="section">
      <div className="container-page">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <SectionHeading {...sectionCopy.customization} />

          <div className="card p-6">
            <p className="text-sm font-bold text-white">{customizationSwatchLabel}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {accentOptions.map((opt) => (
                <div key={opt.id} className="group flex flex-col items-center gap-2">
                  <button
                    type="button"
                    aria-label={opt.label}
                    className="h-12 w-12 rounded-xl border-2 border-white/10 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    style={{ backgroundColor: opt.swatch }}
                  />
                  <span className="text-[11px] text-slate-400">{opt.label}</span>
                </div>
              ))}
            </div>

            <ul className="mt-6 space-y-3 border-t border-white/[0.06] pt-5">
              {customizationPoints.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <Icon name="CheckCircle2" className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
