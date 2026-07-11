import { useMemo } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import type { AppRoute } from '@/lib/appRoutes'
import { useCustomization } from '@/lib/customizationContext'
import { buildTodayV2Model, type TodayCategory, type TodayNextAction } from '@/lib/todayV2Model'

interface TodayV2Props {
  lang: Lang
  onNavigate: (route: AppRoute) => void
}

const CAT_ICON: Record<TodayCategory, string> = { train: 'Dumbbell', fuel: 'Flame', move: 'Activity', recover: 'ShieldCheck', setup: 'Sparkles' }

const PILLARS: { key: 'train' | 'nutrition' | 'move' | 'recover'; ar: string; en: string; icon: string }[] = [
  { key: 'train', ar: 'تدريب', en: 'Training', icon: 'Dumbbell' },
  { key: 'nutrition', ar: 'تغذية', en: 'Nutrition', icon: 'Flame' },
  { key: 'move', ar: 'حركة', en: 'Movement', icon: 'Activity' },
  { key: 'recover', ar: 'تعافي', en: 'Recovery', icon: 'ShieldCheck' },
]

/**
 * Today — Qimmah v2.1 Command Center (Slice 3). Preview-gated (rendered from
 * DashboardView under isDesignV2). Answers, top to bottom: أين أنا؟ (header +
 * goal) · ماذا أفعل الآن؟ (next-step hero + nudges) · لماذا أثق؟ (momentum track
 * + honest trust notes). All data comes from buildTodayV2Model — real where
 * available, honest fallback otherwise, never faked.
 */
