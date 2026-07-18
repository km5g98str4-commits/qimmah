import { useMemo } from 'react'
import { Icon } from '@/components/Icon'
import { TodayLearnCard } from '@/components/coaching/TodayLearnCard'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import type { AppRoute } from '@/lib/appRoutes'
import { useCustomization } from '@/lib/customizationContext'
import { buildTodayV2Model, type TodayCard, type TodayPillar } from '@/lib/todayV2Model'
import { buildWeeklyInsights } from '@/lib/insights'
import { InsightCardsView } from '@/lib/insights/InsightCardsView'
import { insightCopy } from '@/data/insightCopy'
import { MinorGoalNotice } from '@/components/MinorGoalNotice'

interface TodayV2Props {
  lang: Lang
  onNavigate: (route: AppRoute) => void
}

/** Card icon-tile colour by tone — reads the centralised «مسار اليوم» pillar vars. */
const TONE_VAR: Record<TodayCard['tone'], string> = {
  train: 'var(--v2-pillar-train)',
  nutrition: 'var(--v2-pillar-nutrition)',
  move: 'var(--v2-pillar-move)',
  recover: 'var(--v2-pillar-recover)',
  progress: 'var(--v2-pillar-move)',
}

/**
 * Today — Qimmah v2.1 Command Center (Slice 3 · PDF §04). One hero decision owns
 * the top third; a four-pillar «مسار اليوم» track reads in 3s; every card carries
 * a verb + destination. Three states, all real-data-driven (buildTodayV2Model):
 * normal · new-user (guides setup, no empty rings) · after-workout (recovery +
 * fuel, green CTA). Canonical v2.1 Today surface.
 */
export function TodayV2({ lang, onNavigate }: TodayV2Props) {
  const { customization } = useCustomization()
  const ar = lang !== 'en'
  const model = useMemo(() => buildTodayV2Model(customization, lang), [customization, lang])
  // The store-backed insight model is rebuilt whenever Today renders, including
  // after navigation back from a completed workout, meal, or measurement.
  const insights = buildWeeklyInsights(ar ? 'ar' : 'en')
  const insightsCopy = insightCopy(ar ? 'ar' : 'en')
  const go = (dest: AppRoute | null) => dest && onNavigate(dest)

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="v2-surface-light min-h-screen bg-page px-4 pb-28 pt-3 text-ink-900">
      <div className="v2-screen-enter mx-auto w-full max-w-md space-y-5">
        {/* Header — من أنا وأين أنا (avatar + greeting rewritten by state/time). */}
        <header className="flex items-center justify-between gap-3 pt-1">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-500">{model.dateLabel}</p>
            <h1 className="mt-0.5 truncate text-2xl font-black tracking-tight">{model.greeting}</h1>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-beige text-lg font-black text-ink-700" aria-hidden="true">
            {model.avatarInitial ?? <Icon name="User" className="h-5 w-5" />}
          </span>
        </header>

        {/* إشعار هجرة القاصرين — لمرّة واحدة، يظهر فقط بعد تحويل الهدف إلى المحافظة. */}
        <MinorGoalNotice lang={lang} />

        {/* Hero — الخطوة الواحدة (owns the top third). */}
        <section className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-card">
          <div className={cn('pointer-events-none absolute -top-8 end-[-10%] h-32 w-40 rounded-full opacity-70', model.hero.ctaTone === 'green' ? 'v2-glow-green' : 'v2-glow-ember')} aria-hidden="true" />
          <div className="relative">
            <p className={cn('flex items-center gap-1.5 text-xs font-black uppercase tracking-wider', model.hero.eyebrowDone ? 'v2-text-green' : 'text-primary')}>
              {model.hero.eyebrowDone ? (
                <Icon name="Check" className="h-4 w-4" strokeWidth={3} />
              ) : (
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              )}
              {model.hero.eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-black leading-tight">{model.hero.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">{model.hero.subtitle}</p>
            <button
              type="button"
              onClick={() => go(model.hero.destination)}
              className={cn('mt-4 w-full py-3.5 text-[1.1875rem]', model.hero.ctaTone === 'green' ? 'btn-success' : 'btn-primary')}
            >
              {model.hero.ctaLabel}
            </button>
          </div>
        </section>

        {/* مسار اليوم — four labelled pillars, concrete not abstract. */}
        <section className="rounded-2xl border border-line bg-surface p-4" aria-label={ar ? 'مسار اليوم' : 'Today’s track'}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-black">{ar ? 'مسار اليوم' : 'Today’s track'}</span>
            <span className={cn('text-xs font-bold tabular-nums', model.completedCount > 0 ? 'text-[color:var(--color-success)]' : 'text-ink-500')}>{model.progressLabel}</span>
          </div>
          <ul className="mt-4 grid grid-cols-4 gap-2">
            {model.pillars.map((p) => (
              <li key={p.key} className="flex flex-col items-center gap-2">
                <PillarRing pillar={p} lang={lang} />
                <span className="text-[0.7rem] font-bold text-ink-700">{ar ? p.labelAr : p.labelEn}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* رؤى الأسبوع — بطاقة واحدة خفيفة من محرّك الرؤى (رؤية مُحوَّطة أو «نحتاج المزيد»). */}
        <InsightCardsView cards={insights.cards} lang={ar ? 'ar' : 'en'} onNavigate={onNavigate} title={insightsCopy.todayTitle} max={1} />

        {/* Cards — setup guides (new user) or actionable nudges; each verb + destination. */}
        {model.cards.length > 0 && (
          <section className="space-y-2.5" aria-label={ar ? 'خطوات مقترحة' : 'Suggested steps'}>
            {model.cards.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(c.destination)}
                className="v2-pressable flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-start hover:border-[color:var(--v2-blue)]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `color-mix(in srgb, ${TONE_VAR[c.tone]} 14%, transparent)`, color: TONE_VAR[c.tone] }}>
                  <Icon name={c.icon} className="h-[1.15rem] w-[1.15rem]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold leading-snug text-ink-900">{c.label}</span>
                  {c.hint && <span className="mt-0.5 block text-xs text-ink-500">{c.hint}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-0.5 text-xs font-black" style={{ color: TONE_VAR[c.tone] }}>
                  {c.actionLabel}
                  <Icon name={ar ? 'ChevronLeft' : 'ChevronRight'} className="h-4 w-4" />
                </span>
              </button>
            ))}
          </section>
        )}

        {/* تعلّم — درس تدريبي دقيق يتدوّر بلا تكرار (عربي فقط). */}
        <TodayLearnCard lang={lang} />

        {/* Trust note — honest about what we don't yet know (only when true). */}
        {model.trustNote && <p className="px-1 text-center text-[0.7rem] leading-relaxed text-ink-400">{model.trustNote}</p>}
      </div>
    </div>
  )
}

