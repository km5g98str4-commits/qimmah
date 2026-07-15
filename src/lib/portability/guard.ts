import { getSyncRuntime } from '@/lib/syncQueue'
import { PortabilityError } from './errors'

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
    throw new PortabilityError('لا يمكن نقل البيانات أثناء استعادة كلمة المرور أو بدون حساب.')
  }
  if (runtime.userId !== ownerId || (expectedOwner !== undefined && expectedOwner !== ownerId)) {
    throw new PortabilityError('تغيّر الحساب. أعد فتح معاينة النسخة من الحساب الحالي.')
  }
  return ownerId
}
