// طبقة العرض لمحرّك الرؤى (تكامل الواجهة). النواة (metrics/generate) تبقى نقيّة؛
// هذا المكوّن تقديمي فقط: يعرض بطاقات مُحوَّطة، كلٌّ جملة + فعل + وجهة.
// وصولية: تباين AA (نصّ ink-900/ink-700)، RTL منطقي، وآمن مع reduced-motion.

import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import type { AppRoute } from '@/lib/appRoutes'
import type { CardDest, CardTone, InsightCard } from './types'

const DEST_ROUTE: Record<CardDest, AppRoute> = { progress: 'progress', nutrition: 'nutrition', workout: 'workout', setup: 'setup' }

// نقطة لون النبرة (المعنى لا يعتمد على اللون وحده — النصّ يحمل الرسالة كاملة).
const TONE_DOT: Record<CardTone, string> = {
  good: 'bg-[color:var(--v2-pillar-nutrition,#3e9e6b)]',
  watch: 'bg-primary',
  info: 'bg-[color:var(--v2-blue,#3b82f6)]',
  needsData: 'bg-ink-400',
}

interface Props {
  cards: InsightCard[]
  lang: 'ar' | 'en'
  onNavigate: (route: AppRoute) => void
  /** عنوان اختياري فوق القائمة. */
  title?: string
  /** عرض مضغوط (بطاقة واحدة على «اليوم»). */
  max?: number
}

export function InsightCardsView({ cards, lang, onNavigate, title, max }: Props) {
  const ar = lang === 'ar'
  const shown = typeof max === 'number' ? cards.slice(0, max) : cards
  if (shown.length === 0) return null
  return (
    <section aria-label={ar ? 'رؤى الأسبوع' : 'Weekly insights'} className="space-y-2.5">
      {title && <p className="v2-text-blue text-xs font-black uppercase tracking-wider">{title}</p>}
      <ul className="space-y-2.5">
        {shown.map((c, i) => (
          <li key={`${c.key}-${i}`}>
            <button
              type="button"
              onClick={() => onNavigate(DEST_ROUTE[c.dest])}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-start',
                'transition-colors motion-reduce:transition-none hover:border-primary/40',
              )}
            >
              <span aria-hidden="true" className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', TONE_DOT[c.tone])} />
              <span className="min-w-0 flex-1 text-sm font-bold leading-relaxed text-ink-900">{c.text}</span>
              <span className="shrink-0 whitespace-nowrap text-xs font-black text-primary-c">
                {c.actionLabel}
                <Icon name={ar ? 'ChevronLeft' : 'ChevronRight'} className="ms-0.5 inline-block h-3.5 w-3.5 align-[-2px]" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
