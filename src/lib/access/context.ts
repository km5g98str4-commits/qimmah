// عقد سياق الوصول — النوع والسياق وحدهما.
// [QIM-WEB-FOUNDER-UX-003] الحزمة ٢.
//
// مفصول عن المزوّد والهوك عمدًا: قاعدة `react-refresh/only-export-components`
// في هذا المستودع تمنع ملفًا واحدًا من تصدير مكوّن ودالة معًا (والبوابة
// `--max-warnings 0`). فالسياق هنا، والمكوّن في `provider.tsx`، والهوك في
// `useAccess.ts`.

import { createContext } from 'react'
import type { EntitlementSnapshot } from './entitlementStore'
import type { PaidAction } from './paidActions'
import type { RedeemOutcome } from './entitlementSource'

export interface AccessContextValue {
  entitlement: EntitlementSnapshot
  /** هل يُسمح بهذا الفعل الآن؟ */
  can: (action: PaidAction) => boolean
  /**
   * يلفّ معالجًا: يُنفَّذ إن سُمح، وإلا تُفتح البوّابة **ولا يُنفَّذ شيء**.
   *
   * عامّ في وسائطه عمدًا: معالجات مثل `startDay(day)` تحمل وسيطًا، ولو كان
   * التوقيع بلا وسائط لاضطرّ كل مستدعٍ إلى لفّة يدوية — وكل لفّة يدوية فرصة
   * نسيان، وهو بالضبط ما يمنعه وجود حارس واحد.
   */
  guard: <A extends unknown[]>(action: PaidAction, run: (...args: A) => void) => (...args: A) => void
  /** الفعل الذي فتح البوّابة حاليًا (null = مغلقة). */
  blockedAction: PaidAction | null
  closeGate: () => void
  redeem: (code: string) => Promise<RedeemOutcome>
  refresh: () => Promise<void>
}

export const AccessContext = createContext<AccessContextValue | null>(null)

/**
 * قيمة الغياب — **مغلقة بالكامل**. شجرة بلا مزوّد خطأ برمجي، وأسوأ ما يمكن أن
 * تفعله عندها هو فتح الأفعال المدفوعة. فالفشل هنا آمن لا متساهل.
 */
export const CLOSED_ACCESS: AccessContextValue = {
  entitlement: { status: 'loading', source: 'none' },
  can: () => false,
  guard: () => () => {},
  blockedAction: null,
  closeGate: () => {},
  redeem: async () => 'offline',
  refresh: async () => {},
}
