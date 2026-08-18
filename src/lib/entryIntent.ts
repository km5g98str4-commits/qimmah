// نيّة الدخول المعلّقة — **تنجو من تفكيك الشاشة التي وُلدت فيها**.
//
// ═══ العطب البنيوي الذي يُغلقه هذا الملف ═══
// زرّ «جرّب Premium ٣ أيام» يعيش على شاشة التسليم وحدها، وهي مشروطة بمزلاج
// `finished` داخل `SetupView` (`SetupView.tsx:62-79`). فالضيف يضغط التجربة →
// يُقال له «تحتاج حساب موثَّق» → يضغط «أنشئ حسابك» → **الانتقال إلى التسجيل
// يفكّ تركيب `SetupView` فيموت المزلاج** → وبعد إنشاء الحساب يهبط على اللوحة،
// ومدخل التجربة لم يعد موجودًا أصلًا.
//
// أي: **العلاج الذي يعرضه الزرّ يهدم السطح الوحيد القادر على تنفيذه.** لا خطأ
// في الزرّ ولا في المزلاج؛ الخطأ أن النيّة عاشت في ذاكرة مكوّن بينما رحلتها
// تعبر تفكيكه.
//
// فالنيّة تُكتب على القرص عبر `safeStorage` (بنتيجة مفحوصة — §5)، وتُستهلك
// **مرّة واحدة** بعد الحساب. وهي علم واجهة لا استحقاق: لا تمنح وصولًا ولا
// تقصّره، والسلطة تبقى للخادم وحده (`beginTrial`). أسوأ ما تفعله إن زُوّرت
// يدويًا هو إظهار زرٍّ يرفضه الخادم بسبب صادق.

import { readJson, removeKey, writeJson, type WriteResult } from '@/lib/safeStorage'

export const PENDING_TRIAL_KEY = 'qimmah:entry:pending-trial:v1'

/**
 * مدّة صلاحية النيّة. أربعٌ وعشرون ساعة سخيّة لرحلة «سجّل ثم أكّد بريدك ثم
 * عُد» — وأقصر من أن تخطف زيارةً لاحقة لا يذكر صاحبها أنه طلب تجربة.
 */
export const PENDING_TRIAL_TTL_MS = 24 * 60 * 60 * 1000

interface PendingTrialIntent {
  v: 1
  at: number
}

function isIntent(value: unknown): value is PendingTrialIntent {
  if (!value || typeof value !== 'object') return false
  const i = value as Partial<PendingTrialIntent>
  return i.v === 1 && typeof i.at === 'number' && Number.isFinite(i.at)
}

/**
 * يسجّل «هذا المستخدم طلب التجربة ولزمه حساب». النتيجة **مُرجَعة لا مبتلعة**:
 * زرٌّ يَعِد باستئناف لن يحدث أسوأ من زرٍّ لا يَعِد شيئًا (§5).
 */
export function markPendingTrialIntent(now: number = Date.now()): WriteResult {
  return writeJson(PENDING_TRIAL_KEY, { v: 1, at: now } satisfies PendingTrialIntent)
}

/**
 * هل هناك نيّة سارية؟ المنتهية تُعامَل كغائبة **وتُنظَّف**: بقاؤها يشغل حصّة
 * ويعيد الفحص الفاشل عند كل إقلاع.
 */
export function hasPendingTrialIntent(now: number = Date.now()): boolean {
  const raw = readJson<unknown>(PENDING_TRIAL_KEY, null)
  if (!isIntent(raw)) {
    // بايتات معطوبة: تُنظَّف فورًا فلا تتكرّر القراءة الفاشلة إلى الأبد.
    if (raw !== null) clearPendingTrialIntent()
    return false
  }
  if (now - raw.at > PENDING_TRIAL_TTL_MS) {
    clearPendingTrialIntent()
    return false
  }
  return true
}

/** يُسقط النيّة. يُستدعى بعد استئنافها، أو حين يصرفها المستخدم صراحةً. */
export function clearPendingTrialIntent(): void {
  removeKey(PENDING_TRIAL_KEY)
}
