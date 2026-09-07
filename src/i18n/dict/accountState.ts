import type { Lang } from '@/lib/appPreferences'

/**
 * بطاقة حالة الحساب — [AUTH-DISCOVERABILITY-001]
 *
 * ═══ لماذا وُجدت ═══
 * الضيف كان يصل إلى تفعيل Premium فيُقال له «سجّل دخولك أول» **بلا باب**:
 * لا زرّ، ولا مسار ظاهر، ولا شيء في «التقدّم» يقول إنه غير مسجَّل أصلًا.
 * رسالة تصف بابًا ولا تفتحه (سابقة `reveal.ts` §createAccountCta).
 *
 * هذه النصوص لسطح واحد: بطاقة تقول **هل أنت مسجَّل**، وتعطي الفعل الوحيد
 * الذي يلزم بعدها. نبرة إخبار لا ضغط (§6/١)، ولا وعد بمزامنة ليست مفعّلة:
 * «مربوط بحسابك» لا «يتزامن».
 */
export interface AccountStateStrings {
  /** عنوان البطاقة — يسمّي الموضع. */
  title: string
  guestTitle: string
  guestBody: string
  signedInTitle: string
  signedInBody: string
  /** زرّ صفحة العضوية — حيث يُدخَل كود التفعيل. */
  membership: string
}

export const accountStateStrings: Record<Lang, AccountStateStrings> = {
  ar: {
    title: 'حسابك',
    guestTitle: 'ما سجّلت دخولك',
    guestBody: 'سجّل دخولك عشان تفعّل كود Premium وتربط تقدّمك بحسابك.',
    signedInTitle: 'مسجّل دخولك',
    signedInBody: 'كود التفعيل ودخول Premium من صفحة العضوية.',
    membership: 'العضوية',
  },
  en: {
    title: 'Your account',
    guestTitle: "You're not signed in",
    guestBody: 'Sign in to activate a Premium code and keep your progress on your account.',
    signedInTitle: "You're signed in",
    signedInBody: 'Activation codes and Premium live on the Membership page.',
    membership: 'Membership',
  },
}
