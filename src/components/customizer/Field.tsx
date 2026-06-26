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
      <span className="text-xs font-bold text-slate-300">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'w-full rounded-lg border border-white/10 bg-ink-900/70 px-3 py-2 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/30'
