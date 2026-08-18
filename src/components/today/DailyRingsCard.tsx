import { Icon } from '@/components/Icon'
import { ProgressRing } from '@/components/today/ProgressRing'
import { todayHomeStrings } from '@/i18n/dict/todayHome'
import type { Lang } from '@/lib/appPreferences'
import { formatNumber } from '@/lib/numberFormat'
import { playHaptic } from '@/lib/nativeFeedback'

/**
 * «باقي لك اليوم» — حلقة سعرات مهيمنة وثلاث حلقات ماكرو.
 *
 * ═══ المشكلة التي حُلّت لا التي أُعيدت ═══
 * [CTO-73] حذف بطاقات الحلقات بسبب **مقيس**: كانت تحجز ثلث الطية لتقول أربعة
 * أرقام. وقرار المؤسس الآن يعيد الحلقات — فالواجب حلّ المشكلة لا استنساخها.
 *
 * ما تغيّر عن التصميم المحذوف وعن المرجع البصري:
 *   • **الحلقة الكبيرة تشارك صفَّها.** المرجع يوسّطها فيضيع عرض الشاشة كلّه ثم
 *     يُنفَق ارتفاعٌ إضافي على العنوان والسطر الثانوي. هنا: الحلقة في أول الصفّ
 *     والعنوان والنسبة بجانبها — نفس المعلومة، بارتفاع صفٍّ واحد بدل ثلاثة.
 *   • **الحلقات الصغيرة صفٌّ واحد** بثلاثة أعمدة متساوية لا ثلاث بطاقات.
 *   • القياسات ثابتة (٨٤/٤٠) لا متجاوبة: مقاس واحد يعمل من ٣٢٠ إلى ٤٣٠،
 *     ونقطة كسر Tailwind الأولى (٦٤٠) خارج نطاق الهواتف أصلًا.
 * المحصّلة ≈١٩٠ بكسل مقابل ≈٣٧٠ في المرجع — النصف تقريبًا، والفكرة كاملة.
 *
 * ═══ اللون لا يحمل معلومة وحده (§9) ═══
 * الأرقام كلّها بلون النصّ الأساسي (تباين AA في السمتين)، والقوس وحده ملوّن.
 * فمن لا يميّز الألوان يقرأ نفس الأرقام كاملةً، ولون الدهون البنفسجي لا يزاحم
 * دلالة الفيروزي (التعافي) — وهو سبب اختلافه عن المرجع الذي يجعلهما لونًا واحدًا.
 */

/** ألوان الأقواس — سعرات أزرق · بروتين أخضر · كارب كهرماني · دهون بنفسجي. */
const TONE = {
  calories: 'var(--v2-pillar-move)',
  protein: 'var(--v2-green-text)',
  carbs: '#e0941f',
  fat: '#8b8fd6',
} as const

export interface MacroSlice {
  consumed: number
  target: number
}

interface DailyRingsCardProps {
  lang: Lang
  calories: MacroSlice
  protein: MacroSlice
  carbs: MacroSlice
  fat: MacroSlice
  onOpen: () => void
}

/** المتبقّي المعروض — مقصوص عند الصفر: «‏-٣٠٠ متبقّي» ليست عبارة صحيحة. */
const remainingOf = (s: MacroSlice) => Math.max(0, Math.round(s.target - s.consumed))
const ratioOf = (s: MacroSlice) => (s.target > 0 ? s.consumed / s.target : 0)

export function DailyRingsCard({ lang, calories, protein, carbs, fat, onOpen }: DailyRingsCardProps) {
  const ar = lang !== 'en'
  const d = todayHomeStrings[lang]
  const hasCalTarget = calories.target > 0
  const n = (value: number) => formatNumber(value, lang)

  const macros: { key: 'protein' | 'carbs' | 'fat'; label: string; slice: MacroSlice; color: string }[] = [
    { key: 'protein', label: d.macroProtein, slice: protein, color: TONE.protein },
    { key: 'carbs', label: d.macroCarbs, slice: carbs, color: TONE.carbs },
    { key: 'fat', label: d.macroFat, slice: fat, color: TONE.fat },
  ]

  return (
    <section
      aria-labelledby="today-rings-title"
      className="rounded-3xl border border-line bg-surface p-3.5 shadow-card"
    >
      <button
        type="button"
        onClick={() => { void playHaptic('selection'); onOpen() }}
        aria-label={`${d.remainingTitle} — ${d.openNutrition}`}
        className="v2-pressable tap-target flex w-full items-center gap-3.5 text-start"
      >
        <ProgressRing value={ratioOf(calories)} size={84} stroke={8} color={TONE.calories}>
          <span className="flex flex-col items-center gap-0.5">
            <span aria-hidden="true" className="text-[26px] font-black leading-none tracking-tight text-ink-900 tabular-nums">
              {hasCalTarget ? n(remainingOf(calories)) : '—'}
            </span>
            <span aria-hidden="true" className="text-[10px] font-bold leading-none text-ink-500">
              {d.caloriesUnit}
            </span>
          </span>
        </ProgressRing>

        <span className="min-w-0 flex-1">
          <span id="today-rings-title" className="flex items-center gap-1 text-base font-black text-ink-900">
            {d.remainingTitle}
            <Icon name={ar ? 'ChevronLeft' : 'ChevronRight'} className="h-4 w-4 shrink-0 text-ink-400" />
          </span>
          <span dir="ltr" className={`mt-1 block text-sm font-bold tabular-nums text-ink-500 ${ar ? 'text-end' : 'text-start'}`}>
            {hasCalTarget ? d.ofTarget(n(Math.round(calories.consumed)), n(calories.target)) : '—'}
          </span>
          <span className="mt-1.5 block text-[11px] leading-snug text-ink-400">{d.ringLegend}</span>
        </span>
      </button>

      <ul className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
        {macros.map((m) => {
          const has = m.slice.target > 0
          const remaining = remainingOf(m.slice)
          return (
            <li key={m.key} className="flex flex-col items-center gap-1">
              {/* الوصف الكامل مرّة واحدة لقارئ الشاشة؛ والمرئي مخفيّ عنه فلا يتكرّر. */}
              <span className="sr-only">
                {has
                  ? d.ringAria(m.label, `${n(remaining)}${d.gramsShort}`, `${n(Math.round(m.slice.consumed))}${d.gramsShort}`, `${n(m.slice.target)}${d.gramsShort}`)
                  : `${m.label} — ${d.waterNoTarget}`}
              </span>
              <span aria-hidden="true" className="contents">
                <ProgressRing value={ratioOf(m.slice)} size={40} stroke={5} color={m.color}>
                  <span className="text-[13px] font-black leading-none text-ink-900 tabular-nums">
                    {has ? n(remaining) : '—'}
                  </span>
                </ProgressRing>
                <span className="text-[11px] font-bold leading-none text-ink-700">{m.label}</span>
                <span dir="ltr" className="whitespace-nowrap text-[11px] leading-none text-ink-400 tabular-nums">
                  {has ? `${n(Math.round(m.slice.consumed))} / ${n(m.slice.target)} ${d.gramsShort}` : '—'}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
