import type { CSSProperties } from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import { stateVariantMeta, type StateVariant, type StateAction } from './stateBlockMeta'

// Unified system-state surface — Qimmah Design Standard v3.0, System states
// (screens 73–80) + the smart-empty recipe (screen 21/76). ONE reusable block:
// every state is an icon + a title + a "why" body + a real action. Meaning is
// carried by icon + text, never colour alone (accessibility / non-colour rule).
// The pure variant→presentation map lives in ./stateBlockMeta (also unit-tested).

export type { StateVariant, StateAction }

interface StateBlockProps {
  variant: StateVariant
  title: string
  body?: string
  /** Override the variant's default icon when a more specific one fits. */
  icon?: string
  actions?: StateAction[]
  /** Slim inline banner (used for the persistent offline strip) vs. full block. */
  compact?: boolean
  className?: string
  testId?: string
}

/**
 * Reusable state surface. `compact` renders the slim banner form (offline strip,
 * screen 75, E3 nav spec); the default renders the full empty/error/denied block
 * (screens 21/74/76/77/78). Reduced-motion safe: the only animation is the
 * loading spinner, which collapses under `motion-reduce`.
 */
export function StateBlock({ variant, title, body, icon, actions, compact, className, testId }: StateBlockProps) {
  const meta = stateVariantMeta(variant)
  const iconName = icon ?? meta.icon
  const iconEl = (
    <Icon
      name={iconName}
      className={cn(meta.spin && 'animate-spin motion-reduce:animate-none')}
      style={{ color: meta.color } as CSSProperties}
    />
  )

  if (compact) {
    return (
      <div
        data-testid={testId}
        role={meta.role}
        aria-live={meta.role === 'alert' ? 'assertive' : 'polite'}
        className={cn('flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-start', className)}
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center">{iconEl}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-ink-900">{title}</span>
          {body && <span className="block text-xs text-ink-500">{body}</span>}
        </span>
        {actions?.[0] && (
          <button type="button" onClick={actions[0].onClick} className="shrink-0 text-xs font-black text-primary-c underline underline-offset-2">
            {actions[0].label}
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      data-testid={testId}
      role={meta.role}
      aria-live={meta.role === 'alert' ? 'assertive' : 'polite'}
      className={cn(
        'flex animate-fade-in flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-10 text-center motion-reduce:animate-none',
        className,
      )}
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-beige">
        <span className="grid h-7 w-7 place-items-center">{iconEl}</span>
      </span>
      <p className="max-w-xs text-base font-black leading-relaxed text-ink-900">{title}</p>
      {body && <p className="max-w-sm text-sm leading-relaxed text-ink-500">{body}</p>}
      {actions && actions.length > 0 && (
        <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
          {actions.map((a, i) => (
            <button
              key={a.label}
              type="button"
              onClick={a.onClick}
              className={cn(
                'press w-full rounded-xl py-2.5 text-sm font-bold',
                (a.primary ?? i === 0) ? 'btn-primary' : 'border border-line bg-surface text-ink-700',
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
