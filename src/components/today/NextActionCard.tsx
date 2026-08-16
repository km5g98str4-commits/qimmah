import { Icon } from '@/components/Icon'
import { todayHomeStrings } from '@/i18n/dict/todayHome'
import type { Lang } from '@/lib/appPreferences'
import type { TodayV2Model } from '@/lib/todayV2Model'
import { formatNumber, formatNumeralsIn } from '@/lib/numberFormat'
import { playHaptic } from '@/lib/nativeFeedback'

/**
 * بطاقة **الإجراء التالي** — أبرز عنصر بعد ملخّص اليوم.
 *
 * ═══ لماذا لا تقرّر البطاقة شيئًا ═══
 * كل ما تعرضه يأتي من `model.hero` و`model.training` — أي من `buildTodayV2Model`
 * وحده. البطاقة **تصيّر ولا تستنتج**: لا تسأل «هل اليوم راحة؟» ولا «هل أنهى
 * تمرينه؟»، فتلك أسئلة لها جواب واحد معتمد في النموذج. لو استنتجت هنا لصار
 * للسؤال جوابان — وهو العطل الذي أنشأ `workoutDaySource` أصلًا.
 *
 * ═══ ما تغيّر عن المرجع البصري ═══
 *   • **وسم «علوي» رُفض**: لا حقل تركيز/مستوى في نموذج البيانات، واشتقاقه من
 *     اسم اليوم اختراع. وسم «يوم راحة» بقي لأنه `model.restDay` — حقل حقيقي.
 *   • **شريط التقدّم يظهر عند تقدّم حقيقي وحده.** المرجع يعرضه دائمًا بخانة
 *     واحدة ممتلئة، فيوحي بإنجاز لم يقع. صفر تقدّم ⇒ لا شريط.
 *   • صفّ المقاييس الثلاثة (تمارين · مدّة · مجموعات) اعتُمد كما هو — كلّها مقيسة.
 */
