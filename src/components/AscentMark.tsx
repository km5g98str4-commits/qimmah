interface AscentMarkProps {
  className?: string
  decorative?: boolean
}

/** علامة الصعود المقفلة في Foundation v2.1. */
export function AscentMark({ className, decorative = false }: AscentMarkProps) {
  return (
    <svg
      viewBox="0 0 96 64"
      fill="none"
      className={className}
      aria-hidden={decorative || undefined}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'علامة قِمّة'}
    >
      <path d="M14 51 48 15l34 36" stroke="currentColor" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
