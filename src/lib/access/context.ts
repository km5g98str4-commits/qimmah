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
import type { TrialOutcome } from './entitlementBackend'
import type { TrialIntentOrigin } from './trialIntent'
import type { WriteResult } from '@/lib/safeStorage'

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
  /** يبدأ تجربة ٧٢ ساعة عبر الخادم. الغياب ⇒ رفضٌ مسمّى لا نجاح متفائل. */
  beginTrial: () => Promise<TrialOutcome>

  /**
   * ═══ [SOVEREIGN-COMMERCE-001] عقد نيّة التجربة (العقد ٤ في `RUN2-LANES.md`) ═══
   *
   * حارة الإعداد **تسجّل** النيّة قبل أن تُرسل الضيف إلى إنشاء الحساب، وطبقة
   * الوصول **تستأنفها** بعد المصادقة. بلا هذا العقد يبقى النداء ميتًا بنيويًا:
   * مضيفه الوحيد شاشة عابرة، والانتقال إلى الحساب يفكّكها فيتلف المزلاج، ولا
   * يبقى للتجربة مدخل في التطبيق كلّه.
   */

  /**
   * يسجّل نيّة تجربة تعبر رحلة المصادقة (تنتهي خلال ٢٤ ساعة).
   *
   * **يعيد `WriteResult` ولا يبتلعه** (الميثاق §5): فشلُ الحفظ يعني أن
   * الاستئناف لن يقع، والصادق أن يُقال ذلك بدل الوعد به. لا تعرض «بنكمّل لك
   * بعد التسجيل» إلا على `'ok'`.
   */
  recordTrialIntent: (origin: TrialIntentOrigin) => WriteResult
  /** هل توجد نيّة حيّة الآن؟ (للأسطح التي تريد إظهار «تجربتك بانتظارك».) */
  hasTrialIntent: () => boolean
  /** يُلغي النيّة — لمن عدل عن التجربة صراحةً. */
  clearTrialIntent: () => void
  /**
   * نتيجة آخر استئناف تلقائي بعد المصادقة — `null` إن لم يقع استئناف.
   *
   * **يفشل مغلقًا:** ما لم تكن `'started'` فالتجربة **لم تبدأ**، وتُعرض رسالتها
   * الصادقة عبر `trialMessage()`. ولا تُعرض التجربة مبدوءةً بناءً على أي شيء
   * سوى `'started'` القادمة من `start_trial`.
   */
  trialResume: TrialOutcome | null
  /** يُقرّ باطّلاع المستخدم على نتيجة الاستئناف فتُخفى. */
  acknowledgeTrialResume: () => void
  /**
   * [COMMISSIONING §2] يُعلِم الطبقة أن المستخدم غادر إلى صفحة الشراء.
   * عند عودة التبويب مرئيًّا تُطالَب المنح المعلّقة ويُعاد الحسم **مرّة واحدة**،
   * فلا يرى من دفع «مجّاني» حتى يحدّث الصفحة بنفسه.
   */
  notePurchaseAttempt: () => void
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
  redeem: async () => 'service_error',
  refresh: async () => {},
  beginTrial: async () => 'service_error',
  // شجرةٌ بلا مزوّد لا تسجّل نيّة ولا تدّعي أنها سجّلتها.
  recordTrialIntent: () => 'unavailable',
  hasTrialIntent: () => false,
  clearTrialIntent: () => {},
  trialResume: null,
  acknowledgeTrialResume: () => {},
  notePurchaseAttempt: () => {},
}
