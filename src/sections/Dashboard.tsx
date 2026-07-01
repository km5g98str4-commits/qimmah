import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { LineChart } from '@/components/LineChart'
import { dashboardCards, weightProgress } from '@/data/dashboard'
import { features } from '@/data/features'
import { sectionCopy, labels } from '@/config/content'

/** معاينة اللوحة — بطاقات سريعة + رسم تقدّم + شبكة الميزات. */
export function Dashboard() {
  const first = weightProgress[0].value
  const last = weightProgress[weightProgress.length - 1].value
  const diff = (last - first).toFixed(1)

  return (
    <section id="dashboard" className="section">
      <div className="container-page">
        <SectionHeading {...sectionCopy.dashboard} />

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {/* البطاقات السريعة */}
          <div className="grid grid-cols-2 gap-4 lg:col-span-2">
            {dashboardCards.map((c) => (
              <div key={c.label} className="card p-5">
                <div className="flex items-center justify-between">
                  <Icon name={c.icon} className={`h-6 w-6 ${c.accent}`} />
                </div>
                <p className="mt-4 text-sm text-ink-500">{c.label}</p>
                <p className="mt-1 text-2xl font-black text-ink-900">{c.value}</p>
                <p className="text-xs text-ink-400">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* رسم التقدّم */}
          <div className="card flex flex-col p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-ink-900">{labels.dashboard.weightProgress}</p>
              <span className="flex items-center gap-1 text-xs font-bold text-brand-300">
                <Icon name="TrendingDown" className="h-4 w-4" />
                {diff} كجم
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-400">{labels.dashboard.last8Weeks}</p>
            <div className="mt-6 flex-1">
              <LineChart data={weightProgress} />
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-ink-400">
              <span>{weightProgress[0].label}</span>
              <span>{weightProgress[weightProgress.length - 1].label}</span>
            </div>
          </div>
        </div>

        {/* شبكة الميزات */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group card-interactive animate-fade-up p-6 motion-reduce:animate-none"
              style={{ animationDelay: `${Math.min(i * 60, 360)}ms` }}
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/15 text-brand-300 transition-colors duration-200 group-hover:bg-brand-500 group-hover:text-white">
                <Icon name={f.icon} className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-bold text-ink-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
