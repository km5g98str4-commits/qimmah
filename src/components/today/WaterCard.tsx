import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { todayHomeStrings } from '@/i18n/dict/todayHome'
import { waterGuardStrings } from '@/i18n/dict/waterGuard'
import type { Lang } from '@/lib/appPreferences'
import { formatNumber } from '@/lib/numberFormat'
import { playHaptic } from '@/lib/nativeFeedback'
import type { AddWaterFn, WaterAddOutcome } from '@/lib/nutritionTracking'
import type { WaterTier } from '@/lib/nutritionV2Model'

/** حجم الكوب المعتمد في الواجهة — نفس الجرعة الصغرى في لوحة ماء التغذية. */
export const CUP_ML = 250

/**
 * بطاقة الماء — كوب واحد بضغطة، على السطح الذي يفتحه المستخدم أصلًا.
 *
 * ═══ منطق الترطيب لم يُفرَّع ═══
 * البطاقة لا تعرف مخزنًا ولا مفتاحًا: تستقبل `consumedMl` و`onAdd` من
 * `useNutritionToday()` — **نفس** الهوك الذي تستعمله شاشة التغذية الحيّة، بنفس
 * الكاتب الواحد وبنفس حارس الاشتراك المدفوع. فلا متجر ماء ثانٍ، ولا رقم يختلف
 * بين شاشتين. والتراجع كذلك: كوب سالب عبر **نفس** `onAdd` لا مسار ثانٍ.
 *
 * ═══ الفشل لا يُبتلع (§5) ═══
 * `onAdd` يعيد نتيجة **مسمّاة**: نجاح · تعذّر حفظ · أو كتابة موقوفة تنتظر تأكيدًا.
 * الثلاثة تُعرض كما هي ولا يتحرّك المؤشّر إلا مع كتابة وقعت فعلًا. البديل —
 * تحديث متفائل ثم صمت — هو بالضبط ما يمنعه الميثاق.
 *
 * ═══ الرقم المعروض (طلب المؤسس ١) ═══
 * سطر اللترات يقول الثلاثة صراحةً: **المستهلك / الهدف · والباقي**. الأكواب تبقى
 * فوقها لأنها لغة الضغطة، واللترات لغة الهدف.
 *
 * ═══ ٣٢٠ بكسل ═══
 * المرجع يرسم ثمانية أعمدة ثابتة. هنا العدد مشتقّ من الهدف الحقيقي (قد يكون ١٠
 * أو ١٦ كوبًا)، والأعمدة `flex-1` فتتقاسم العرض المتاح مهما كان عددها — ولذلك
 * لا تنكسر عند ٣٢٠ ولا تتمدّد بشكل سخيف عند ٤٣٠.
 */
