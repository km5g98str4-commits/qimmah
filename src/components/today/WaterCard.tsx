import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { todayHomeStrings } from '@/i18n/dict/todayHome'
import type { Lang } from '@/lib/appPreferences'
import { formatNumber } from '@/lib/numberFormat'
import { playHaptic } from '@/lib/nativeFeedback'

/** حجم الكوب المعتمد في الواجهة — نفس الجرعة الصغرى في لوحة ماء التغذية. */
export const CUP_ML = 250

/**
 * بطاقة الماء — كوب واحد بضغطة، على السطح الذي يفتحه المستخدم أصلًا.
 *
 * ═══ منطق الترطيب لم يُفرَّع ═══
 * البطاقة لا تعرف مخزنًا ولا مفتاحًا: تستقبل `consumedMl` و`onAdd` من
 * `useNutritionToday()` — **نفس** الهوك الذي تستعمله شاشة التغذية الحيّة، بنفس
 * الكاتب الواحد (`addWaterToDay`) وبنفس حارس الاشتراك المدفوع. فلا متجر ماء ثانٍ،
 * ولا رقم يختلف بين شاشتين.
 *
 * ═══ الفشل لا يُبتلع (§5) ═══
 * `onAdd` يعيد `false` حين تفشل الكتابة، فتظهر رسالة صادقة **ولا يتحرّك المؤشّر**.
 * البديل — تحديث متفائل ثم صمت — هو بالضبط ما يمنعه الميثاق.
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
  /** يعيد `false` حين تفشل الكتابة — لا نجاح مُدّعى. */
  onAdd: (ml: number) => boolean
}) {
  const d = todayHomeStrings[lang]
  const [failed, setFailed] = useState(false)
  const n = (value: number) => formatNumber(value, lang)

  const hasTarget = targetMl > 0
  const cups = hasTarget ? Math.max(1, Math.min(16, Math.round(targetMl / CUP_ML))) : 0
  const filled = hasTarget ? Math.min(cups, Math.floor(consumedMl / CUP_ML)) : 0
  const done = hasTarget && consumedMl >= targetMl

  const add = () => {
    void playHaptic('selection')
    setFailed(!onAdd(CUP_ML))
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
          {hasTarget && <span className="sr-only">{d.waterAria(n(filled), n(cups))}</span>}
        </span>

        <button
          type="button"
          onClick={add}
          aria-label={d.waterAdd}
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

      {done && (
        <p className="mt-2 flex items-center gap-1 text-sm font-bold text-[color:var(--v2-green-text)]">
          <Icon name="Check" className="h-4 w-4" strokeWidth={3} />
          {d.waterDone}
        </p>
      )}

      {failed && (
        <p role="status" className="mt-2 text-sm font-bold text-[color:var(--v2-feedback-error)]">
          {d.waterSaveError}
        </p>
      )}
    </section>
  )
}
