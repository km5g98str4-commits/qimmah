// بطاقة «أول انتصار» (ADV-13) — [CTO-70] البند ١.
//
// تُعرض للقادم الجديد بعد إكمال الإعداد حتى يُنجز انتصاره الأول، ثم تبقى معلَّمة
// «تم» بقية اليوم ولا تعود أبدًا. إجراء **واحد** مقترح + بديل واحد بلا إلحاح:
// لا جولة تعريفية ولا شبكة خيارات تُصيب بالشلل.
//
// لا لوم ولا ضغط ولا تهويل (§6). وسطر المساء يقول الصدق: بعد ٢١:٠٠ اليوم انتهى
// تقريبًا، فنقترح الأخفّ ونعد ببداية صحيحة الصبح بدل أن ندفعه لتمرين لن يبدأه.

import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { firstWeekStrings } from '@/i18n/dict/firstWeek'
import type { FirstWinKind } from '@/lib/tracking'
import type { FirstWinSuggestion } from '@/lib/firstWin'

const WIN_ICON: Record<FirstWinKind, string> = {
  warmup: 'Dumbbell',
  meal: 'Utensils',
  water: 'Droplets',
  dinner: 'Utensils',
}

interface FirstWinCardProps {
  lang: Lang
  suggestion: FirstWinSuggestion
  /** أُنجز بالفعل — تُعرض الحالة «تم» بلا أزرار. */
  done: boolean
  doneKind?: FirstWinKind
  onPick: (kind: FirstWinKind) => void
}

export function FirstWinCard({ lang, suggestion, done, doneKind, onPick }: FirstWinCardProps) {
  const ar = lang !== 'en'
  const t = firstWeekStrings[ar ? 'ar' : 'en']

  if (done) {
    const kind = doneKind ?? suggestion.kind
    return (
      <section
        aria-labelledby="first-win-title"
        className="rounded-3xl border border-line bg-surface p-4 shadow-card"
      >
        <h2 id="first-win-title" className="flex items-center gap-2 text-base font-black">
          {/* أخضر النجاح — لا أحمر في أي حالة من حالات هذه الحزمة. */}
          <Icon name="Check" className="h-5 w-5" style={{ color: 'var(--v2-green-text)' }} />
          {t.firstWinDone}
        </h2>
        <p className="mt-1 text-sm font-bold text-ink-500">{t.win[kind].label}</p>
      </section>
    )
  }

  const primary = suggestion.kind
  return (
    <section aria-labelledby="first-win-title" className="rounded-3xl border border-line bg-surface p-4 shadow-card">
      <h2 id="first-win-title" className="text-base font-black">{t.firstWinTitle}</h2>

      {/* الصدق قبل الطمأنينة: نقولها صريحة حين يكون الوقت متأخّرًا. */}
      {suggestion.partOfDay === 'evening' && (
        <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{t.firstWinEveningNote}</p>
      )}

      <button
        type="button"
        onClick={() => onPick(primary)}
        className="v2-pressable mt-4 flex w-full items-center gap-3 rounded-2xl border border-line bg-page p-3.5 text-start transition-colors hover:border-primary/50"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft">
          <Icon name={WIN_ICON[primary]} className="h-5 w-5 text-primary-c" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black text-ink-900">{t.win[primary].label}</span>
          <span className="block text-xs font-bold text-ink-500">{t.win[primary].minutes}</span>
        </span>
        <span className="btn-primary shrink-0 rounded-xl px-3.5 py-2 text-xs">{t.win[primary].cta}</span>
      </button>

      {/* البدائل حاضرة بلا إلحاح — سطر ثانوي هادئ لا زرّ منافس. */}
      {suggestion.alternatives.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-ink-400">{t.firstWinOther}</span>
          {suggestion.alternatives.map((alt) => (
            <button
              key={alt}
              type="button"
              onClick={() => onPick(alt)}
              className="v2-pressable rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink-700 transition-colors hover:border-primary/50 hover:text-ink-900"
            >
              {t.win[alt].label}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
