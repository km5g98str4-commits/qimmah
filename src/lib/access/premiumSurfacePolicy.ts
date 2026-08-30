// سياسة سطح العضوية — **أي نداء يُعرض في أي حالة**، دالّةً نقيّة.
// [WAVE2-PREMIUM-SURFACE]
//
// ═══ لماذا هذا الملف منفصل عن الشاشة ═══
// لو عاشت هذه القرارات داخل `PremiumView.tsx` لما أمكن إثباتها إلا بقراءة نصّ
// المصدر — و«هل الملف يذكر trialExpired؟» فحصٌ يمرّ على شيفرة لا تصل المستخدم
// (الميثاق §4.2). وهي هنا **قِيَم تُستدعى**: الإثبات ينفّذها على الحالات الثماني
// كلّها ويقيس ما تُرجعه، فلا يمرّ حارسٌ على نيّةٍ غير منفَّذة.
//
// ═══ وحدّها ═══
// **عرضٌ فقط.** لا شيء هنا يمنح وصولًا. لو قالت هذه الدالّة «اعرض بدء التجربة»
// لمن عنده Premium لما نزل Premium درجةً واحدة: القرار في `isPaidActionAllowed`
// والسلطة في `private.derive_state` بالخادم. هذه تقرّر **ما يُرى** لا **ما يُملَك**.

import type { AccessKind } from './accessSummary'

/** الحالات الثماني كلّها — يُشتقّ منها الإثبات فلا يفوته طارئ. */
export const ALL_ACCESS_KINDS: readonly AccessKind[] = [
  'checking', 'premium', 'special', 'trial', 'trialExpired', 'revoked', 'preview', 'unknown',
]

/**
 * **بدء التجربة** — في `preview` (أي `noAccess` الخادمية) وحدها.
 *
 * وما عداها له سببه المكتوب:
 *   • `trialExpired` ⇒ التجربة مرّة واحدة لكل حساب. زرٌّ يَعِد بإعادتها كذبٌ
 *     صريح، والتكليف يمنع التلميح بإمكان إعادتها.
 *   • `trial`            ⇒ شغّالة أصلًا.
 *   • `premium`/`special` ⇒ عنده وصولٌ أقوى؛ ولا يُعرض على مالكٍ ما دونه.
 *   • `revoked`          ⇒ يُفشَل مغلقًا.
 *   • `checking`/`unknown` ⇒ لا فعل يُبنى على جهلٍ بالحالة.
 */
export function offersTrial(kind: AccessKind): boolean {
  return kind === 'preview'
}

/**
 * **تفعيل الكود** — كلّ حالةٍ يمكن أن يرتقي صاحبها بصكّ شراء.
 *
 * وبقاؤه في `trial` و`special` مقصود: من اشترى وهو في تجربة أو وصول خاصّ يرتقي
 * **فورًا** ولا يُطلب منه انتظار انتهاء ما عنده.
 * ويُستثنى: `premium` (أعلى الأسبقية — لا شيء يرتقي إليه) · `revoked` (الإلغاء
 * لاصق ولا يرفعه مسار خدمة ذاتية، فالباب هنا كذبة) · `checking` (لم نعرف بعد).
 */
export function offersCode(kind: AccessKind): boolean {
  return kind === 'preview' || kind === 'trial' || kind === 'trialExpired'
    || kind === 'special' || kind === 'unknown'
}

/** **الشراء** — لكل من لا يملك Premium بعد، وليس ملغىً ولا مجهول الحالة. */
export function offersBuy(kind: AccessKind): boolean {
  return kind === 'preview' || kind === 'trial' || kind === 'trialExpired' || kind === 'special'
}

/**
 * هل تُعرض **مدّة متبقّية**؟
 *
 * الشرط الحاكم: `remainingMs !== null`. وPremium المشترى دائم ⇒ `expiresAtMs`
 * فارغ ⇒ `remainingMs === null` ⇒ **لا سطر مدّة ولا تاريخ مخترع**. وهذا هو
 * مطلب «لا تعرض تاريخ انتهاء وهميًّا لـPremium الدائم» منفَّذًا لا موصوفًا.
 */
export function showsRemaining(kind: AccessKind, remainingMs: number | null): boolean {
  if (remainingMs === null || remainingMs <= 0) return false
  return kind === 'trial' || kind === 'special'
}

/** هل تُعرض لافتة «Premium دائم بلا تاريخ انتهاء»؟ — لـ`premium` وحدها. */
export function showsPermanentPremiumNote(kind: AccessKind): boolean {
  return kind === 'premium'
}
