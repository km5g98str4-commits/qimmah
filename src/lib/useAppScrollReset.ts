import { useLayoutEffect } from 'react'

/**
 * Internal screens share the shell scroller. Reset it when a screen in the same
 * tab changes, while the shell itself continues preserving offsets per tab.
 */
export function useAppScrollReset(key: string): void {
  useLayoutEffect(() => {
    document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'auto' })
  }, [key])
}
