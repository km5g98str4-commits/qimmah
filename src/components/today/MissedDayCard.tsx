// بروتوكول التعثّر (ADV-18) — [CTO-70] البند ٣.
//
// اليوم الفائت يُعرض **محايدًا**: لا أحمر، ولا رمز حزن، ولا streak مكسور، ولا
// عدّ أيام ضائعة. الرسالة «يوم عادي. نبدأ من اليوم» — والفوات حدث عادي في أي
// رحلة، ومعاملتُه كارثةً هي ما يُخرج المستخدم لا الفوات نفسه.
//
// ومخرج بنقرة واحدة: بديل مخفّف جاهز برقمين حقيقيين من خطة المستخدم، **يعدّل
// جلسة اليوم فقط** — سطر صريح يقوله حتى لا يُظنّ أن الخطة تغيّرت.

import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { firstWeekStrings } from '@/i18n/dict/firstWeek'

interface MissedDayCardProps {
  lang: Lang
  /** مدّة جلسة اليوم كما تُعرض في البطل — نفس الرقم لا رقم ثانٍ. */
  fullMin: number
  easyMin: number
  onStartEasy: () => void
}

export function MissedDayCard({ lang, fullMin, easyMin, onStartEasy }: MissedDayCardProps) {
  const ar = lang !== 'en'
  const t = firstWeekStrings[ar ? 'ar' : 'en']
  // الرقمان يمرّان بقاعدة السؤالين: متاحان (من الخطة المعروضة) وصحيحان لهذا
  // السياق (مدّة اليوم لا متوسط عام). بلا مدّة حقيقية لا يُعرض السطر إطلاقًا.
  const hasHonestNumbers = fullMin > 0 && easyMin > 0 && easyMin < fullMin

  return (
    <section aria-labelledby="missed-day-title" className="rounded-3xl border border-line bg-surface p-4 shadow-card">
      <h2 id="missed-day-title" className="flex items-center gap-2 text-base font-black text-ink-900">
        {/* أيقونة محايدة بلون هادئ — لا أحمر ولا رمز حزن في أي حالة فوات. */}
        <Icon name="Sunrise" className="h-5 w-5" style={{ color: 'var(--v2-pillar-move)' }} />
        {t.missedTitle}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{t.missedBody}</p>

      {hasHonestNumbers && (
        <p className="mt-3 text-sm font-black text-ink-900">{t.missedEasierLine(fullMin, easyMin)}</p>
      )}

      <button type="button" onClick={onStartEasy} className="btn-primary mt-3 w-full py-3">
        {t.missedEasierCta}
      </button>

      {/* الحدّ الصريح: جلسة اليوم فقط — الخطة لا تُمَس. */}
      <p className="mt-2 text-center text-xs font-bold text-ink-400">{t.missedTodayOnly}</p>
    </section>
  )
}
