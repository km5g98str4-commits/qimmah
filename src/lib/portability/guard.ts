import { getSyncRuntime } from '@/lib/syncQueue'
import { portabilityError } from './errors'

/**
 * Data export/import is an authenticated, owner-bound action even though the
 * payload stays local. Re-check this boundary immediately before every read or
 * write so an account switch between preview and confirmation fails closed.
 */
export function requirePortabilityOwner(
  candidate: string | null | undefined,
  expectedOwner?: string,
): string {
  const runtime = getSyncRuntime()
  const ownerId = candidate ?? runtime.userId
  if (!ownerId || runtime.recoveryActive) {
    throw portabilityError('RECOVERY_OR_NO_ACCOUNT')
  }
  if (runtime.userId !== ownerId || (expectedOwner !== undefined && expectedOwner !== ownerId)) {
    throw portabilityError('ACCOUNT_CHANGED')
  }
  return ownerId
}
