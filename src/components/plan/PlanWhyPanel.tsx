import type { Lang } from '@/lib/appPreferences'
import type { GoalType } from '@/types/profile'
import type { Muscle } from '@/types/workout'
import type { PlanDecision, PlanRationale } from '@/lib/planRationale'
import { ePlanStrings, fillTemplate } from '@/i18n/dict/ePlan'

/**
 * «لماذا هذه خطتك؟» (حارة E · المرحلة الثانية — الموجة ٣) — **مكوّن عرضي بحت.**
 *
 * يستهلك `PlanRationale` عبر prop حصرًا: لا تخزين، لا استدعاء للمولّد، لا حالة.
 * كل ما يفعله: **ترجمة مفاتيح المصدر** إلى نصّ. المنطق كلّه في طبقة التعليل.
 *
 * **لغة القرار تتبع أساسه (§6):**
 *   `measured`   → «مبنيّة على» — الرقم مقروء من الخطة فعلًا، فاللغة حاسمة.
 *   `structural` → «راعينا فيها» — قاعدة معلنة بلا قياس، فاللغة متحفّظة.
 *
 * **والمحاور غير المفعّلة تُعرض ولا تُخفى (§5):** قسم «ما لم نخصّصه بعد» يذكر
 * `trainingFocus` و`pastPerformance` بصراحة، فلا يظنّ المستخدم تخصيصًا لم يحدث.
 *
 * **تسلسل العناوين:** `h2` للبطاقة و`h3` لأقسامها — `h1` ملك الشاشة المضيفة.
 */
export function PlanWhyPanel({
  lang,
  rationale,
}: {
  lang: Lang
  rationale: PlanRationale
}) {
  const s = ePlanStrings[lang]
  const num = (n: number) => (lang === 'ar' ? n.toLocaleString('ar-EG') : n.toLocaleString('en-US'))

  /**
   * يترجم قيمة منظَّمة إلى نصّ. الترتيب مقصود: القاموس الموسوم بالمفتاح أولًا،
   * ثم عناوين التقسيمات، ثم أسماء الأهداف، ثم الأرقام. وإن لم يُعرف المفتاح
   * تُعرض القيمة كما هي بدل اختراع نصّ لا يقابلها.
   */
  const labelFor = (key: string, value: string | number): string => {
    const token = s.tokenLabels[`${key}:${value}`]
    if (token) return token
    if (typeof value === 'number') return num(value)
    // نطاق رقمي يخرج من المحرّك («6–10»): يُعرض بأرقام اللغة، فلا تختلط
    // الأرقام اللاتينية بنصّ عربي (§6 — RTL أولًا).
    const range = value.match(/^(\d+)([–-])(\d+)$/)
    if (range) return `${num(Number(range[1]))}${range[2]}${num(Number(range[3]))}`
    return s.splitTitles[value] ?? s.goalLabels[value as GoalType] ?? value
  }

  const outcomeLine = (d: PlanDecision): string => {
    const template = s.outcomeText[d.outcome.key] ?? '{value}'
    return fillTemplate(template, { value: labelFor(d.outcome.key, d.outcome.value) })
  }

  const driverLine = (d: PlanDecision): string =>
    d.drivers
      .map((driver) => fillTemplate(s.driverText[driver.key], { value: labelFor(driver.key, driver.value) }))
      .join(s.driverJoin)

  return (
    <section
      dir={lang === 'en' ? 'ltr' : 'rtl'}
      data-testid="plan-why-panel"
      aria-labelledby="plan-why-title"
      className="mx-auto w-full max-w-md rounded-2xl bg-surface p-5 shadow-lg"
    >
      <h2 id="plan-why-title" className="text-lg font-semibold text-ink-900">
        {s.whyTitle}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-700">{s.whyIntro}</p>

      <ul className="mt-4 space-y-3" data-testid="plan-why-decisions">
        {rationale.decisions.map((d) => (
          <li key={`${d.area}-${d.outcome.key}`} className="border-s-2 border-ink-200 ps-3">
            <p className="text-sm font-medium text-ink-900">{s.areaLabels[d.area]}</p>
            <p className="mt-0.5 text-sm text-ink-700">{outcomeLine(d)}</p>
            <p className="mt-0.5 text-sm text-ink-500">
              {(d.basis === 'measured' ? s.becauseMeasured : s.becauseStructural)} {driverLine(d)}
            </p>
          </li>
        ))}
      </ul>

      <h3 className="mt-6 text-sm font-medium text-ink-900">{s.volumeHeading}</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-500">{s.volumeNote}</p>
      <ul className="mt-2 space-y-1.5" data-testid="plan-why-volume">
        {rationale.weeklyVolume.map((v) => (
          <li key={v.muscle} className="flex items-baseline justify-between gap-3 text-sm text-ink-700">
            <span className="text-start">{s.muscleLabels[v.muscle as Muscle] ?? v.muscle}</span>
            <span className="shrink-0 text-end text-ink-500">
              {fillTemplate(s.volumeRow, { sets: num(v.sets), sessions: num(v.sessions) })}
            </span>
          </li>
        ))}
      </ul>

      {rationale.inactiveAxes.length > 0 && (
        <>
          <h3 className="mt-6 text-sm font-medium text-ink-900">{s.inactiveHeading}</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-500">{s.inactiveIntro}</p>
          <ul className="mt-2 space-y-1.5" data-testid="plan-why-inactive">
            {rationale.inactiveAxes.map((a) => (
              <li key={a.axis} className="flex items-start gap-2 text-sm text-ink-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400" aria-hidden="true" />
                <span>
                  <span className="font-medium text-ink-900">{s.axisLabels[a.axis]}</span>
                  {' — '}
                  <span className="text-ink-500">{s.axisReasons[a.reason]}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
