import { useMemo } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import type { AppRoute } from '@/lib/appRoutes'
import { useCustomization } from '@/lib/customizationContext'
import { buildProgressV2Model, type BriefItem, type BriefStatus } from '@/lib/progressV2Model'

interface ProgressV2Props {
  lang: Lang
  onNavigate?: (route: AppRoute) => void
}

const STATUS_ICON: Record<BriefStatus, string> = { improved: 'TrendingUp', stable: 'Minus', needsData: 'Circle', caution: 'AlertTriangle', unknown: 'Circle' }
const STATUS_CLR: Record<BriefStatus, string> = { improved: 'text-success', stable: 'text-ink-500', needsData: 'text-ink-400', caution: 'text-warning', unknown: 'text-ink-400' }

/**
 * Progress v2 — Qimmah v2.1 (Slice 6). Preview-gated (ProgressView branches
 * here under isDesignV2). A coach-style Brief of the last 14 days built from
 * real local state; honest needs-data prompts otherwise. No fake progress,
 * PRs, body-fat, or steps.
 */
export function ProgressV2({ lang, onNavigate }: ProgressV2Props) {
  const { customization } = useCustomization()
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const model = useMemo(() => buildProgressV2Model(customization, lang), [customization, lang])
  const go = (r?: string) => r && onNavigate?.(r as AppRoute)

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="min-h-screen bg-page px-4 pb-8 pt-3 text-ink-900">
      <div className="mx-auto w-full max-w-md space-y-4">
        <header className="flex items-center justify-between pt-1">
          <h1 className="text-2xl font-black tracking-tight">{t('التقدم', 'Progress')}</h1>
          {model.goalLabel && <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{model.goalLabel}</span>}
        </header>

        {/* Brief hero */}
        <section className="rounded-3xl border border-line bg-surface p-5 shadow-card">
          <p className="text-xs font-black uppercase tracking-wider text-primary">{model.period.label}</p>
          <h2 className="mt-2 text-xl font-black leading-snug">{model.brief.headline}</h2>
          <div className="mt-4 space-y-2.5">
            {model.brief.items.map((it, i) => <BriefRow key={i} it={it} onGo={go} />)}
          </div>
        </section>

        {/* Momentum score */}
        <section className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-black">{t('الزخم', 'Momentum')}</span>
            <span className="text-xs font-bold text-ink-500">{model.momentum.overallScore}/100</span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            <ScorePill label={t('تدريب', 'Train')} v={model.momentum.trainingScore} />
            <ScorePill label={t('تغذية', 'Fuel')} v={model.momentum.nutritionScore} />
            <ScorePill label={t('حركة', 'Move')} v={model.momentum.activityScore} />
            <ScorePill label={t('تعافي', 'Recover')} v={model.momentum.recoveryScore} />
          </div>
        </section>

        {/* Weight + strength tiles */}
        <section className="grid grid-cols-2 gap-3">
          <Tile icon="TrendingUp" title={t('الوزن والجسم', 'Weight & body')} main={model.weight.currentKg ? `${model.weight.currentKg} ${t('كجم', 'kg')}` : t('غير مسجّل', 'Not logged')} sub={model.weight.targetKg ? t(`الهدف ${model.weight.targetKg} كجم`, `Target ${model.weight.targetKg} kg`) : t('سجّل وزنك', 'Log weight')} onClick={() => go('progress')} />
          <Tile icon="Dumbbell" title={t('القوة', 'Strength')} main={model.strength.lastSessionTitle ? t('جلسة واحدة', '1 session') : t('لا بيانات', 'No data')} sub={model.strength.lastSessionTitle ? t('نحتاج تمرينين', 'Need two workouts') : t('أكمل تمرينين', 'Complete two')} onClick={() => go('workout')} />
        </section>

        {/* Next actions */}
        {model.nextActions.length > 0 && (
          <section className="space-y-2">
            <p className="text-sm font-black">{t('الخطوة التالية', 'Next steps')}</p>
            {model.nextActions.map((a, i) => (
              <button key={i} type="button" onClick={() => go(a.destination)} className="flex w-full items-center justify-between gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-start hover:border-primary/40">
                <span className="min-w-0"><span className="block text-sm font-bold">{a.label}</span><span className="block text-xs text-ink-500">{a.reason}</span></span>
                <span className="shrink-0 text-xs font-black text-primary">{a.actionLabel}</span>
              </button>
            ))}
          </section>
        )}

        <p className="px-1 text-center text-[0.7rem] text-ink-400">{t('قراءة تقديرية — تتحسّن كلما سجّلت أكثر.', 'An estimated read — sharper the more you log.')}</p>
      </div>
    </div>
  )
}

function BriefRow({ it, onGo }: { it: BriefItem; onGo: (r?: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <Icon name={STATUS_ICON[it.status]} className={cn('h-4.5 w-4.5 shrink-0', STATUS_CLR[it.status])} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{it.label} · <span className="font-black text-ink-900">{it.value}</span></span>
        <span className="block text-xs text-ink-500">{it.note}</span>
      </span>
      {it.actionLabel && it.destination && (
        <button type="button" onClick={() => onGo(it.destination)} className="shrink-0 text-xs font-black text-primary">{it.actionLabel}</button>
      )}
    </div>
  )
}

function ScorePill({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-full border-2 border-line">
        <span className={cn('text-sm font-black', v > 0 ? 'text-primary' : 'text-ink-400')}>{v}</span>
      </div>
      <p className="mt-1 text-[0.65rem] font-bold text-ink-500">{label}</p>
    </div>
  )
}

function Tile({ icon, title, main, sub, onClick }: { icon: string; title: string; main: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-2xl border border-line bg-surface p-4 text-start transition-colors hover:border-primary/40">
      <span className="flex items-center gap-2 text-xs font-bold text-ink-500"><Icon name={icon} className="h-4 w-4" />{title}</span>
      <p className="mt-2 text-lg font-black">{main}</p>
      <p className="text-xs text-ink-500">{sub}</p>
    </button>
  )
}