export function TodayV2({ lang, onNavigate }: TodayV2Props) {
  const { customization } = useCustomization()
  const ar = lang !== 'en'
  const model = useMemo(() => buildTodayV2Model(customization, lang), [customization, lang])
  const dateLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(ar ? 'ar-SA' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
    } catch {
      return ''
    }
  }, [ar])

  const go = (a: TodayNextAction | { destination: AppRoute | null; disabledReason: string | null }) => {
    if (a.destination) onNavigate(a.destination as AppRoute)
  }
  const pillarPct = (k: string) =>
    k === 'train' ? model.dayProgress.trainPercent : k === 'nutrition' ? model.dayProgress.nutritionPercent : k === 'move' ? model.dayProgress.movementPercent : model.dayProgress.recoveryPercent
  const pillarOn = (k: string) =>
    k === 'train' ? model.nextWorkout.available : k === 'nutrition' ? model.nutrition.available : k === 'move' ? model.movement.available : model.recovery.available

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="min-h-screen bg-page px-4 pb-8 pt-3 text-ink-900">
      <div className="mx-auto w-full max-w-md space-y-4">
        {/* Header — أين أنا؟ */}
        <header className="flex items-center justify-between pt-1">
          <div>
            <p className="text-xs font-medium text-ink-500">{dateLabel}</p>
            <h1 className="mt-0.5 text-2xl font-black tracking-tight">{ar ? 'اليوم' : 'Today'}</h1>
          </div>
          {model.goalLabel && (
            <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
              <Icon name="Target" className="h-3.5 w-3.5" />
              {model.goalLabel}
            </span>
          )}
        </header>

        {/* Hero — ماذا أفعل الآن؟ (خطوتك التالية) */}
        <section className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-card">
          <div className="pointer-events-none absolute -top-8 end-[-10%] h-32 w-40 rounded-full opacity-70" style={{ background: 'radial-gradient(closest-side, rgba(242,106,33,0.22), transparent)' }} aria-hidden="true" />
          <div className="relative">
            <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary">
              <Icon name={CAT_ICON[model.nextAction.category]} className="h-4 w-4" />
              {ar ? 'خطوتك التالية' : 'Your next step'}
            </p>
            <h2 className="mt-3 text-2xl font-black leading-tight">{model.nextAction.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">{model.nextAction.subtitle}</p>
            <button type="button" onClick={() => go(model.nextAction)} className="btn-primary mt-4 w-full py-3.5 text-base">
              {model.nextAction.ctaLabel}
            </button>
          </div>
        </section>

        {/* Momentum track — 4 pillars, glanceable in 3s. */}
        <section className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-black">{ar ? 'زخم اليوم' : 'Today’s momentum'}</span>
            <span className="text-xs font-bold text-ink-500">{model.dayProgress.completedCount}/{model.dayProgress.totalCount}</span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {PILLARS.map((p) => {
              const on = pillarOn(p.key)
              const percent = pillarPct(p.key)
              return (
                <div key={p.key} className="flex flex-col items-center gap-1.5">
                  <Ring percent={on ? percent : 0} muted={!on} icon={p.icon} />
                  <span className="text-[0.7rem] font-bold text-ink-700">{ar ? p.ar : p.en}</span>
                  <span className={cn('text-[0.65rem] font-semibold', on ? 'text-ink-500' : 'text-ink-400')}>
                    {on ? `${percent}%` : ar ? 'إعداد' : 'Setup'}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        {/* Priority nudges — honest, actionable. */}
        {model.nudges.length > 0 && (
          <section className="space-y-2.5">
            {model.nudges.map((n, i) => (
              <button
                key={i}
                type="button"
                onClick={() => n.destination && onNavigate(n.destination as AppRoute)}
                disabled={!n.destination}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-start transition-colors',
                  n.destination ? 'border-line bg-surface hover:border-primary/40' : 'border-line bg-beige/50 opacity-80',
                )}
              >
                <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', n.destination ? 'bg-primary/12 text-primary' : 'bg-beige text-ink-500')}>
                  <Icon name={CAT_ICON[n.category]} className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-ink-900">{n.label}</span>
                  {n.disabledReason && <span className="block text-xs text-ink-500">{n.disabledReason}</span>}
                </span>
                <span className={cn('shrink-0 text-xs font-black', n.destination ? 'text-primary' : 'text-ink-400')}>{n.actionLabel}</span>
              </button>
            ))}
          </section>
        )}

        {/* Quick log — secondary, calm. */}
        <section className="rounded-2xl border border-line bg-surface p-4">
          <span className="text-sm font-black">{ar ? 'تسجيل سريع' : 'Quick log'}</span>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <QuickBtn icon="Flame" label={ar ? 'وجبة' : 'Meal'} onClick={() => onNavigate('nutrition')} />
            <QuickBtn icon="Dumbbell" label={ar ? 'تمرين' : 'Workout'} onClick={() => onNavigate('workout')} />
            <QuickBtn icon="TrendingUp" label={ar ? 'وزن' : 'Weight'} onClick={() => onNavigate('progress')} />
          </div>
        </section>

        {/* Trust notes — لماذا أثق؟ */}
        {model.trustNotes.length > 0 && (
          <p className="px-1 text-center text-[0.7rem] leading-relaxed text-ink-400">{model.trustNotes.join(' · ')}</p>
        )}
      </div>
    </div>
  )
}

function Ring({ percent, muted, icon }: { percent: number; muted: boolean; icon: string }) {
  const r = 18
  const c = 2 * Math.PI * r
  const off = c - (percent / 100) * c
  return (
    <span className="relative grid h-12 w-12 place-items-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgb(var(--c-line))" strokeWidth="4" />
        {!muted && percent > 0 && (
          <circle cx="22" cy="22" r={r} fill="none" stroke="var(--c-primary)" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
        )}
      </svg>
      <Icon name={icon} className={cn('h-4.5 w-4.5', muted ? 'text-ink-400' : 'text-ink-700')} />
    </span>
  )
}

function QuickBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-beige/50 py-3 text-ink-700 transition-colors hover:border-primary/40 active:scale-[0.97]">
      <Icon name={icon} className="h-5 w-5" />
      <span className="text-xs font-bold">{label}</span>
    </button>
  )
}
