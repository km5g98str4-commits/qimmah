import { useEffect, useState } from 'react'

/**
 * حلقة تقدّم SVG — بلا مكتبات، وبعقد دلالي واحد لكل استعمالاتها.
 *
 * ═══ الدلالة ═══
 * **القوس يمثّل المستهلَك من الهدف**، والمحتوى في المنتصف يمثّل **المتبقّي**.
 * الاتجاهان مختلفان عمدًا لأنهما سؤالان مختلفان: «كم قطعت؟» يُقرأ بالنظر إلى
 * القوس، و«كم بقي؟» هو الرقم الذي يُتصرَّف به. وسطر شارح في البطاقة يقول ذلك
 * صراحةً — دلالةٌ تُخمَّن ليست دلالة.
 *
 * ═══ الاتجاه في RTL ═══
 * الحلقة تبدأ من أعلى وتدور مع عقارب الساعة **في اللغتين**. لا تُعكس في العربية:
 * الزمن والامتلاء لهما اتجاه فيزيائي واحد (الساعة، عدّاد الوقود)، وعكسهما لغويًّا
 * يخلق قراءتين لنفس الشكل. المعكوس هو **ترتيب العناصر** لا دوران القوس.
 *
 * ═══ الحركة ═══
 * رسمة واحدة عند الظهور من الفارغ إلى القيمة، عبر `v2-fill` الذي يحمل انتقال
 * `stroke-dashoffset` ويُعطَّل تلقائيًا تحت `prefers-reduced-motion` (tokens.css).
 * لا حركة دائمة ولا تحميل وهمي.
 *
 * ═══ الوصولية ═══
 * `aria-hidden` مقصود: الحلقة **زينة فوق نصّ**. الأرقام والتسميات موجودة كنصّ
 * مرئي في البطاقة، والوصف الكامل يُقدَّم في سطر `sr-only` هناك. فلا يُنطق الرقم
 * مرّتين، ولا تُنقل معلومة باللون وحده.
 */
export function ProgressRing({
  /** نسبة المستهلَك 0..1 — يقصّها المكوّن، فلا يحتاج المستدعي أن يتذكّر ذلك. */
  value,
  size,
  stroke,
  color,
  children,
}: {
  value: number
  size: number
  stroke: number
  color: string
  children?: React.ReactNode
}) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const [drawn, setDrawn] = useState(false)

  useEffect(() => {
    // إطار واحد قبل القيمة النهائية يضمن أن المتصفّح رسم الحالة الفارغة أولًا،
    // وإلا قفزت الحلقة بلا انتقال. وتحت «تقليل الحركة» المدّة ≈٠ فالقفزة هي المطلوب.
    if (typeof requestAnimationFrame !== 'function') {
      setDrawn(true)
      return
    }
    const id = requestAnimationFrame(() => setDrawn(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="-rotate-90"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-line" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={drawn ? c * (1 - pct) : c}
          className="v2-fill"
        />
      </svg>
      {children != null && (
        <span className="absolute inset-0 grid place-items-center text-center leading-none">{children}</span>
      )}
    </span>
  )
}
