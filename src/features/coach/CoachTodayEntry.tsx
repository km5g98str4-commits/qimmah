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
import { coachEntryStrings } from '@/i18n/dict/coach'

interface CoachTodayEntryProps {
  lang: Lang
  /** يفتح `#/coach` — التنقّل يبقى مسؤولية الشاشة المضيفة. */
  onOpen: () => void
}

export function CoachTodayEntry({ lang, onOpen }: CoachTodayEntryProps) {
  const s = coachEntryStrings[lang]
  return (
    // [COACH-002] صفّ مدمج لا بطاقة: أيقونة · عنوان · سطر واحد · سهم. المدخل موجود
    // ومقروء، ولا ينافس أفعال اليوم على الشاشة.
    <button
      type="button"
      onClick={onOpen}
      data-testid="coach-entry"
      aria-labelledby="coach-entry-title"
      className="v2-pressable flex min-h-[44px] w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-start shadow-card"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: 'var(--v2-blue-soft, rgba(37, 99, 235, 0.12))', color: 'var(--v2-blue-text)' }}>
        <Icon name="MessageCircle" className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span id="coach-entry-title" className="block text-base font-black leading-tight">{s.entryTitle}</span>
        <span className="mt-0.5 block truncate text-sm text-ink-500">{s.entryBody}</span>
      </span>
      <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400 ltr:rotate-180" />
    </button>
  )
}