export function WaterCard({
  lang,
  consumedMl,
  targetMl,
  onAdd,
}: {
  lang: Lang
  consumedMl: number
  targetMl: number
  /** نتيجة مسمّاة — لا `boolean` يبتلع الفرق بين تعذّر الحفظ وطلب التأكيد. */
  onAdd: AddWaterFn
}) {
  const d = todayHomeStrings[lang]
  const w = waterGuardStrings[lang]
  const [failed, setFailed] = useState(false)
  const [pending, setPending] = useState<{ tier: Exclude<WaterTier, 'normal'>; projectedMl: number } | null>(null)
  const n = (value: number) => formatNumber(value, lang)
  /** لترات بخانة عشرية واحدة — عبر `formatNumber` فتصير «٢٫١» في العربية. */
  const liters = (ml: number) =>
    formatNumber(Math.max(0, ml) / 1000, lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  const hasTarget = targetMl > 0
  const cups = hasTarget ? Math.max(1, Math.min(16, Math.round(targetMl / CUP_ML))) : 0
  const filled = hasTarget ? Math.min(cups, Math.floor(consumedMl / CUP_ML)) : 0
  const done = hasTarget && consumedMl >= targetMl
  // نفس حساب «الباقي» الذي يستعمله نموذج التغذية — بلا نسخة ثانية هنا.
  const remainingMl = hasTarget ? Math.max(0, Math.round(targetMl) - Math.round(Math.max(0, consumedMl))) : 0

  const settle = (outcome: WaterAddOutcome) => {
    if (outcome.ok) {
      setFailed(false)
      setPending(null)
      return
    }
    if (outcome.reason === 'confirm') {
      setFailed(false)
      setPending({ tier: outcome.tier, projectedMl: outcome.projectedMl })
      return
    }
    setPending(null)
    setFailed(true)
  }

  const add = (acknowledgedTier?: WaterTier) => {
    void playHaptic('selection')
    settle(onAdd(CUP_ML, { targetMl, acknowledgedTier }))
  }

  /** تراجع عن آخر كوب — كوب سالب عبر الكاتب نفسه؛ السالب لا يُبوَّب ولا ينزل تحت الصفر. */
  const undo = () => {
    void playHaptic('selection')
    settle(onAdd(-CUP_ML))
  }

  return (
    <section className="rounded-2xl border border-line bg-surface px-3.5 py-3 shadow-card">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-base font-black text-ink-900">
            <Icon name="Droplets" className="h-4 w-4 shrink-0 text-[color:var(--v2-pillar-move)]" />
            {d.waterTitle}
          </span>
          {/* بلا هدف: يُقال المسجَّل فعلًا لا «كمّل إعدادك» وحدها. كان الزرّ «+»
              يكتب كوبًا حقيقيًّا ولا يتغيّر شيء على الشاشة (لا عدّاد ولا أعمدة)،
              فتصير الضغطة بلا أثر مرئي — وهو أوضح أشكال «ضغطت وما صار شي». */}
          <span className="mt-0.5 block text-sm text-ink-500">
            {hasTarget ? (
              <span aria-hidden="true">{d.waterCups(n(filled), n(cups))}</span>
            ) : consumedMl > 0 ? (
              d.waterLoggedOnly(n(consumedMl))
            ) : (
              d.waterNoTarget
            )}
          </span>
          {/* طلب المؤسس ١ — مستهلك / هدف · باقي، باللتر، في سطر واحد مضغوط. */}
          {hasTarget && (
            <span data-testid="water-liters" className="mt-0.5 block text-sm font-bold text-ink-700">
              <span aria-hidden="true">{w.litersOfTarget(liters(consumedMl), liters(targetMl))}</span>
              <span aria-hidden="true" className="text-ink-500">
                {' · '}
                {remainingMl > 0 ? w.litersRemaining(liters(remainingMl)) : w.litersTargetMet}
              </span>
            </span>
          )}
          {hasTarget && (
            <span className="sr-only">
              {d.waterAria(n(filled), n(cups))} · {w.litersOfTarget(liters(consumedMl), liters(targetMl))} ·{' '}
              {remainingMl > 0 ? w.litersRemaining(liters(remainingMl)) : w.litersTargetMet}
            </span>
          )}
        </span>

        <button
          type="button"
          onClick={() => add()}
          aria-label={d.waterAdd}
          data-testid="water-add"
          className="v2-pressable grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-[color:var(--c-primary)]"
        >
          <Icon name="Plus" className="h-5 w-5" strokeWidth={3} />
        </button>
      </div>

      {hasTarget && (
        <div aria-hidden="true" className="mt-2.5 flex items-center gap-1">
          {Array.from({ length: cups }, (_, i) => (
            <span
              key={i}
              className={`h-2.5 flex-1 rounded-full ${i < filled ? 'bg-[color:var(--v2-pillar-move)]' : 'bg-line'}`}
            />
          ))}
        </div>
      )}

      {done && !pending && (
        <p className="mt-2 flex items-center gap-1 text-sm font-bold text-[color:var(--v2-green-text)]">
          <Icon name="Check" className="h-4 w-4" strokeWidth={3} />
          {d.waterDone}
        </p>
      )}

      {/* مسار التراجع (طلب المؤسس ٤) — يظهر فقط حين يوجد كوب فعلًا يُتراجَع عنه. */}
      {consumedMl >= CUP_ML && !pending && (
        <button
          type="button"
          onClick={undo}
          data-testid="water-undo-cup"
          className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold text-ink-500 underline-offset-4 hover:underline"
        >
          <Icon name="RotateCcw" className="h-4 w-4" />
          {w.undoCup}
        </button>
      )}

      {/* تأكيد الكمية غير المعتادة — ملاحظة لا إنذار، والكتابة لم تقع بعد. */}
      {pending && (
        <div
          data-testid="water-confirm"
          role="group"
          aria-live="polite"
          className="mt-2 rounded-xl border border-line bg-page px-3 py-2.5"
        >
          <p className="text-sm font-black text-ink-900">
            {pending.tier === 'extreme' ? w.confirmExtremeTitle : w.confirmElevatedTitle}
          </p>
          <p className="mt-1 text-sm text-ink-700">
            {pending.tier === 'extreme'
              ? w.confirmExtremeBody(liters(pending.projectedMl))
              : w.confirmElevatedBody(liters(pending.projectedMl), liters(targetMl))}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="water-confirm-yes"
              onClick={() => add(pending.tier)}
              className="min-h-[44px] rounded-xl bg-primary-soft px-3 text-sm font-black text-[color:var(--c-primary)]"
            >
              {pending.tier === 'extreme' ? w.confirmExtremeYes : w.confirmYes}
            </button>
            <button
              type="button"
              data-testid="water-confirm-no"
              onClick={() => setPending(null)}
              className="min-h-[44px] rounded-xl px-3 text-sm font-bold text-ink-500"
            >
              {w.confirmNo}
            </button>
          </div>
        </div>
      )}

      {failed && (
        <p role="status" className="mt-2 text-sm font-bold text-[color:var(--v2-feedback-error)]">
          {d.waterSaveError}
        </p>
      )}
    </section>
  )
}
