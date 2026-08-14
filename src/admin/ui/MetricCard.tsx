/**
 * بطاقة مقياس — **الوحدة الذرّية لصدق هذه اللوحة**.
 * [QIMMAH-SOVEREIGN-PHASE-II-001] · AGENT-E.
 *
 * كل رقم في الشاشة يمرّ من هنا، فيكفي أن تكون هذه البطاقة صادقة لتصير الشاشة
 * صادقة. وثلاثة قيود بنيوية تحفظها:
 *   ١) **الغياب لا يُرسم رقمًا.** لا `?? 0` ولا شرطة ولا هيكل يدور بلا نهاية:
 *      «غير متاح» + السبب + المالك.
 *   ٢) **رقم بلا `asOf` لا يُعرض.** النوع يمنعه أصلًا، والواجهة تُظهر اللحظة
 *      دائمًا — قيمة قديمة تبدو حيّة أخطر من غياب.
 *   ٣) **كل نصّ من القاموس.** لا سلسلة صلبة واحدة (الميثاق §6).
 *
 * والاتجاه منطقي بالكامل (`ms-`/`me-`/`text-start`) فتنقلب الشاشة مع اللغة
 * بلا قاعدة اتجاهية ثابتة واحدة.
 */

import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import { adminStrings } from '@/i18n/dict/admin'
import { useLang } from '@/i18n'
import { findMetric } from '../contract/metrics'
import type { MetricValue } from '../contract/types'

interface MetricCardProps {
  /** معرّف المقياس في السجلّ — منه يُقرأ الاسم والسبب والمالك. */
  metricId: string
  value: MetricValue<number | string>
  /** منسّق العرض — النسب والأعداد تُعرض بأشكال مختلفة. */
  format?: (v: number | string) => string
  /** بطاقة بارزة في شريط الرأس. */
  emphasis?: boolean
  className?: string
}

const OWNER_KEY = {
  backend: 'ownerBackend',
  'product-decision': 'ownerProduct',
  client: 'ownerClient',
} as const

export function MetricCard({ metricId, value, format, emphasis, className }: MetricCardProps) {
  const lang = useLang()
  const t = adminStrings[lang]
  const def = findMetric(metricId)
  const label = t.labels[metricId] ?? metricId

  return (
    <div
      className={cn('card flex flex-col gap-2 p-4 text-start', emphasis && 'sm:p-5', className)}
      data-metric={metricId}
      data-state={value.state}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-bold text-ink-500">{label}</span>
        {def ? <AvailabilityChip availability={def.availability} /> : null}
      </div>

      {value.state === 'ready' ? (
        <>
          <span className={cn('font-extrabold tabular-nums text-ink-900', emphasis ? 'text-3xl' : 'text-2xl')}>
            {format ? format(value.value) : String(value.value)}
          </span>
          <span className="text-[11px] text-ink-400">
            {t.shell.asOf}: <time dateTime={value.asOf}>{value.asOf.slice(0, 16).replace('T', ' ')}</time>
          </span>
        </>
      ) : null}

      {value.state === 'loading' ? (
        <div className="flex items-center gap-2 text-sm text-ink-500">
          <span className="skeleton h-7 w-20" aria-hidden="true" />
          <span className="sr-only">{t.states.loading}</span>
        </div>
      ) : null}

      {value.state === 'error' ? (
        <div className="flex items-start gap-2">
          <Icon name="AlertCircle" className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <span className="text-sm font-bold text-danger">{t.states.error}</span>
        </div>
      ) : null}

      {value.state === 'unavailable' ? (
        <div className="flex flex-col gap-1">
          {/*
            «غير متاح» نصًّا لا رمزًا: المعنى لا يُحمل باللون وحده (قاعدة الوصولية
            في الميثاق §9)، ولا بشرطة تُقرأ صفرًا.
          */}
          <span className="text-sm font-bold text-ink-500">{t.states.unavailable}</span>
          {def ? (
            <>
              <p className="text-[11px] leading-relaxed text-ink-400">{t.reasons[def.unavailableReasonKey] ?? ''}</p>
              <span className="text-[11px] font-bold text-ink-500">
                {t.states.owner}: {t.states[OWNER_KEY[def.owner]]}
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/** شارة الدرجة — نصّ + أيقونة، فلا يحمل اللون المعنى وحده. */
export function AvailabilityChip({ availability }: { availability: keyof typeof CHIP_META }) {
  const lang = useLang()
  const t = adminStrings[lang]
  const meta = CHIP_META[availability]
  return (
    <span
      className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold', meta.cls)}
      data-availability={availability}
    >
      <Icon name={meta.icon} className="h-3 w-3" />
      {t.availability[availability]}
    </span>
  )
}

const CHIP_META = {
  AVAILABLE_NOW: { icon: 'CheckCircle2', cls: 'bg-success/15 text-success' },
  NEEDS_BACKEND: { icon: 'Database', cls: 'bg-warning/15 text-warning' },
  IMPOSSIBLE_WITHOUT_CONSENT_CHANGE: { icon: 'Lock', cls: 'bg-ink-500/15 text-ink-500' },
} as const
