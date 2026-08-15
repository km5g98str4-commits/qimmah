// هوك الوصول — القراءة الوحيدة التي تستهلكها الواجهة.
// [QIM-WEB-FOUNDER-UX-003] الحزمة ٢.

import { useContext } from 'react'
import { AccessContext, CLOSED_ACCESS, type AccessContextValue } from './context'

/** غياب المزوّد يعيد قيمة **مغلقة** لا متساهلة — انظر `CLOSED_ACCESS`. */
export function useAccess(): AccessContextValue {
  return useContext(AccessContext) ?? CLOSED_ACCESS
}
