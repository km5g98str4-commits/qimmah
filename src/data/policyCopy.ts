import type { Lang } from '@/lib/appPreferences'

export const POLICY_LINKS = {
  terms: '#/terms',
  privacy: '#/privacy',
} as const

export const policyCopy: Record<Lang, {
  eligibilityPrefix: string
  terms: string
  joiner: string
  privacy: string
  eligibilityRequired: string
  healthExplanation: string
  healthConsent: string
  healthConsentRequired: string
}> = {
  ar: {
    eligibilityPrefix: 'عمري 13 سنة أو أكثر، وأوافق على',
    terms: 'الشروط',
    joiner: 'و',
    privacy: 'سياسة الخصوصية',
    eligibilityRequired: 'أكّد أن عمرك 13 سنة أو أكثر، ووافق على الشروط وسياسة الخصوصية.',
    // ن٧: عامية بيضاء تطابق بقية الخطوة 0 («نستخدمها عشان…» · «تقدر تعدّلها»)،
    // والمعنى القانوني كما هو بل أدقّ: البيانات محلية، ولا تخرج إلا بتسجيل دخول
    // **وتفعيل** المزامنة — شرطان لا شرط واحد.
    healthExplanation: 'نستخدم عمرك وطولك ووزنك عشان نجهّز هدفك وخطتك. بياناتك تنحفظ على جهازك، وما تطلع منه إلا إذا سجّلت دخولك وفعّلت المزامنة بنفسك.',
    healthConsent: 'أوافق على معالجة بياناتي الصحية لإعداد خطتي',
    healthConsentRequired: 'وافق على معالجة بياناتك الصحية للمتابعة.',
  },
  en: {
    eligibilityPrefix: 'I am 13 or older and agree to the',
    terms: 'Terms',
    joiner: 'and',
    privacy: 'Privacy Policy',
    eligibilityRequired: 'Confirm that you are 13 or older and accept the Terms and Privacy Policy.',
    healthExplanation: 'We use your age, height and weight to set up your goal and plan. Your data stays on your device — it only leaves if you sign in and turn sync on yourself.',
    healthConsent: 'I agree to the processing of my health data to prepare my plan',
    healthConsentRequired: 'Agree to the processing of your health data to continue.',
  },
}
