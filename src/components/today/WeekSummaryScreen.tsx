// شاشة ملخّص اليوم السابع (ADV-20 + Q-212 المصحّحة) — [CTO-70] البند ٥.
//
// **الترتيب إلزامي ولا يُعاد تركيبه**:
//   ١ السلوك (ما فعله بيده)  ← ٢ تحصين الميزان  ← ٣ الوزن  ← ٤ عرض الحساب.
// من يرى وزنه أولًا يحكم على أسبوعه برقم يتقلّب بالماء والملح فيترك التطبيق
// وهو ملتزم فعلًا. لذلك يأتي الوزن **بعد** التحصين لا قبله، وبلا حكم عليه.
//
// ولا streak، ولا أحمر، ولا مقارنة بمستخدمين آخرين.

import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { firstWeekStrings } from '@/i18n/dict/firstWeek'
import type { WeekSummaryStats } from '@/lib/weekSummary'

interface WeekSummaryScreenProps {
  lang: Lang
  stats: WeekSummaryStats
  /** آخر وزن مسجَّل خلال الأسبوع، أو `null` إن لم يُسجَّل — لا رقم مخترع. */
  weightKg: string | null
  /** يُعرض عرض الحساب للضيف فقط؛ صاحب الحساب لا يُعرض عليه ما يملكه. */
  showAccountOffer: boolean
  onCreateAccount: () => void
  onClose: () => void
}

export function WeekSummaryScreen({ lang, stats, weightKg, showAccountOffer, onCreateAccount, onClose }: WeekSummaryScreenProps) {
  const ar = lang !== 'en'
  const t = firstWeekStrings[ar ? 'ar' : 'en']

  return (
    <div
      dir={ar ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[90] overflow-y-auto bg-page px-5 py-8 text-ink-900"
      role="dialog"
      aria-modal="true"
      aria-labelledby="week-summary-title"
    >
      <div className="mx-auto w-full max-w-md space-y-5">
        <h1 id="week-summary-title" className="text-2xl font-black tracking-tight">{t.weekTitle}</h1>

        {/* ① السلوك أولًا — أرقام من أحداث التتبّع الفعلية. */}
        <section aria-labelledby="week-behaviour" className="rounded-3xl border border-line bg-surface p-4 shadow-card">
          <h2 id="week-behaviour" className="flex items-center gap-2 text-base font-black">
            <Icon name="Check" className="h-5 w-5" style={{ color: 'var(--v2-green-text)' }} />
            {t.weekBehaviourHeading}
          </h2>
          <ul className="mt-3 space-y-2 text-sm font-bold text-ink-700">
            <li>{t.weekDaysLine(stats.activeDays, stats.totalDays)}</li>
            <li>{t.weekWorkoutsLine(stats.workouts)}</li>
            <li>{t.weekMealsLine(stats.meals)}</li>
          </ul>
        </section>

        {/* ② تحصين الميزان — **قبل** الوزن دائمًا. */}
        <section aria-labelledby="week-scale" className="rounded-3xl border border-line bg-surface p-4 shadow-card">
          <h2 id="week-scale" className="text-base font-black">{t.weekScaleTitle}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{t.weekScaleBody}</p>
        </section>

        {/* ③ الوزن أخيرًا وبلا حكم — ولا رقم إن لم يُسجَّل. */}
        <section aria-labelledby="week-weight" className="rounded-3xl border border-line bg-surface p-4 shadow-card">
          <h2 id="week-weight" className="text-base font-black">{t.weekWeightHeading}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
            {weightKg ? t.weekWeightLine(weightKg) : t.weekWeightNone}
          </p>
        </section>

        {/* ④ عرض الحساب — بالصياغة الموقّعة: لا وعد حفظ/استعادة، المزامنة مطفأة. */}
        {showAccountOffer && (
          <section aria-labelledby="week-account" className="rounded-3xl border border-line bg-surface p-4 shadow-card">
            <h2 id="week-account" className="text-base font-black">{t.weekAccountTitle}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{t.weekAccountBody}</p>
            <button type="button" onClick={onCreateAccount} className="btn-primary tap-target mt-3 w-full py-3">
              {t.weekAccountCta}
            </button>
          </section>
        )}

        <button type="button" onClick={onClose} className="tap-target w-full rounded-2xl border border-line bg-surface py-3 text-center text-sm font-bold text-ink-700">
          {t.weekClose}
        </button>
      </div>
    </div>
  )
}
