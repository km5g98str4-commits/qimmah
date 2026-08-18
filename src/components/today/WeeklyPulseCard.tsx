import { Icon } from '@/components/Icon'
import { todayHomeStrings } from '@/i18n/dict/todayHome'
import type { Lang } from '@/lib/appPreferences'
import { formatNumber } from '@/lib/numberFormat'
import { weekdayName } from '@/lib/today'
import type { PulseDayState, WeeklyPulse } from '@/lib/weeklyPulse'

/**
 * «نبض أسبوعك» — سبعة أيام حقيقية، بلا نسبة مخترَعة.
 *
 * ═══ عيب المرجع الذي رُفض ═══
 * لقطة «مستخدم جديد» في المرجع تقول «لا توجد بيانات بعد» **وتعرض ثلاثة مربّعات
 * خضراء** في نفس البطاقة. البطاقة هنا تستمدّ المربّعات والسطر من `WeeklyPulse`
 * الواحد، فيستحيل أن يتناقضا بنيويًّا: لا حالة تُرسم إلا وهي في `pulse.days`.
 *
 * ═══ لا لوم ولا لون وحده (§6 · §9) ═══
 *   • «ما تم» رمادي محايد لا أحمر — الفوات ليس عقابًا.
 *   • كل مربّع يحمل رمزًا (✓ للمكتمل · نقطة للجزئي) **و** `aria-label` باسم اليوم
 *     الكامل وحالته. فاللون ثالثُ إشارةٍ لا الإشارة الوحيدة.
 *   • اليوم الحالي يُحدَّد بإطار متقطّع لا بلون — يُقرأ في السمتين وبلا ألوان.
 */

/** لون الخلفية لكل حالة — دلالي حيث توجد دلالة، ومحايد حيث لا توجد. */
const FILL: Record<PulseDayState, string> = {
  completed: 'bg-[color:var(--v2-green)] text-white',
  partial: 'bg-[color:var(--v2-amber)] text-white',
  missed: 'bg-beige text-ink-400',
  today: 'bg-primary-soft text-[color:var(--c-primary)]',
  planned: 'bg-beige text-ink-500',
  rest: 'bg-transparent text-ink-400',
  none: 'bg-transparent text-ink-400',
}

export function WeeklyPulseCard({
  lang,
  pulse,
  children,
}: {
  lang: Lang
  pulse: WeeklyPulse
  /** صفّ إضافي داخل البطاقة (تذكير مساء حقيقي) — يُمرَّر فقط حين يوجد. */
  children?: React.ReactNode
}) {
  const d = todayHomeStrings[lang]
  const n = (value: number) => formatNumber(value, lang)
  const empty = !pulse.hasData

  const summary = empty
    ? d.pulseEmpty
    : pulse.percent === null
      ? d.pulseNoPlan(n(pulse.completedCount))
      : d.pulseSummary(n(pulse.completedCount), n(pulse.plannedCount))

  return (
    <section aria-labelledby="today-pulse-title" className="rounded-3xl border border-line bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="today-pulse-title" className="text-base font-black text-ink-900">{d.pulseTitle}</h2>
          <p className="mt-0.5 text-sm text-ink-500">{d.pulseSubtitle}</p>
        </div>
        {/* بلا مقام لا نسبة: «—» أصدق من رقم يبدو مقيسًا وليس كذلك. */}
        <span className={`shrink-0 text-base font-black tabular-nums ${pulse.percent === null || empty ? 'text-ink-400' : 'text-[color:var(--v2-green-text)]'}`}>
          {pulse.percent === null || empty ? '—' : `${n(pulse.percent)}%`}
        </span>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-ink-700">{summary}</p>

      <ul className="mt-3 flex items-start gap-1">
        {pulse.days.map((day) => {
          /**
           * لا تجاوز على الحالة عند الفراغ. كان هنا `empty ? 'none' : day.state`
           * احتياطًا من تناقض المرجع (سطر «لا بيانات» فوق مربّعات خضراء) — وهو
           * احتياط **غير ممكن الحاجة**: `hasData` صار `sessions.length > 0`،
           * و`dayCompletion` لا يعيد `completed`/`partial` إلا من جلسة موجودة.
           * فالفراغ يستحيل معه وجود مربّع مكتمل بنيويًّا، لا بشرطٍ يحرسه.
           */
          const state: PulseDayState = day.state
          return (
            <li key={day.stamp} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span
                role="img"
                aria-label={`${weekdayName(lang === 'en' ? 'en' : 'ar', new Date(`${day.stamp}T12:00:00`))} · ${d.pulseState[state]}`}
                className={`grid h-9 w-full place-items-center rounded-xl ${FILL[state]} ${
                  day.isToday ? 'border-2 border-dashed border-ink-400' : state === 'rest' || state === 'none' ? 'border border-line' : ''
                }`}
              >
                {/* رمز لكل حالة ذات معنى — فالفرق ليس لونًا وحده (§9).
                    و«ما تم» يحتاج رمزه تحديدًا: كان يتطابق بصريًّا مع «مخطط»
                    (كلاهما `bg-beige` بلا محتوى)، فيوم فات ويوم لم يأتِ بعدُ
                    شيء واحد على الشاشة. شرطة محايدة تفصلهما بلا لوم ولا أحمر. */}
                {state === 'completed' && <Icon name="Check" className="h-4 w-4" strokeWidth={3} aria-hidden="true" />}
                {state === 'partial' && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-white" />}
                {state === 'missed' && <span aria-hidden="true" className="h-0.5 w-2.5 rounded-full bg-ink-400" />}
              </span>
              <span aria-hidden="true" className={`truncate text-[10px] leading-none ${day.isToday ? 'font-black text-ink-900' : 'font-bold text-ink-400'}`}>
                {d.pulseDayShort[day.weekday]}
              </span>
            </li>
          )
        })}
      </ul>

      {children}
    </section>
  )
}
