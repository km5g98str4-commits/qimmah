// ═══════════════════════════════════════════════════════════════════════════
//  مدخل المرشد من «اليوم» — [SOVEREIGN-COACH-002].
//
//  ═══ لماذا ملفّ مستقلّ لا سطر داخل `CoachView` ═══
//  «اليوم» شاشة **يفتحها كل مستخدم كل يوم**. لو استوردت الشاشةَ الكاملة لجرّت
//  معها المحرّك ومحرّك البدائل ومولّد الخطة إلى حزمة اللوحة — وهي كلفة يدفعها
//  من لن يفتح المرشد أبدًا. هذا الملف لا يستورد شيئًا من `src/lib/coach`:
//  أيقونة، وثلاثة نصوص من القاموس، ونداء تنقّل. والحزمة الثقيلة تبقى خلف
//  `React.lazy` على المسار وحده.
//
//  ولا يدّعي شيئًا: النصّ يقول «ستة أسئلة… بلا نموذج لغوي» — نفس ما تفعله
//  الشاشة بالضبط.
// ═══════════════════════════════════════════════════════════════════════════

import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { coachStrings } from '@/i18n/dict/coach'

interface CoachTodayEntryProps {
  lang: Lang
  /** يفتح `#/coach` — التنقّل يبقى مسؤولية الشاشة المضيفة. */
  onOpen: () => void
}

export function CoachTodayEntry({ lang, onOpen }: CoachTodayEntryProps) {
  const s = coachStrings[lang]
  return (
    <section aria-labelledby="coach-entry-title" className="rounded-3xl border border-line bg-surface p-4 shadow-card">
      <span className="flex items-center gap-1.5 text-xs font-black" style={{ color: 'var(--v2-blue-text)' }}>
        <Icon name="MessageCircle" className="h-4 w-4" />
        {s.eyebrow}
      </span>
      <h3 id="coach-entry-title" className="mt-1.5 text-lg font-black leading-tight">
        {s.entryTitle}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-500">{s.entryBody}</p>
      <button
        type="button"
        onClick={onOpen}
        className="v2-pressable mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-2xl px-4 text-base font-black text-white"
        style={{ background: 'var(--v2-blue)' }}
      >
        {s.entryCta}
        <Icon name="ChevronLeft" className="h-4 w-4 ltr:rotate-180" />
      </button>
    </section>
  )
}
