/**
 * لوحة «يحتاج انتباهك» — كونسول تشغيل لا تحليلات.
 * [QIMMAH-SOVEREIGN-PHASE-II-001] · AGENT-E.
 *
 * قسمان **مفصولان بصريًا وبعنوان صريح**:
 *   • **مكتشَف** — فحصنا فعلًا ووجدنا.
 *   • **ما نقدر نراقبه بعد** — لم نفحص أصلًا لأننا لا نملك المصدر.
 * وطيّهما في قائمة واحدة (أو إخفاء الثاني) يجعل الطابور الفارغ يُقرأ
 * «كل شيء تمام»، وهو **أخطر كذبة تقولها لوحة تشغيل**: الصمت عن العمى.
 */

import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import { adminStrings } from '@/i18n/dict/admin'
import { useLang } from '@/i18n'
import type { AttentionItem } from '../contract/types'
import { AvailabilityChip } from './MetricCard'

const SEVERITY_CLS = {
  critical: 'border-danger/40 bg-danger/[0.06]',
  warning: 'border-warning/40 bg-warning/[0.06]',
  info: 'border-line bg-surface',
} as const

const SEVERITY_ICON_CLS = {
  critical: 'text-danger',
  warning: 'text-warning',
  info: 'text-ink-500',
} as const

function AttentionRow({ item }: { item: AttentionItem }) {
  const lang = useLang()
  const t = adminStrings[lang]
  const copy = t.attention[item.id]
  return (
    <li
      className={cn('flex items-start gap-3 rounded-xl border p-3 text-start', SEVERITY_CLS[item.severity])}
      data-attention={item.id}
      data-detectable={item.detectable ? 'yes' : 'no'}
    >
      <Icon name={item.icon} className={cn('mt-0.5 h-5 w-5 shrink-0', SEVERITY_ICON_CLS[item.severity])} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-extrabold text-ink-900">{copy?.title ?? item.id}</span>
          <AvailabilityChip availability={item.availability} />
        </div>
        <p className="mt-1 text-xs leading-relaxed text-ink-500">{copy?.detail ?? ''}</p>
      </div>
    </li>
  )
}

export function AttentionPanel({ items }: { items: readonly AttentionItem[] }) {
  const lang = useLang()
  const t = adminStrings[lang]
  const detected = items.filter((i) => i.detectable)
  const blind = items.filter((i) => !i.detectable)

  return (
    <section className="card p-4 text-start sm:p-5" aria-labelledby="admin-attention-heading">
      <div className="flex items-center gap-2">
        <Icon name="Bell" className="h-5 w-5 text-ink-500" />
        <h2 id="admin-attention-heading" className="text-base font-extrabold text-ink-900">
          {t.attentionPanel.heading}
        </h2>
      </div>

      <h3 className="mt-4 text-xs font-bold text-ink-500">
        {t.attentionPanel.detected} ({detected.length})
      </h3>
      {detected.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-2">
          {detected.map((i) => (
            <AttentionRow key={i.id} item={i} />
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-ink-500">{t.attentionPanel.allClear}</p>
      )}

      {/*
        القسم الثاني **لا يُخفى حين يكون فارغًا ولا حين يكون ممتلئًا**. وجوده
        الدائم هو ما يمنع قراءة «لا تنبيهات» على أنها «كل شيء بخير».
      */}
      <h3 className="mt-5 text-xs font-bold text-ink-500">
        {t.attentionPanel.blind} ({blind.length})
      </h3>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-400">{t.attentionPanel.blindNote}</p>
      <ul className="mt-2 flex flex-col gap-2">
        {blind.map((i) => (
          <AttentionRow key={i.id} item={i} />
        ))}
      </ul>
    </section>
  )
}
