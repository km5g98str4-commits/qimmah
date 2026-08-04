import type { ReactNode } from 'react'

interface FieldProps {
  label: string
  hint?: string
  children: ReactNode
}

/** حقل نموذج موحّد: تسمية + عنصر إدخال + تلميح اختياري. */
export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-ink-400">{hint}</span>}
    </label>
  )
}

// text-base (16px) لا text-sm: حجم أصلي يمنع تكبير iOS التلقائي عند التركيز على الجوال.
export const inputClass =
  'input w-full text-base text-ink-900 placeholder:text-ink-400'
