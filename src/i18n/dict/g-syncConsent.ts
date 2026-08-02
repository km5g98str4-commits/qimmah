/**
 * قاموس بوابة موافقة المزامنة (حارة G · ج-١).
 *
 * السجلّ: **عامية بيضاء** — شاشة منتج لا وثيقة قانونية (الميثاق §6). والشاشة
 * سجلّ واحد لا خلط. النصّ يشرح ما يُرفع وما يبقى، ولا يضغط ولا يهوّل ولا يلوم:
 * «لاحقًا» خيار كامل لا تهرّب، والرفض لا يعطّل شيئًا — وهذه حقيقة لا تطمين.
 */
import type { Lang } from '@/lib/appPreferences'

export interface SyncConsentStrings {
  // ── الموافقة الأولى ──
  title: string
  intro: string
  uploadsHeading: string
  uploads: readonly string[]
  staysHeading: string
  stays: readonly string[]
  controlNote: string
  accept: string
  later: string
  // ── الموافقة الثانية ──
  sensitiveTitle: string
  sensitiveIntro: string
  sensitiveItems: readonly string[]
  sensitiveWhy: string
  sensitiveAccept: string
  sensitiveSkip: string
  sensitiveSkipNote: string
  // ── حالات ──
  saveFailed: string
  statusOn: string
  statusOff: string
  statusSensitiveOn: string
  statusSensitiveOff: string
}

export const syncConsentStrings: Record<Lang, SyncConsentStrings> = {
  ar: {
    title: 'نرفع بياناتك للسحابة؟',
    intro:
      'قِمّة يشتغل على جهازك من غير حساب. وإذا بغيت بياناتك توصلك على جهاز ثاني، نقدر نرفعها لحسابك أنت — وما يوصلها أحد غيرك.',
    uploadsHeading: 'اللي يُرفع:',
    uploads: [
      'خطتك وتمارينك وأوزانك وتكراراتك',
      'وجباتك وسعراتك وماءك',
      'وزنك وقياساتك وتقدّمك',
      'إعداداتك وأهدافك',
    ],
    staysHeading: 'اللي يبقى على جهازك:',
    stays: [
      'إصاباتك وملاحظاتك الصحية',
      'أدويتك ومكمّلاتك',
      'حساسياتك من الأكل',
    ],
    controlNote:
      'تقدر توقف الرفع أي وقت من الإعدادات، وتحذف بياناتك من السحابة. وإذا ما بغيت الحين، التطبيق يشتغل عندك عادي بالكامل.',
    accept: 'ارفع بياناتي',
    later: 'لاحقًا',

    sensitiveTitle: 'وبياناتك الصحية؟',
    sensitiveIntro:
      'هذي نسألك عنها لحالها، لأنها أخصّ من غيرها. وما نرفعها إلا إذا قلت لنا نرفعها:',
    sensitiveItems: [
      'الإصابات والملاحظات الصحية',
      'الأدوية والمكمّلات',
      'الحساسيات الغذائية',
    ],
    sensitiveWhy:
      'فايدتها إنها توصلك على أجهزتك كلها، فخطتك تراعي إصابتك وين ما دخلت.',
    sensitiveAccept: 'وافقت — ارفعها معها',
    sensitiveSkip: 'لا، خلّها على جهازي',
    sensitiveSkipNote:
      'باقي بياناتك تُرفع عادي، وهذي وحدها تبقى عندك. وتقدر تغيّر رأيك أي وقت.',

    saveFailed: 'ما قدرنا نحفظ اختيارك على الجهاز — جرّب مرة ثانية. ما رفعنا شي.',
    statusOn: 'الرفع للسحابة شغّال',
    statusOff: 'بياناتك على هذا الجهاز بس',
    statusSensitiveOn: 'بياناتك الصحية تُرفع معها',
    statusSensitiveOff: 'بياناتك الصحية على جهازك بس',
  },
  en: {
    title: 'Back your data up to the cloud?',
    intro:
      "Qimmah works on your device without an account. If you want your data on another device too, we can back it up to your own account — and nobody else can reach it.",
    uploadsHeading: "What goes up:",
    uploads: [
      'Your plan, workouts, weights, and reps',
      'Your meals, calories, and water',
      'Your weight, measurements, and progress',
      'Your settings and goals',
    ],
    staysHeading: 'What stays on your device:',
    stays: [
      'Your injuries and health notes',
      'Your medications and supplements',
      'Your food allergies',
    ],
    controlNote:
      "You can turn this off anytime in Settings and delete your cloud data. And if you'd rather not right now, the app still works fully.",
    accept: 'Back up my data',
    later: 'Not now',

    sensitiveTitle: 'And your health data?',
    sensitiveIntro:
      "We ask about this one separately, because it's more personal. We don't upload it unless you tell us to:",
    sensitiveItems: [
      'Injuries and health notes',
      'Medications and supplements',
      'Food allergies',
    ],
    sensitiveWhy:
      'The upside: it follows you across your devices, so your plan works around your injury wherever you sign in.',
    sensitiveAccept: 'Yes, include it',
    sensitiveSkip: 'No, keep it on my device',
    sensitiveSkipNote:
      "The rest of your data still backs up — just this stays with you. You can change your mind anytime.",

    saveFailed: "We couldn't save your choice on this device — give it another try. Nothing was uploaded.",
    statusOn: 'Cloud backup is on',
    statusOff: 'Your data is on this device only',
    statusSensitiveOn: 'Health data is included',
    statusSensitiveOff: 'Health data stays on your device',
  },
}
