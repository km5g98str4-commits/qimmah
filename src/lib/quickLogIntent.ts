/**
 * نيّة «التسجيل السريع» — مالك قانوني واحد للمفتاح ولحراسته.
 *
 * كان المفتاح `qimmah:quick-log-intent` يُقرأ ويُكتب خامًا في ثلاثة مواضع حيّة
 * (`App.tsx` · `ProfileV2` · `NutritionView`)، وكلٌّ يحرسه بطريقته — أو لا يحرسه.
 * ثلاثة أعطال مقيسة خرجت من هذا التشتّت:
 *
 *   ١. **التخزين المحجوب يرمي.** في Safari حين تُمنع الكعكات، الوصول إلى
 *      `window.sessionStorage` **نفسه** يرمي `SecurityError` — لا دوالّه فقط.
 *      فكتابة النيّة في `App.tsx` كانت ترمي داخل معالج النقر (فيموت زرّ التسجيل
 *      السريع كلّه)، وقراءتها في `ProfileV2` ترمي أثناء التركيب (فينهار مسار
 *      «ملفك» إلى حدّ الخطأ). وكان بقيّة المستودع محروسًا أصلًا
 *      (`setupFocus.ts` · `entitlementSource.ts` · `CustomizationCenter`) —
 *      فالعطل انحراف عن نمط قائم لا نقص فيه.
 *
 *   ٢. **قيمة مجهولة.** أي قيمة خارج الثلاث تُمسح وتُتجاهَل بلا رمي.
 *
 *   ٣. **نيّة معلّقة.** القراءة مستهلِكة: `take` تمسح **قبل** أن تُعيد، فلا
 *      تُعاد النيّة نفسها عند تحديث الصفحة إلى الأبد.
 *
 * نفس نمط `setupFocus.ts` القائم — لا آلية توجيه جديدة.
 */
export const QUICK_LOG_INTENT_KEY = 'qimmah:quick-log-intent'

/** الوجهات الثلاث التي تعلنها ورقة التسجيل السريع. */
export type QuickLogIntent = 'meal' | 'water' | 'routine'

const VALID: readonly QuickLogIntent[] = ['meal', 'water', 'routine']

function isValid(raw: string | null): raw is QuickLogIntent {
  return raw !== null && (VALID as readonly string[]).includes(raw)
}

/** يسجّل نيّة التسجيل السريع. آمن في بيئة بلا نافذة أو بتخزين محجوب. */
export function requestQuickLogIntent(intent: QuickLogIntent): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(QUICK_LOG_INTENT_KEY, intent)
  } catch {
    /* تخزين محجوب — يبقى الحدث الفوري هو المسار، بلا كسر. */
  }
}

/**
 * يقرأ النيّة **ويستهلكها إن كانت من نصيب هذه الشاشة**.
 *
 * `accepted` ليس تزيينًا: «التغذية» تملك `meal`/`water` و«ملفك» يملك `routine`.
 * ولو استهلكت كلٌّ منهما أي قيمة تجدها، لابتلعت شاشةٌ نيّةَ الأخرى حين تُركَّب
 * قبلها — فيصل المستخدم إلى وجهته وقد ضاعت نيّته في الطريق.
 *
 * والمسح يسبق الإعادة، فأي خروج بعده (حجب Premium، تحديث الصفحة) لا يترك
 * نيّة معلّقة. والقيمة المجهولة تُمسح دائمًا فلا تعلق إلى الأبد.
 */
export function takeQuickLogIntent(accepted: readonly QuickLogIntent[]): QuickLogIntent | null {
  if (typeof window === 'undefined') return null
  let raw: string | null = null
  try {
    raw = window.sessionStorage.getItem(QUICK_LOG_INTENT_KEY)
  } catch {
    return null
  }
  if (raw === null) return null
  if (!isValid(raw)) {
    clearQuickLogIntent()
    return null
  }
  if (!accepted.includes(raw)) return null
  clearQuickLogIntent()
  return raw
}

/** يمسح النيّة بلا قراءة. آمن مع تخزين محجوب. */
export function clearQuickLogIntent(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(QUICK_LOG_INTENT_KEY)
  } catch {
    /* تخزين محجوب — لا شيء نمسحه. */
  }
}
