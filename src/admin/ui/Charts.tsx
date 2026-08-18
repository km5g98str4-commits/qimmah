/**
 * رسوم اللوحة — SVG خفيف بلا مكتبات (نفس نهج `src/components/LineChart.tsx`).
 * [QIMMAH-SOVEREIGN-PHASE-II-001] · AGENT-E.
 *
 * ═══ قاعدتان ═══
 * ١) **لا رسم بلا بيانات.** سلسلة غير متاحة تُستبدل بكتلة «غير متاح» بسببها،
 *    لا بخطّ مسطّح ولا بشبكة فارغة. الشبكة الفارغة تبدو **قياسًا يساوي صفرًا**،
 *    وهي أخطر من غياب معلَن.
 * ٢) **محور الزمن يتبع الاتجاه.** في العربية يقرأ الزمن من اليمين لليسار، فترتيب
 *    النقاط ينعكس بحساب الإحداثيات لا بمرآة CSS — المرآة كانت ستقلب النصّ
 *    والأرقام معه.
 */

import { useId, type ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { adminStrings } from '@/i18n/dict/admin'
import { useLanguage } from '@/i18n'
import { findMetric } from '../contract/metrics'
import type { FunnelStage, MetricValue, SeriesPoint } from '../contract/types'

function ChartFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <figure className="card p-4 text-start sm:p-5">
      <figcaption className="text-sm font-extrabold text-ink-900">{title}</figcaption>
      <div className="mt-3">{children}</div>
    </figure>
  )
}

/** كتلة اللاإتاحة داخل إطار رسم — نفس عقد بطاقة المقياس. */
function ChartUnavailable({ metricId }: { metricId: string }) {
  const { lang } = useLanguage()
  const t = adminStrings[lang]
  const def = findMetric(metricId)
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-line p-4">
      <Icon name="CircleSlash" className="mt-0.5 h-5 w-5 shrink-0 text-ink-400" />
      <div>
        <p className="text-sm font-bold text-ink-500">{t.states.unavailable}</p>
        {def ? <p className="mt-1 text-[11px] leading-relaxed text-ink-400">{t.reasons[def.unavailableReasonKey] ?? ''}</p> : null}
      </div>
    </div>
  )
}

interface TrendChartProps {
  title: string
  metricId: string
  data: MetricValue<readonly SeriesPoint[]>
  height?: number
}

export function TrendChart({ title, metricId, data, height = 140 }: TrendChartProps) {
  const { lang, dir } = useLanguage()
  const t = adminStrings[lang]
  const id = useId()

  if (data.state !== 'ready') {
    return (
      <ChartFrame title={title}>
        {data.state === 'loading' ? (
          <div className="skeleton h-[140px] w-full" aria-label={t.states.loading} />
        ) : data.state === 'error' ? (
          <p className="text-sm font-bold text-danger">{t.states.error}</p>
        ) : (
          <ChartUnavailable metricId={metricId} />
        )}
      </ChartFrame>
    )
  }

  const points = data.value
  if (points.length < 2) {
    return (
      <ChartFrame title={title}>
        <p className="text-sm text-ink-500">{t.states.empty}</p>
      </ChartFrame>
    )
  }

  const width = 640
  const pad = 10
  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const lastIndex = points.length - 1

  const coords = points.map((p, i) => {
    // في RTL يبدأ أقدم تاريخ من اليمين — انعكاس حسابي لا مرآة بصرية.
    const ratio = dir === 'rtl' ? (lastIndex - i) / lastIndex : i / lastIndex
    return {
      x: pad + ratio * (width - pad * 2),
      y: pad + (1 - (p.value - min) / range) * (height - pad * 2),
    }
  })
  const ordered = dir === 'rtl' ? [...coords].reverse() : coords
  const line = ordered.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L ${ordered[ordered.length - 1].x.toFixed(1)} ${height} L ${ordered[0].x.toFixed(1)} ${height} Z`

  return (
    <ChartFrame title={title}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${title} — ${min}…${max}`}
      >
        <defs>
          <linearGradient id={`admin-grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--c-primary)" stopOpacity="0.26" />
            <stop offset="100%" stopColor="var(--c-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#admin-grad-${id})`} />
        <path d={line} fill="none" stroke="var(--c-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mt-2 flex justify-between text-[11px] tabular-nums text-ink-400">
        <span>{points[dir === 'rtl' ? lastIndex : 0].date}</span>
        <span>{points[dir === 'rtl' ? 0 : lastIndex].date}</span>
      </div>
    </ChartFrame>
  )
}

interface FunnelChartProps {
  title: string
  metricId: string
  stages: readonly FunnelStage[]
}

/**
 * قمع أفقي بأشرطة نسبية.
 *
 * **المقام هو المرحلة الأولى المتاحة**، ولو كانت هي نفسها غير متاحة فلا نسبة
 * أصلًا — تُعرض المراحل بلا شريط. حساب نسبة على مقام مجهول اختراعٌ صامت.
 */
export function FunnelChart({ title, metricId, stages }: FunnelChartProps) {
  const { lang } = useLanguage()
  const t = adminStrings[lang]

  const first = stages[0]
  const base = first && first.count.state === 'ready' ? first.count.value : null

  if (base === null) {
    return (
      <ChartFrame title={title}>
        <ChartUnavailable metricId={metricId} />
      </ChartFrame>
    )
  }

  return (
    <ChartFrame title={title}>
      <ul className="flex flex-col gap-3">
        {stages.map((s) => {
          const v = s.count.state === 'ready' ? s.count.value : null
          const pct = v !== null && base > 0 ? Math.round((v / base) * 100) : null
          return (
            <li key={s.id} data-stage={s.id}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-bold text-ink-700">{t.funnel[s.labelKey] ?? s.labelKey}</span>
                <span className="tabular-nums text-ink-500">
                  {v !== null ? `${v}${pct !== null ? ` · ${pct}%` : ''}` : t.states.unavailable}
                </span>
              </div>
              {/* شريط النسبة يُرسم للمتاح وحده — لا شريط بعرض صفر يوهم بقياس. */}
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-beige">
                {pct !== null ? (
                  <div className="h-full rounded-full bg-[var(--c-primary)]" style={{ width: `${pct}%` }} />
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </ChartFrame>
  )
}
