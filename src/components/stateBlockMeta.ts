// Pure presentation map for StateBlock — kept in its own module so the shared
// component file only exports a component (fast-refresh) and so the mapping is
// unit-tested without a DOM. Colour is a token role; the icon+text pair is what
// communicates the state, so colour is never the sole signal.

export type StateVariant = 'empty' | 'offline' | 'error' | 'loading' | 'denied' | 'unavailable'

export interface StateAction {
  label: string
  onClick: () => void
  /** First action defaults to primary; pass false for a secondary/ghost button. */
  primary?: boolean
}

export function stateVariantMeta(variant: StateVariant): { icon: string; color: string; role: 'status' | 'alert'; spin: boolean } {
  switch (variant) {
    case 'offline': return { icon: 'CircleSlash', color: 'var(--color-warning)', role: 'status', spin: false }
    case 'error': return { icon: 'AlertTriangle', color: 'var(--color-danger)', role: 'alert', spin: false }
    case 'loading': return { icon: 'RefreshCw', color: 'var(--color-info)', role: 'status', spin: true }
    case 'denied': return { icon: 'Lock', color: 'var(--color-warning)', role: 'status', spin: false }
    case 'unavailable': return { icon: 'HelpCircle', color: 'var(--color-ink-500)', role: 'status', spin: false }
    case 'empty':
    default: return { icon: 'Sparkles', color: 'var(--color-primary)', role: 'status', spin: false }
  }
}
