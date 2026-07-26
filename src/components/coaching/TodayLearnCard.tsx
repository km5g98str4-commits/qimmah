import { useEffect, useState } from 'react'
import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { useAuth } from '@/lib/authContext'
import { currentTodayLesson, markLessonUnderstood } from '@/lib/coaching'

// بذرة ثابتة: ترتيب الدروس محدَّد بقائمة «المعروض» (لا تكرار حتى النفاد)، والبذرة
// تختار أيًّا من غير المعروضة. ثباتها يجعل «الحالي» و«فهمت» متّسقين.
const SEED = 1

/**
 * بطاقة «تعلّم» في شاشة اليوم — درس دقيق واحد مع إجراء «فهمت» يُدوّره (بلا تكرار حتى
 * يُستنفد كامل الطقم، ثم يعيد الدورة). التقدّم محفوظ لكل حساب (مفتاح مالكي). محتوى
 * عربي — تظهر البطاقة في الواجهة العربية فقط. AA على السطح الفاتح، RTL.
 */
export function TodayLearnCard({ lang }: { lang: Lang }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const { user } = useAuth()
  const uid = user?.id ?? null
  const [lesson, setLesson] = useState(() => currentTodayLesson(uid, SEED))
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setLesson(currentTodayLesson(uid, SEED))
  }, [uid])

  const understood = () => {
    markLessonUnderstood(uid, SEED)
    setLesson(currentTodayLesson(uid, SEED))
    setExpanded(false)
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-4" aria-label={t('تعلّم', 'Learn')}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="today-learning-detail"
        onClick={() => setExpanded((value) => !value)}
        className="v2-pressable flex w-full items-center gap-3 text-start"
      >
        <span className="v2-bg-blue-soft v2-text-blue grid h-10 w-10 shrink-0 place-items-center rounded-xl">
          <Icon name="Sparkles" className="h-4.5 w-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="v2-text-blue block text-xs font-black uppercase tracking-wider">{t('تعلّم', 'Learn')}</span>
          <span className="mt-0.5 block text-sm font-black text-ink-900">{ar ? lesson.titleAr : lesson.titleEn}</span>
        </span>
        <span className="v2-text-blue flex shrink-0 items-center gap-1 text-xs font-black">
          {expanded ? t('أغلق', 'Close') : t('اقرأ', 'Read')}
          <Icon name="ChevronDown" className={`h-4 w-4 transition-transform motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`} />
        </span>
      </button>
      <div id="today-learning-detail" hidden={!expanded} className="pt-3">
        <p className="text-sm leading-relaxed text-ink-700">{ar ? lesson.bodyAr : lesson.bodyEn}</p>
        <p className="mt-2.5 flex items-start gap-1.5 rounded-xl bg-beige/60 p-2.5 text-xs leading-relaxed text-ink-700">
          <Icon name="CheckCircle2" className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-success)]" />
          <span>{ar ? lesson.takeawayAr : lesson.takeawayEn}</span>
        </p>
        <button type="button" onClick={understood} className="btn-ghost mt-3 w-full py-2.5 text-sm">
          {t('فهمت', 'Got it')}
        </button>
      </div>
    </section>
  )
}
