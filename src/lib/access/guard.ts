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
import { isPaidActionAllowed, type PaidAction } from './paidActions'

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