export function NextActionCard({
  lang,
  hero,
  training,
  durationMin,
  restDay,
  eyebrowOverride,
  onNavigate,
}: {
  lang: Lang
  hero: TodayV2Model['hero']
  training: TodayV2Model['training']
  /** مدّة الجلسة كما يعرضها النموذج — نفس الرقم الذي يستعمله البطل، لا رقم ثانٍ. */
  durationMin: number
  restDay: boolean
  /** يستبدل لمحة البطل حين يملك السياق لمحة أدقّ (مثل «تم» بعد التمرين). */
  eyebrowOverride?: string
  onNavigate: () => void
}) {
  const ar = lang !== 'en'
  const d = todayHomeStrings[lang]
  const n = (value: number) => formatNumber(value, lang)
  /**
   * حدّ التوطين (القرار المعتمد C): النموذج يخزّن ويؤلّف بأرقام لاتينية، والتحويل
   * يقع **عند العرض**. بلا هذا كان البطل يعرض «باقي 35g» بأرقام لاتينية في جلسة
   * عربية بينما الحلقة فوقه تعرض «٣٥» — نفس الحقيقة بنظامين، وهو عين BUG-019.
   */
  const loc = (text: string) => formatNumeralsIn(text, lang)
  const chevron = ar ? 'ChevronLeft' : 'ChevronRight'
  // المقاييس تُعرض لتمرين حقيقي وحده — بطل «سجّل وجبتك» لا يحمل عدد تمارين.
  const showMeta = hero.destination === 'workout' && training.available && training.exerciseCount > 0
  const showProgress = showMeta && training.percent > 0 && training.totalSets > 0
  const filled = showProgress ? Math.max(1, Math.round((training.percent / 100) * training.exerciseCount)) : 0
  /**
   * صفّ المقاييس **يحلّ محلّ** الوصف حين يعرض نفس الأرقام: `hero.subtitle` للتمرين
   * هو «٦ تمارين · ٤٥ دقيقة · جاهز لك» حرفيًّا، وعرضه فوق صفٍّ يقول الشيء نفسه
   * تكرارٌ صريح. ويبقى اسم اليوم حين لا يحمله العنوان أصلًا (بطل القادم الجديد
   * عنوانه «ابدأ تمرينك الأول» فالاسم معلومة مفقودة لولا هذا السطر).
   */
  const subtitle = !showMeta
    ? hero.subtitle
    : training.name && !hero.title.includes(training.name)
      ? training.name
      : null
  // لمحة القسم ولمحة البطاقة تتطابقان في اليوم العادي — تُعرض مرّة واحدة.
  const eyebrow = eyebrowOverride ?? d.nextStepEyebrow
  const innerEyebrow = hero.eyebrow === eyebrow ? null : hero.eyebrow

  return (
    <section aria-labelledby="today-next-title">
      <p className="mb-2 flex items-center gap-2 text-sm font-black text-[color:var(--v2-ember-text)]">
        <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
        {eyebrow}
      </p>

      <div className="overflow-hidden rounded-3xl border border-line bg-surface p-4 shadow-card">
        {(innerEyebrow || restDay) && (
          <div className="mb-1.5 flex items-start justify-between gap-3">
            <p className={`min-w-0 flex-1 text-sm font-bold ${hero.eyebrowDone ? 'text-[color:var(--v2-green-text)]' : 'text-ink-500'}`}>
              {hero.eyebrowDone && <Icon name="Check" className="me-1 inline-block h-4 w-4 align-[-0.2em]" strokeWidth={3} />}
              {innerEyebrow && loc(innerEyebrow)}
            </p>
            {restDay && (
              <span className="shrink-0 rounded-full bg-beige px-2.5 py-1 text-[11px] font-black text-[color:var(--v2-teal-text)]">
                {d.restDayChip}
              </span>
            )}
          </div>
        )}

        <h2 id="today-next-title" className="text-2xl font-black leading-tight tracking-tight text-ink-900">
          {loc(hero.title)}
        </h2>
        {subtitle && <p className="mt-1 text-base leading-relaxed text-ink-500">{loc(subtitle)}</p>}

        {showMeta && (
          <dl className="mt-3 flex items-center gap-3 text-sm">
            <Metric label={d.metaExercises} value={n(training.exerciseCount)} />
            <Divider />
            <Metric label={d.metaDuration} value={`${n(durationMin)} ${d.minutesShort}`} />
            {training.setCount > 0 && (
              <>
                <Divider />
                <Metric label={d.metaSets} value={n(training.setCount)} />
              </>
            )}
          </dl>
        )}

        {showProgress && (
          <>
            <p className="mt-3 text-sm font-bold text-ink-500">
              {d.partialProgress(n(training.completedSets), n(training.totalSets))}
            </p>
            <div
              aria-hidden="true"
              className="mt-1.5 flex gap-1"
            >
              {Array.from({ length: training.exerciseCount }, (_, i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${i < filled ? 'bg-primary' : 'bg-line'}`}
                />
              ))}
            </div>
          </>
        )}

        {hero.destination && (
          <button
            type="button"
            onClick={() => { void playHaptic('selection'); onNavigate() }}
            /* `text-[19px]` لا `text-lg` (١٨بك): لون الزرّ العلامي على الأبيض
               يعطي ٣٫٥٣:١ — تحت ٤٫٥:١ للنصّ العادي وفوق ٣:١ للنصّ الكبير. وحدّ
               «الكبير» في WCAG للخطّ العريض ١٨٫٦٦بك، فـ١٨ تقع تحته بشعرة. رفعُها
               إلى ١٩ يجعل الزرّ مطابقًا لـAA بدل أن يكون قريبًا منه. */
            className={`v2-pressable mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-4 text-[19px] font-black text-white ${
              hero.ctaTone === 'green' ? 'bg-[color:var(--v2-green)]' : 'bg-primary'
            }`}
          >
            {loc(hero.ctaLabel)}
            <Icon name={chevron} className="h-5 w-5" strokeWidth={2.75} />
          </button>
        )}
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline gap-1.5">
      <dt className="text-[11px] font-bold text-ink-400">{label}</dt>
      <dd className="whitespace-nowrap text-sm font-black text-ink-900 tabular-nums">{value}</dd>
    </div>
  )
}

function Divider() {
  return <span aria-hidden="true" className="h-3.5 w-px shrink-0 bg-line" />
}
