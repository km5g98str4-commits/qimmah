// سياسة كلمة المرور (P0) — تحقّق جانب العميل: حدّ أدنى ٨ أحرف + قوة أساسية (حرف + رقم).
// ملاحظة: هذا خط الدفاع الأول (تجربة فورية قبل الإرسال). الحدّ الأدنى على الخادم يُضبط أيضًا
// من لوحة Supabase (Auth → Password) ليكون ٨؛ الكودّ لا يستطيع ضبطه، فيبقى قرار زياد.

export const PASSWORD_MIN_LENGTH = 8

export type PasswordLevel = 'empty' | 'weak' | 'fair' | 'good' | 'strong'

export interface PasswordStrength {
  lengthOk: boolean
  hasLetter: boolean
  hasNumber: boolean
  /** درجة 0..4 لمؤشّر القوة. */
  score: number
  level: PasswordLevel
  /** يجتاز الحدّ الأدنى للتسجيل: ٨ أحرف + حرف + رقم. */
  valid: boolean
}

/** يقيّم كلمة المرور: يحسب المتطلّبات والقوة دون أي اعتماد على الشبكة. */
export function evaluatePassword(pw: string): PasswordStrength {
  const lengthOk = pw.length >= PASSWORD_MIN_LENGTH
  const hasLetter = /[A-Za-z؀-ۿ]/.test(pw)
  const hasNumber = /\d/.test(pw)
  const hasSymbol = /[^A-Za-z0-9؀-ۿ]/.test(pw)
  const hasMixedCase = /[a-z]/.test(pw) && /[A-Z]/.test(pw)

  let score = 0
  if (pw.length >= PASSWORD_MIN_LENGTH) score++
  if (pw.length >= 12) score++
  if (hasLetter && hasNumber) score++
  if (hasSymbol || hasMixedCase) score++

  const level: PasswordLevel =
    pw.length === 0 ? 'empty' : score <= 1 ? 'weak' : score === 2 ? 'fair' : score === 3 ? 'good' : 'strong'

  return { lengthOk, hasLetter, hasNumber, score, level, valid: lengthOk && hasLetter && hasNumber }
}
