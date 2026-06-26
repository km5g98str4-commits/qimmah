import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { supplements } from '@/data/supplements'

/** قسم المكملات والأدوية — جرعات وتوقيت وحالة الأخذ. */
export function Supplements() {
  return (
    <section id="supplements" className="section">
      <div className="container-page">
        <SectionHeading
          eyebrow="المكملات والأدوية"
          icon="Pill"
          title="جرعاتك في وقتها الصحيح"
          description="افصل بين المكملات والأدوية، وتابع التوقيت والجرعة، ولا تنسَ أي موعد مهم."
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {supplements.map((s) => (
            <div key={s.name} className="card flex flex-col p-5">
              <div className="flex items-start justify-between">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    s.type === 'medication'
                      ? 'bg-rose-500/15 text-rose-300'
                      : 'bg-brand-500/15 text-brand-300'
                  }`}
                >
                  <Icon name="Pill" className="h-3 w-3" />
                  {s.type === 'medication' ? 'دواء' : 'مكمل'}
                </span>
                <span
                  className={`grid h-7 w-7 place-items-center rounded-lg ${
                    s.taken ? 'bg-brand-500/15 text-brand-300' : 'bg-white/[0.03] text-slate-500'
                  }`}
                >
                  <Icon name={s.taken ? 'Check' : 'Circle'} className="h-4 w-4" />
                </span>
              </div>

              <h3 className="mt-4 text-base font-bold text-white">{s.name}</h3>
              <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                <p className="flex items-center justify-between">
                  <span>الجرعة</span>
                  <span className="font-bold text-slate-200">{s.dose}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>التوقيت</span>
                  <span className="font-bold text-slate-200">{s.timing}</span>
                </p>
              </div>
              {s.note && (
                <p className="mt-3 rounded-lg bg-white/[0.03] p-2.5 text-[11px] leading-relaxed text-slate-400">
                  {s.note}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
