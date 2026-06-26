import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import { useCustomization } from '@/lib/customizationContext'
import { commitmentName } from '@/lib/commitmentPlan'
import { useCommitmentsToday } from '@/lib/commitmentTracking'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'

/** قسم «التزاماتي» — الالتزامات المختارة مع تتبّع يومي ونسبة إنجاز. */
export function CommitmentsSection({ lang }: { lang: Lang }) {
  const { customization } = useCustomization()
  const cp = customization.commitmentPlan
  const t = getStrings(lang).commit
  const { isDone, toggle } = useCommitmentsToday()

  if (!cp.enabled || cp.items.length === 0) {
    return (
      <section id="commitments" className="section">
        <div className="container-page">
          <SectionHeading eyebrow={t.title} icon="CheckCircle2" title={t.title} description={t.desc} />
          <div className="mt-10 rounded-2xl border border-line bg-surface p-10 text-center">
            <p className="text-sm text-ink-500">{t.empty}</p>
          </div>
        </div>
      </section>
    )
  }

  const daily = cp.items.filter((i) => i.frequency === 'daily')
  const doneCount = daily.filter((i) => isDone(i.id)).length
  const pct = daily.length ? Math.round((doneCount / daily.length) * 100) : 0

  return (
    <section id="commitments" className="section">
      <div className="container-page">
        <SectionHeading eyebrow={t.title} icon="CheckCircle2" title={t.title} description={t.desc} />

        <div className="mt-10 card p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-bold text-ink-700">{t.progress}</span>
            <span className="font-black text-primary-c">{doneCount}/{daily.length} · {pct}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>

          <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {cp.items.map((it) => {
              const done = isDone(it.id)
              return (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => toggle(it.id)}
                    aria-pressed={done}
                    className={cn('flex w-full items-center gap-3 rounded-xl border p-3.5 text-start transition-all active:scale-[0.99]', done ? 'border-primary-soft bg-primary-soft' : 'border-line bg-surface hover:bg-beige')}
                  >
                    <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full border-2', done ? 'border-transparent bg-primary text-white' : 'border-line text-transparent')}>
                      <Icon name="Check" className="h-4 w-4" strokeWidth={3} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-sm font-bold', done ? 'text-ink-500 line-through' : 'text-ink-900')}>{commitmentName(it, lang)}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-beige px-2 py-0.5 text-[10px] font-bold text-ink-500">
                      {it.frequency === 'weekly' ? t.weekly : it.frequency === 'custom' ? t.custom : t.daily}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
