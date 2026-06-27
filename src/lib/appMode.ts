// وضع الاستخدام الحقيقي — يفصل «الضيف على هذا الجهاز» عن «الحساب السحابي» وعن «النموذج».
//
// النموذج (#/demo) منفصل تمامًا ولا يُكتب في تخزين المستخدم.
// الضيف: علم محلي بسيط يعني أنّ المستخدم اختار العمل على هذا الجهاز بلا حساب سحابي.

const GUEST_KEY = 'qimmah:guest:v1'

/** هل اختار المستخدم وضع الضيف على هذا الجهاز؟ */
export function isGuest(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(GUEST_KEY) === '1'
  } catch {
    return false
  }
}

/** يفعّل وضع الضيف (يُستدعى عند اختيار «المتابعة كضيف»). */
export function enableGuest(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(GUEST_KEY, '1')
  } catch {
    /* تجاهل */
  }
}

/** يلغي وضع الضيف (يُستدعى عند تسجيل الدخول السحابي أو الخروج للبداية). */
export function disableGuest(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(GUEST_KEY)
  } catch {
    /* تجاهل */
  }
}
