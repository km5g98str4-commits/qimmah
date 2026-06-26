import { Icon } from '@/components/Icon'
import { healthNotice } from '@/config/content'

/** قسم تنبيه صحي بسيط — تذكير بمراجعة المختص. */
export function HealthNotice() {
  return (
    <section id="health" className="pb-8">
      <div className="container-page">
        <div className="flex items-start gap-3 rounded-2xl border border-gold-400/40 bg-gold-200/40 p-5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-300/50 text-gold-600">
            <Icon name="AlertTriangle" className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-ink-900">{healthNotice.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-700">{healthNotice.body}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
