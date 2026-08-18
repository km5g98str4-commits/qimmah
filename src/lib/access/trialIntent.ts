// نيّة التجربة — الذاكرة التي تعبر رحلةَ المصادقة.
// [SOVEREIGN-COMMERCE-001] · العقد ٤ في `RUN2-LANES.md`.
//
// ═══ العطل البنيوي الذي أنشأ هذا الملف ═══
// نداء «جرّب Premium ٣ أيام» له **مضيف واحد** هو شاشة التسليم، وهي شاشة عابرة
// تعيش على مزلاج محلّي (`SetupView.finished`). والضيف — وهو الحالة الغالبة بعد
// أن صارت الأسئلة تسبق الحساب — يضغط النداء فيُقال له «التجربة تحتاج حسابًا»،
// فينتقل إلى إنشاء الحساب، **فتُفكَّك الشاشة ويُتلَف المزلاج**؛ وبعد التسجيل
// يهبط على اللوحة، ولم يعد للتجربة مدخل في التطبيق كلّه.
//
// أي أن العلاج الوحيد الذي يعرضه الزرّ هو **ما يقتله**. والزرّ لم يكن معطوبًا
// في معالجه؛ كان معطوبًا في **دورة حياته**.
//
// ═══ لماذا التخزين لا حالة React ═══
// النيّة يجب أن تنجو من: تفكيك الشاشة · تبديل المسار · **إعادة تحميل كاملة**
// (رابط تأكيد البريد يفتح تبويبًا جديدًا). كل ما دون التخزين يموت في واحدة من
// هذه الثلاث.
//
// ═══ ولماذا هي **نيّة** لا استحقاق ═══
// هذا المفتاح لا يمنح شيئًا ولا يُقرأ في أي قرار وصول. أقصى ما يفعله أنه
// **يُعيد طرح السؤال على الخادم** بعد المصادقة. الجواب يبقى للخادم وحده
// (`start_trial`)، ومن يكتب هذا المفتاح بيده لا يكسب ثانية واحدة — يكسب فقط
// نداءً سيرفضه الخادم. ولهذا هو خارج كل مسار استحقاق عمدًا.

import { readJson, removeKey, writeJson, type WriteResult } from '@/lib/safeStorage'
import type { TrialOutcome } from './entitlementBackend'

/** مفتاح مسجَّل في `src/lib/userDataKeys.ts` — كل مفتاح جديد يُسجَّل هناك. */
export const TRIAL_INTENT_KEY = 'qimmah:access:trial-intent:v1'

/** من أين جاءت النيّة — للتقارير ولاختيار سطح العرض بعد الاستئناف. */
export type TrialIntentOrigin = 'reveal' | 'gate' | 'settings'

export interface TrialIntent {
  /** ميلي ثانية بساعة الجهاز — **للانتهاء المحلّي وحده**، لا لأي حساب استحقاق. */
  recordedAt: number
  origin: TrialIntentOrigin
}

/**
 * عمر النيّة.
 *
 * نيّة عمرها أسبوع ليست نيّة: من ضغط الزرّ ثم عاد بعد أيام لا يتوقّع أن تبدأ
 * تجربته من تلقاء نفسها. أربع وعشرون ساعة تغطّي رحلة «سجّل ← أكّد بريدك ← ارجع»
 * كاملةً، وتنقضي قبل أن تصير مفاجأة. والانقضاء **يُلغي** ولا يبدأ.
 *
 * ولأنها بساعة الجهاز فهي قابلة للتلاعب — وهذا مقبول هنا وحده: أقصى ما يشتريه
 * المتلاعب أن تبقى نيّته حيّة أطول، والخادم هو من يقرّر بعدها.
 */
export const TRIAL_INTENT_TTL_MS = 24 * 60 * 60 * 1000

function isIntent(value: unknown): value is TrialIntent {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<TrialIntent>
  return typeof v.recordedAt === 'number' && Number.isFinite(v.recordedAt)
    && (v.origin === 'reveal' || v.origin === 'gate' || v.origin === 'settings')
}

/**
 * يسجّل النيّة **ويعيد نتيجة الكتابة**.
 *
 * الميثاق §5: لا شاشة نجاح قبل تأكيد الكتابة. فالمستدعي يفحص الناتج — وإن فشل
 * الحفظ فالصادق أن يقول «ما نقدر نكمّل لك بعد التسجيل، ارجع للتجربة يدويًا»
 * لا أن يَعِد باستئنافٍ لن يحدث.
 */
export function recordTrialIntent(origin: TrialIntentOrigin): WriteResult {
  return writeJson(TRIAL_INTENT_KEY, { recordedAt: Date.now(), origin } satisfies TrialIntent)
}

/** يقرأ النيّة الحيّة. المنتهية أو المشوَّهة **تُمسح** وتُقرأ `null`. */
export function readTrialIntent(): TrialIntent | null {
  const raw = readJson<unknown>(TRIAL_INTENT_KEY, null)
  if (!isIntent(raw)) {
    if (raw !== null) clearTrialIntent()
    return null
  }
  const age = Date.now() - raw.recordedAt
  // سالب = ساعة الجهاز رجعت إلى الوراء. لا نثق ولا نمدّد: نُلغي.
  if (age < 0 || age > TRIAL_INTENT_TTL_MS) {
    clearTrialIntent()
    return null
  }
  return raw
}

export function hasTrialIntent(): boolean {
  return readTrialIntent() !== null
}

export function clearTrialIntent(): void {
  removeKey(TRIAL_INTENT_KEY)
}

/**
 * هل يستهلك هذا الجوابُ النيّةَ؟
 *
 * **الجواب النهائي وحده** — أي جوابٍ لا تغيّره إعادةُ المحاولة: بدأت · استُهلكت
 * من قبل · الوصول موقوف. وما عداه يُبقيها:
 *
 *   • `email_not_verified` — سيؤكّد بريده ثم يعود، وهذه هي اللحظة التي وُجدت
 *     النيّة لأجلها بالضبط. استهلاكها هنا يُفرغ الميزة من معناها.
 *   • `not_authenticated` — لا جلسة بعد؛ الاستئناف سابق لأوانه لا فاشل.
 *   • `timeout` · `offline` · `service_error` · `backend_unconfigured` — عطلٌ
 *     أو غياب لا ذنب للمستخدم فيه. ابتلاع نيّته هنا يعاقبه على عطلنا.
 *
 * وهي دالّة نقيّة عمدًا كي **تُنفَّذ** في الإثباتات لا تُحاكى.
 */
export function consumesTrialIntent(outcome: TrialOutcome): boolean {
  return outcome === 'started' || outcome === 'already_claimed' || outcome === 'revoked'
}

/**
 * هل بدأت التجربة فعلًا؟ **`'started'` وحدها** — والباقي كلّه رفضٌ يُشرح.
 * تُقرأ من الأسطح كي لا يقرّر كلٌّ منها بنفسه ما الذي «يبدو نجاحًا».
 */
export function trialDidStart(outcome: TrialOutcome | null): boolean {
  return outcome === 'started'
}
