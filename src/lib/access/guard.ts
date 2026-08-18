// نقطة الاختناق الوحيدة لكل فعل مدفوع.
// [QIM-WEB-FOUNDER-UX-003] الحزمة ٢ · مطلب المؤسس §25 «مرّكز التحقّق، ولا عشرين
// `if (!premium)` غير مترابطة».
//
// طبقتان، والثانية هي التي تصمد:
//   ١) `useGuardedAction` في الواجهة — يلفّ المعالج فيفتح بوّابة Premium بدل
//      تنفيذ الفعل. تجربة نظيفة، لكنها **إقناع لا حماية**: من يستدعي المعالج
//      يدويًا أو يصل بمسار آخر يتجاوزها.
//   ٢) `assertPaid` داخل **طبقة المخازن** — الكتابة نفسها ترفض. هذه هي التي
//      تجعل «إخفاء الزرّ» غير كافٍ وغير لازم في آن: حتى لو ظهر الزرّ، وحتى لو
//      نودي المعالج من الـconsole، لا تُكتب حالة مدفوعة.
//
// ولا يُغني هذا عن الخادم: الحارس في العميل **ليس سلطة أمنية** — هو يمنع
// الاستهلاك غير المقصود ويجعل الفشل آمنًا. السلطة النهائية عقد الخادم.

import { getEntitlement } from './entitlementStore'
import { isPaidActionAllowed, isSystemRepairAction, type PaidAction, type WriteIntent } from './paidActions'

/** خطأ مسمّى — يسقط الاختبار بالاسم لا بـ`TypeError` عابر (الميثاق §4.2). */
export class PaidActionDenied extends Error {
  readonly action: PaidAction
  constructor(action: PaidAction) {
    super(`PaidActionDenied: ${action}`)
    this.name = 'PaidActionDenied'
    this.action = action
  }
}

/** هل يُسمح بهذا الفعل الآن؟ يقرأ المخزن العادي، فيعمل داخل React وخارجه. */
export function canPerform(action: PaidAction): boolean {
  return isPaidActionAllowed(action, getEntitlement().status)
}

/**
 * حارس طبقة التخزين. يُستدعى في **أول سطر** من كل دالة تكتب حالة مدفوعة.
 * يرمي `PaidActionDenied` — والرمي مقصود: الابتلاع الصامت يترك الواجهة تعرض
 * نجاحًا لم يقع، وهو ما يمنعه الميثاق §5 صراحةً.
 */
export function assertPaid(action: PaidAction): void {
  if (!canPerform(action)) throw new PaidActionDenied(action)
}

/**
 * نداء آمن: ينفّذ `run` إن سُمح، وإلا يعيد `false` بلا رمي — للمواضع التي
 * تريد تفرّعًا هادئًا (فتح بوّابة Premium مثلًا) لا استثناءً.
 */
export function runIfPaid(action: PaidAction, run: () => void): boolean {
  if (!canPerform(action)) return false
  run()
  return true
}

// ————————————————————————————————————————————————————————————————
// [SOVEREIGN-RECOVERY-001] الحارس حسب النيّة
// ————————————————————————————————————————————————————————————————

/**
 * ادّعاء إصلاح بلا عطل. خطأ **مسمّى** لا `TypeError` عابر (الميثاق §4.2):
 * لو تسلّل مسار يعلن `system-repair` فوق مخزن سليم، سقط باسمه لا بمصادفة.
 */
export class RepairIntentRejected extends Error {
  readonly action: PaidAction
  constructor(action: PaidAction) {
    super(`RepairIntentRejected: ${action}`)
    this.name = 'RepairIntentRejected'
    this.action = action
  }
}

/**
 * بوّابة الكتابة الواحدة، **مُفرَّقة بالنيّة لا مُضعَّفة**:
 *
 *  • `user-edit`     → `assertPaid` كما هو. لم يتغيّر شيء لتحوير حقيقي.
 *  • `system-repair` → لا استحقاق **بشرط أن يثبت المستدعي وجود العطل**
 *    عبر `damageProof()`. المستدعي لا يُصدَّق على كلمته: الدالة تُستدعى هنا
 *    لحظة الفحص، فقراءة المخزن هي الحكَم لا وسيط الاستدعاء.
 *
 * لماذا برهان حيّ بدل علَم بسيط: العلَم البسيط يصير مفتاحًا عامًّا — يكفي
 * أن يمرّره مسارٌ واحد بالخطأ ليسقط الحارس كلّه على كل خطة. البرهان يجعل
 * التجاوز **مستحيلًا على مخزن سليم** مهما ادّعى المستدعي.
 */
export function assertWriteAllowed(
  action: PaidAction,
  intent: WriteIntent,
  damageProof: () => boolean,
): void {
  if (intent !== 'system-repair') {
    assertPaid(action)
    return
  }
  if (!damageProof()) throw new RepairIntentRejected(action)
}

/** هل هذا الاسم فعل إصلاح نظام (لا فعل مدفوع)؟ إعادة تصدير لمستهلكي الحارس. */
export { isSystemRepairAction }
