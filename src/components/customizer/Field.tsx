import type { ReactNode } from 'react'

interface FieldProps {
  label: string
  hint?: string
  children: ReactNode
}

/** حقل نموذج موحّد: تسمية + عنصر إدخال + تلميح اختياري. */
export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold text-ink-700">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-ink-400">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'w-full rounded-lg border border-line bg-beige px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 transition-colors focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/30'