/**
 * A single «مسار اليوم» pillar. Four visual states, meaning never colour-only
 * (icon/check/% always present): done = filled + ✓ · ready = filled + icon ·
 * active = colour ring + % · locked = dashed placeholder + muted icon (no empty
 * ring for new users).
 */
function PillarRing({ pillar, lang }: { pillar: TodayPillar; lang: Lang }) {
  const ar = lang !== 'en'
  const color = pillar.state === 'done' ? 'var(--v2-green)' : `var(--v2-pillar-${pillar.key})`
  const r = 19
  const c = 2 * Math.PI * r
  const off = c - (pillar.percent / 100) * c
  const name = ar ? pillar.labelAr : pillar.labelEn
  const stateWord =
    pillar.state === 'done' ? (ar ? 'مكتمل' : 'done') : pillar.state === 'active' ? `${pillar.percent}%` : pillar.state === 'ready' ? (ar ? 'جاهز' : 'ready') : ar ? 'لم يبدأ' : 'not started'
  const label = `${name}: ${stateWord}`

  if (pillar.state === 'done' || pillar.state === 'ready') {
    return (
      <span className="grid h-14 w-14 place-items-center rounded-full" style={{ backgroundColor: color }} role="img" aria-label={label}>
        <Icon name={pillar.state === 'done' ? 'Check' : pillar.icon} className="h-5 w-5 text-white" strokeWidth={pillar.state === 'done' ? 3 : 2} />
      </span>
    )
  }

  if (pillar.state === 'active') {
    return (
      <span className="relative grid h-14 w-14 place-items-center" role="img" aria-label={label}>
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
          <circle cx="22" cy="22" r={r} fill="none" stroke="rgb(var(--c-line))" strokeWidth="4" />
          <circle
            cx="22"
            cy="22"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={off}
            className="v2-fill"
          />
        </svg>
        <span className="text-[0.72rem] font-black tabular-nums" style={{ color }}>
          {pillar.percent}%
        </span>
      </span>
    )
  }

  // locked — dashed placeholder, muted icon (never an empty 0% ring)
  return (
    <span className="relative grid h-14 w-14 place-items-center" role="img" aria-label={label}>
      <svg className="absolute inset-0" viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgb(var(--c-line))" strokeWidth="2" strokeDasharray="3 4" strokeLinecap="round" />
      </svg>
      <Icon name={pillar.icon} className="h-5 w-5 text-ink-400" />
    </span>
  )
}
