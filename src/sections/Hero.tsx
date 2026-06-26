import { site } from '@/config/site'
import { heroStats } from '@/data/features'
import { dashboardCards } from '@/data/dashboard'
import { Icon } from '@/components/Icon'

/** قسم البطل — العنوان الرئيسي، الدعوة للفعل، ومعاينة مصغّرة. */
export function Hero() {
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
              نظام لياقة متكامل — جاهز للبيع والتخصيص
            </span>
            <h1 className="mt-6 text-4xl font-black leading-[1.15] text-white sm:text-5xl lg:text-6xl">
              كل رحلتك في اللياقة
              <br />
              <span className="bg-gradient-to-l from-brand-300 to-gold-400 bg-clip-text text-transparent">
                في نظام واحد فاخر
              </span>
            </h1>
            <p className="subheading">
              تابع تمارينك، مكملاتك، أدويتك، تغذيتك، وقياساتك في مكان واحد أنيق. {site.name} قالب
              متكامل مصمّم للسوق السعودي والخليجي — عربي أولاً، وقابل للتخصيص بالكامل.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#pricing" className="btn-primary text-base">
                ابدأ الآن
                <Icon name="ArrowLeft" className="h-4 w-4" />
              </a>
              <a href="#dashboard" className="btn-ghost text-base">
                شاهد اللوحة
              </a>
            </div>

            {/* إحصائيات */}
            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6">
              {heroStats.map((s) => (
                <div key={s.label}>
                  <dt className="text-3xl font-black text-white">{s.value}</dt>
                  <dd className="mt-1 text-xs text-slate-400">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* المعاينة */}
          <div className="relative animate-fade-up [animation-delay:120ms]">
            <div className="absolute -inset-4 rounded-[2rem] bg-brand-500/10 blur-2xl" />
            <div className="card relative animate-float p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-400/70" />
                  <span className="h-3 w-3 rounded-full bg-gold-400/70" />
                  <span className="h-3 w-3 rounded-full bg-brand-400/70" />
                </div>
                <span className="text-xs font-bold text-slate-400">لوحة اليوم</span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {dashboardCards.map((c) => (
                  <div key={c.label} className="rounded-xl border border-white/[0.06] bg-ink-900/60 p-4">
                    <Icon name={c.icon} className={`h-5 w-5 ${c.accent}`} />
                    <p className="mt-3 text-xs text-slate-400">{c.label}</p>
                    <p className="mt-1 text-xl font-extrabold text-white">{c.value}</p>
                    <p className="text-[11px] text-slate-500">{c.sub}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-brand-500/20 bg-brand-500/10 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-brand-200">تقدّم الهدف الأسبوعي</span>
                  <span className="text-brand-300">67%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-700">
                  <div className="h-full w-[67%] rounded-full bg-gradient-to-l from-brand-400 to-gold-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
