interface CanonicalMarkProps {
  className?: string
  decorative?: boolean
}

/** Canonical Qimmah ascent mark — exact 1024-grid geometry from MARK-SPEC.md. */
export function CanonicalMark({ className, decorative = true }: CanonicalMarkProps) {
  return (
    <svg className={className} viewBox="0 0 1024 1024" fill="none" aria-hidden={decorative || undefined} role={decorative ? undefined : 'img'}>
      <path d="M302 640 L512 340 L722 640" stroke="currentColor" strokeWidth="96" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="302" cy="640" r="96" fill="currentColor" />
      <circle cx="722" cy="640" r="96" fill="currentColor" />
    </svg>
  )
}
