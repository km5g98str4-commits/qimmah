// رسم المسار — من أين يبدأ، وإلى أين تتّجه الخطة.
// [OVERNIGHT-4] الحزمة ٤ · §6.3.
//
// ═══ ما يُعرض هنا وما لا يُعرض ═══
// كل رقم مصدره واحد من اثنين، ولا ثالث:
//   • **مقاس**: الوزن الذي أدخله المستخدم بنفسه. يُقال حاسمًا.
//   • **مشتقّ**: الوزن المستهدف (`deriveTargetWeight`) والمدّة والمعدّل
//     (`Targets.estimatedWeeksToGoal` · `weeklyWeightChangeKg`). تُقال متحفّظة،
//     وتحمل وسم «تقريبي» **مرئيًّا** لا في تعليق كود.
//
// ولا يُعرض هنا وزنٌ مستهدف أدخله المستخدم — لأنّ الإعداد **لا يسأل عنه**
// (الأسئلة الثمانية عشر لا تتضمّنه). فاختراع حقل «هدفك» هنا كان سيكون رقمًا
// بلا مصدر، والميثاق §٥ يمنعه.
//
// وحين يكون الهدف ثباتًا (صحة/حفاظ) يتساوى المقاس والمشتقّ، فلا يُرسم خطّ
// صاعد ولا نازل: رسمُ ميلٍ وهميّ لهدفٍ ليس فيه ميل **كذبة بصرية**.

import type { Lang } from '@/lib/appPreferences'
import type { GoalType, Targets } from '@/types/profile'
import { revealStrings } from '@/i18n/dict/reveal'
import { formatNumber } from '@/lib/numberFormat'
import { Icon } from '@/components/Icon'

export interface RevealJourneyProps {
  lang: Lang
  /** الوزن كما أدخله المستخدم — مقاس. */
  currentWeightKg: number
  /** الوزن المستهدف المشتقّ من الهدف — لا يُدخله المستخدم. */
  targetWeightKg: number
  goalType: GoalType
  targets?: Targets
}

export function RevealJourney({ lang, currentWeightKg, targetWeightKg, goalType, targets }: RevealJourneyProps) {
  const t = revealStrings[lang] ?? revealStrings.ar
  const j = t.journey
  const steady = Math.abs(targetWeightKg - currentWeightKg) < 0.5
  const descending = targetWeightKg < currentWeightKg

  const weeks = targets?.estimatedWeeksToGoal
  const rate = targets?.weeklyWeightChangeKg

  return (
    <section
      className="rounded-2xl border border-line bg-surface p-4"
      data-testid="reveal-journey"
      data-goal-type={goalType}
      data-shape={steady ? 'steady' : descending ? 'descending' : 'ascending'}
    >
      <h2 className="text-sm font-black text-ink-900">{j.title}</h2>

      {steady ? (
        <div className="mt-3" data-testid="reveal-journey-steady">
          <p className="text-sm font-bold text-ink-900">{j.steadyTitle}</p>
          <p className="mt-1 text-[0.8rem] leading-relaxed text-ink-500">{j.steadyBody}</p>
        </div>
      ) : (
        <>
          {/* الرسم: نقطتان وخطّ بينهما. اتجاهه منطقيّ لا اتجاهيّ — نستعمل
              الخصائص المنطقية فينعكس مع RTL/LTR بلا قيم left/right صلبة. */}
          <div className="mt-4 flex items-end justify-between gap-3" data-testid="reveal-journey-track">
            {/* الارتفاع يتبع الرقم: هدف أخفّ يُرسم **أنزل**، وهدف أثقل يُرسم
                أعلى. رسمُ هدف التنشيف فوق نقطة البداية يقرأ عكس معناه تمامًا. */}
            <Endpoint
              label={j.current}
              value={formatNumber(Math.round(currentWeightKg), lang)}
              unit={j.unitKg}
              tone="now"
              raised={descending}
            />
            <div className="relative mb-5 h-px flex-1" aria-hidden="true">
              {/* التدرّج منطقيّ لا اتجاهيّ — ينعكس مع اللغة فلا يشير للخلف. */}
              <span className="absolute inset-x-0 top-1/2 block h-0.5 -translate-y-1/2 rounded-full from-ink-300 to-primary ltr:bg-gradient-to-r rtl:bg-gradient-to-l" />
            </div>
            <Endpoint
              label={j.target}
              value={formatNumber(Math.round(targetWeightKg), lang)}
              unit={j.unitKg}
              tone="target"
              raised={!descending}
              estimateBadge={j.estimateBadge}
            />
          </div>

          {(weeks || rate) && (
            <ul className="mt-4 space-y-1.5 text-[0.8rem] text-ink-500">
              {typeof weeks === 'number' && weeks > 0 && (
                <li data-testid="reveal-journey-weeks">{j.weeks(formatNumber(weeks, lang))}</li>
              )}
              {typeof rate === 'number' && rate !== 0 && (
                <li data-testid="reveal-journey-rate">{j.weeklyRate(formatNumber(Math.abs(Number(rate.toFixed(2))), lang))}</li>
              )}
            </ul>
          )}
        </>
      )}

      {/* تنويه الصدق يظهر في الحالتين — ليس زينةً تُخفى حين تُزعج. */}
      <p className="mt-4 flex items-start gap-2 text-[0.75rem] leading-relaxed text-ink-400" data-testid="reveal-journey-honesty">
        <Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{j.honesty}</span>
      </p>
    </section>
  )
}

function Endpoint({
  label, value, unit, tone, raised, estimateBadge,
}: {
  label: string
  value: string
  unit: string
  tone: 'now' | 'target'
  raised: boolean
  estimateBadge?: string
}) {
  return (
    <div className={['flex flex-col items-center', raised ? '' : 'mt-6'].join(' ')}>
      <span className="text-[0.68rem] font-bold text-ink-400">{label}</span>
      <span
        className={[
          'mt-1 flex min-h-[44px] min-w-[64px] items-baseline justify-center rounded-xl border px-2.5 py-1.5 text-base font-black',
          tone === 'target' ? 'border-primary/40 bg-primary-soft text-primary-c' : 'border-line bg-page text-ink-900',
        ].join(' ')}
      >
        <span className="tabular-nums">{value}</span>
        <span className="ms-1 text-[0.72em] font-bold">{unit}</span>
      </span>
      {estimateBadge && (
        <span className="mt-1 rounded-full bg-ink-100 px-2 py-0.5 text-[0.62rem] font-bold text-ink-500">
          {estimateBadge}
        </span>
      )}
    </div>
  )
}
