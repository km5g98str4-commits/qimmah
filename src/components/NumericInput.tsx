import { useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { formatNumber } from '@/lib/numberFormat'
import { parseNumericField, sanitizeNumericInput } from '@/lib/validation'
import { numericInputStrings } from '@/i18n/dict/numericInput'

/**
 * حقل رقمي صادق — **`type="text"` لا `type="number"`**.
 *
 * ═══ لماذا النوع نصّي ═══
 * خوارزمية تعقيم القيمة في HTML لـ`type="number"` تُفرِّغ القيمة كلّما لم تكن
 * «عددًا عشريًا صالحًا»، وذلك النحو يقبل `0-9` وحدها. فالمحارف العربية **لا
 * تصل مُعالج React أصلًا**، ولا ينفع معها أي طيّ داخل التطبيق. النوع النصّي
 * مع `inputMode` يُبقي لوحة المفاتيح الرقمية على الجوال ويُوصِل ما يُكتب.
 *
 * ═══ ولماذا مسوّدة نصّية ═══
 * الحقول كانت تحوّل كل ضغطة إلى رقم فورًا: مسحُ الخانة يعطي `0` فتقفز إلى
 * الحدّ الأدنى، ورقمٌ خارج النطاق يُقصّ بصمت. هنا تبقى **مسوّدة المستخدم كما
 * كتبها**، ولا يُرفع للأعلى إلا رقم صالح، وما عداه يُقال صراحةً.
 */
export interface NumericInputProps {
  /** القيمة المخزَّنة (غربية قانونية دائمًا). */
  value: number | string
  /** يُنادى **بالقيم الصالحة وحدها** — لا فراغًا ولا خارج النطاق. */
  onChange: (value: number) => void
  lang: Lang
  min?: number
  max?: number
  /** يسمح بفاصلة عشرية ويضبط لوحة مفاتيح الجوال. */
  decimal?: boolean
  id?: string
  className?: string
  placeholder?: string
  step?: string
  ariaLabel?: string
  testId?: string
  disabled?: boolean
  onEnter?: () => void
  /** رسالة إضافية تُعرض حين لا يكون في الحقل خطأ (تلميح المالك). */
  hint?: ReactNode
}

export function NumericInput({
  value,
  onChange,
  lang,
  min,
  max,
  decimal = false,
  id,
  className,
  placeholder,
  step,
  ariaLabel,
  testId,
  disabled,
  onEnter,
  hint,
}: NumericInputProps) {
  const copy = numericInputStrings[lang]
  const autoId = useId()
  const inputId = id ?? autoId
  const msgId = `${inputId}-msg`
  // المسوّدة تُقاد من الخارج ما لم يكن المستخدم يكتب الآن: `lastPushed` يمنع
  // إعادة الضبط بعد كل ضغطة (وإلا لانمسحت النقطة العشرية أثناء كتابتها).
  const [draft, setDraft] = useState<string | null>(null)
  const lastPushed = useRef<number | null>(null)
  const [touched, setTouched] = useState(false)

  const external = String(value)
  const shown = draft ?? external

  const parsed = parseNumericField(shown, { min, max })
  const fmt = (n: number) => formatNumber(n, lang)
  let message: string | null = null
  if (parsed.status === 'unreadable') message = copy.unreadable
  else if (parsed.status === 'empty' && touched) message = copy.empty
  else if (parsed.status === 'out-of-range') {
    if (min !== undefined && max !== undefined) message = copy.outOfRange(fmt(min), fmt(max))
    else if (min !== undefined && parsed.value < min) message = copy.belowMin(fmt(min))
    else if (max !== undefined) message = copy.aboveMax(fmt(max))
  }

  const handle = (raw: string) => {
    // التعقيم يطوي الأرقام العربية أولًا — فلا تختفي حروف ما يُكتب.
    // ولا يُمرَّر `max` هنا عمدًا: القصّ الصامت هو العطل، والرسالة هي العلاج.
    const next = sanitizeNumericInput(raw, { decimal })
    setDraft(next)
    const p = parseNumericField(next, { min, max })
    if (p.status === 'ok' && p.value !== lastPushed.current) {
      lastPushed.current = p.value
      onChange(p.value)
    }
  }

  return (
    <>
      <input
        id={inputId}
        type="text"
        inputMode={decimal ? 'decimal' : 'numeric'}
        autoComplete="off"
        // `min`/`max`/`step` تبقى وصفًا للمجال (وتقرؤها الإثباتات القائمة)؛
        // التحقّق الفعلي في `parseNumericField` أعلاه لأن النوع نصّي.
        min={min}
        max={max}
        step={step}
        value={shown}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? msgId : undefined}
        data-testid={testId}
        onChange={(e) => handle(e.target.value)}
        onBlur={() => { setTouched(true); setDraft(null) }}
        onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter() }}
        placeholder={placeholder}
        className={className}
      />
      {message ? (
        <p id={msgId} role="alert" className={cn('mt-1 text-[0.7rem] font-bold leading-relaxed text-danger')}>
          {message}
        </p>
      ) : (
        hint
      )}
    </>
  )
}
