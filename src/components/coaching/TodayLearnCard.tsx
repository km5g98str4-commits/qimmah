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
  const { user } = useAuth()
  const uid = user?.id ?? null
  const [lesson, setLesson] = useState(() => currentTodayLesson(uid, SEED))

  useEffect(() => {
    setLesson(currentTodayLesson(uid, SEED))
  }, [uid])

  if (!ar) return null

  const understood = () => {
    markLessonUnderstood(uid, SEED)
    setLesson(currentTodayLesson(uid, SEED))
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-4" aria-label="تعلّم">
      <div className="flex items-center gap-1.5">
        <Icon name="Sparkles" className="h-4 w-4 text-primary-c" />
        <span className="text-xs font-black uppercase tracking-wider text-primary-c">تعلّم</span>
      </div>
      <h3 className="mt-2 text-base font-black text-ink-900">{lesson.titleAr}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{lesson.bodyAr}</p>
      <p className="mt-2.5 flex items-start gap-1.5 rounded-xl bg-beige/60 p-2.5 text-xs leading-relaxed text-ink-700">
        <Icon name="CheckCircle2" className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-success)]" />
        <span>{lesson.takeawayAr}</span>
      </p>
      <button type="button" onClick={understood} className="btn-ghost mt-3 w-full py-2.5 text-sm">
        فهمت
      </button>
    </section>
  )
}
