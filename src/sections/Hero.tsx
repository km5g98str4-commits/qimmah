import { heroStats } from '@/data/features'
import { dashboardCards } from '@/data/dashboard'
import { hero } from '@/config/content'
import { useCustomization } from '@/lib/customizationContext'
import { Icon } from '@/components/Icon'

/** قسم البطل — العنوان الرئيسي، الدعوة للفعل، ومعاينة مصغّرة. */
export function Hero() {
  const { customization } = useCustomization()
  const { userName, mainGoal } = customization.identity
  return (
    <section id="hero" className="relative overflow-hidden pt-28 sm:pt-36">
      {/* خلفيات زخرفية */}
      <div className="pointer-events-none absolute inset-0 bg-radial-brand" />
      <div className="pointer-events-none absolute inset-0 bg-grid-faint [background-size:44px_44px] opacity-[0.6]" />

      <div className="container-page relative">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          {/* النص */}
          <div className="animate-fade-up">
            <span className="eyebrow">
              <Icon name="Sparkles" className="h-3.5 w-3.5" />
              {hero.eyebrow}
            </span>
            <h1 className="mt-6 text-4xl font-black leading-[1.15] text-ink-900 sm:text-5xl lg:text-6xl">
              {hero.titleTop}
              <br />
              <span className="bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
                {hero.titleHighlight}
              </span>
            </h1>
            <p className="subheading">{hero.description}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#today" className="btn-primary text-base">
                {hero.primaryCta}
                <Icon name="ArrowLeft" className="h-4 w-4" />
              </a>
              <a href="#routine" className="btn-ghost text-base">
                {hero.secondaryCta}
              </a>
            </div>

            {/* إحصائيات */}
            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6">
              {heroStats.map((s) => (
                <div key={s.label}>
                  <dt className="text-3xl font-black text-ink-900">{s.value}</dt>
                  <dd className="mt-1 text-xs text-ink-500">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* المعاينة */}
          <div className="relative animate-fade-up [animation-delay:120ms]">
            <div className="absolute -inset-4 rounded-[2rem] bg-primary-soft blur-2xl" />
            <div className="card relative animate-float p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-400/70" />
                  <span className="h-3 w-3 rounded-full bg-gold-400/70" />
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--c-primary)' }} />
                </div>
                <span className="text-xs font-bold text-ink-500">{hero.previewLabel}</span>
              </div>

              {/* هوية المستخدم — تنعكس من مركز التخصيص */}
              <div className="mt-4 rounded-xl border border-primary-soft bg-primary-soft p-3">
                <p className="text-[11px] text-ink-700">
                  أهلاً، <span className="font-bold text-ink-900">{userName}</span>
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-700">
                  <span className="text-primary-c">هدفك:</span> {mainGoal}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {dashboardCards.map((c) => (
                  <div key={c.label} className="rounded-xl border border-line bg-beige p-4">
                    <Icon name={c.icon} className={`h-5 w-5 ${c.accent}`} />
                    <p className="mt-3 text-xs text-ink-500">{c.label}</p>
                    <p className="mt-1 text-xl font-extrabold text-ink-900">{c.value}</p>
                    <p className="text-[11px] text-ink-400">{c.sub}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-primary-soft bg-primary-soft p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-primary-c">{hero.weeklyGoalLabel}</span>
                  <span className="text-primary-c">{hero.weeklyGoalPct}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-primary to-accent"
                    style={{ width: `${hero.weeklyGoalPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
