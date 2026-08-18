// رسم المسار — من أين يبدأ، وإلى أين تتّجه الخطة.
// [OVERNIGHT-4] الحزمة ٤ · §6.3 — و[SOVEREIGN-003] توحيد سلطة الوزن المستهدف.
//
// ═══ ما يُعرض هنا وما لا يُعرض ═══
// كل رقم مصدره واحد من اثنين، ولا ثالث:
//   • **مقاس**: الوزن الذي أدخله المستخدم بنفسه — وزنه الحالي، **وهدفه إن
//     كتبه بنفسه**. يُقال حاسمًا بلا وسم تقدير.
//   • **مشتقّ**: الوزن المستهدف حين لا يكتبه (`resolveTargetWeight`) والمدّة
//     والمعدّل (`Targets.estimatedWeeksToGoal` · `weeklyWeightChangeKg`).
//     تُقال متحفّظة، وتحمل وسم «تقريبي» **مرئيًّا** لا في تعليق كود.
//
// التمييز بينهما ليس اجتهاد هذه الشاشة: `targetSource` يأتي من السلطة
// (`src/lib/planDerive.ts`)، والشاشة ترسم ما تُخبَر به. سطحان يجتهدان في نفس
// السؤال = رقمان.
//
// ═══ حارس الاتّساق الحسابي (§4.2 · §5) ═══
// العطل الذي أغلقه [SOVEREIGN-003]: الهدف المرسوم كان يأتي من معامل، والمدّة
// المكتوبة تحته من معامل آخر — بطاقة واحدة برقمين. الحارس هنا **لا يثق** بأن
// `targets` حُسبت من نفس الهدف المعروض: يسأل `isTrajectoryConsistent` أولًا،
// وإن لم تتّسق **تسقط المدّة والمعدّل** بدل أن يُعرض رقم يكذّب جاره.
//
// وحين يكون الهدف ثباتًا (صحة/حفاظ) يتساوى المقاس والمشتقّ، فلا يُرسم خطّ
// صاعد ولا نازل: رسمُ ميلٍ وهميّ لهدفٍ ليس فيه ميل **كذبة بصرية**.

import type { Lang } from '@/lib/appPreferences'
import type { GoalType, Targets } from '@/types/profile'
import type { TargetWeightSource } from '@/lib/planDerive'
import { isTrajectoryConsistent } from '@/lib/planDerive'
import { revealStrings } from '@/i18n/dict/reveal'
import { formatNumber } from '@/lib/numberFormat'
import { Icon } from '@/components/Icon'

export interface RevealJourneyProps {
  lang: Lang
  /** الوزن كما أدخله المستخدم — مقاس. */
  currentWeightKg: number
  /** الوزن المستهدف كما حسمته السلطة الواحدة. */
  targetWeightKg: number
  /**
   * من أين جاء الرقم أعلاه. الافتراض `derived` **متحفّظ عمدًا**: سطح لم يُبلّغنا
   * بمصدره يُعامَل تقديرًا، فأسوأ ما يحدث وسمُ رقمٍ حقيقي بـ«تقريبي» — لا
   * ادّعاءُ يقين لرقم مشتقّ.
   */
  targetSource?: TargetWeightSource
  /**
   * رقم المستخدم يعاكس اتجاه هدفه. نعرض رقمه كما هو (لا تصحيح صامت، §5)،
   * ونقولها صراحةً، ونمتنع عن المدّة — لأنها تُحسب من اتجاه السعرات الذي
   * يفرضه الهدف فتخرج عكس رقمه.
   */
  targetContradictsGoal?: boolean
  goalType: GoalType
  targets?: Targets
}

export function RevealJourney({
  lang,
  currentWeightKg,
  targetWeightKg,
  targetSource = 'derived',
  targetContradictsGoal = false,
  goalType,
  targets,
}: RevealJourneyProps) {
  const t = revealStrings[lang] ?? revealStrings.ar
  const j = t.journey
  const steady = Math.abs(targetWeightKg - currentWeightKg) < 0.5
  const descending = targetWeightKg < currentWeightKg
  const isEstimate = targetSource === 'derived'

  const rawWeeks = targets?.estimatedWeeksToGoal
  const rawRate = targets?.weeklyWeightChangeKg
  // المدّة تُعرض **فقط** إذا كانت من نفس أرقام الهدف المعروض. وتناقض الاتجاه
  // يسقطها قبل الحساب: لا مدّة لمسارٍ نقول عنه إنه يعاكس هدفه.
  const trajectory =
    !targetContradictsGoal &&
    typeof rawWeeks === 'number' &&
    typeof rawRate === 'number' &&
    isTrajectoryConsistent(currentWeightKg, targetWeightKg, rawRate, rawWeeks)
      ? { weeks: rawWeeks, rate: rawRate }
      : null

  return (
    <section
      className="rounded-2xl border border-line bg-surface p-4"
      data-testid="reveal-journey"
      data-goal-type={goalType}
      data-target-source={targetSource}
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
            {/* التسمية والوسم يتبعان المصدر: رقمٌ كتبه المستخدم يُسمّى «هدفك»
                بلا «تقريبي»؛ وسمُ رقمه تقديرًا يكذّب مصدره. */}
            <Endpoint
              label={isEstimate ? j.target : j.targetYours}
              value={formatNumber(Math.round(targetWeightKg), lang)}
              unit={j.unitKg}
              tone="target"
              raised={!descending}
              estimateBadge={isEstimate ? j.estimateBadge : undefined}
            />
          </div>

          {targetContradictsGoal && (
            <p
              className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-page p-3 text-[0.78rem] leading-relaxed text-ink-700"
              data-testid="reveal-journey-mismatch"
            >
              <Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-500" />
              <span>{j.mismatchNote}</span>
            </p>
          )}

          {trajectory && (
            <ul className="mt-4 space-y-1.5 text-[0.8rem] text-ink-500">
              {trajectory.weeks > 0 && (
                <li data-testid="reveal-journey-weeks">{j.weeks(formatNumber(trajectory.weeks, lang))}</li>
              )}
              {trajectory.rate !== 0 && (
                <li data-testid="reveal-journey-rate">
                  {j.weeklyRate(formatNumber(Math.abs(Number(trajectory.rate.toFixed(2))), lang))}
                </li>
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
