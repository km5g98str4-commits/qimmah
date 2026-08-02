import type { Lang } from '@/lib/appPreferences'

export interface MiscStrings {
  // LoginView — رسائل احتياطية للمصادقة
  loginFailed: string
  createFailed: string
  accountCreatedConfirm: string
  // Footer — روابط قانونية + تلميح البناء
  privacy: string
  terms: string
  contact: string
  buildIdTitle: string
  // SuccessToast — نص التأكيد الافتراضي
  toastTitle: string
  toastBody: string
  toastAction: string
  close: string
  // تسميات وصول (a11y) لمكوّنات مشتركة بلا نص مرئي
  loadingLabel: string
  weightChartLabel: string
  menu: string
  // HealthNotice — تنبيه صحي بسيط
  healthNoticeTitle: string
  healthNoticeBody: string
  // Footer — نبذة + روابط تنقّل + حقوق
  footerBlurb: string
  footerRights: string
  footerNote: string
  footerNav: { today: string; goal: string; profile: string; routine: string; workout: string; meals: string; supplements: string; commitment: string }
  // رسائل أخطاء المصادقة (authContext) — تُعرض للمستخدم مباشرةً
  authInvalidCredentials: string
  authAlreadyRegistered: string
  authEmailNotConfirmed: string
  authWeakPassword: string
  authInvalidEmail: string
  authRateLimit: string
  authNetwork: string
  authGeneric: string
  authCloudDisabled: string
}

const ar: MiscStrings = {
  loginFailed: 'ما قدرنا نسجّل دخولك.',
  createFailed: 'ما قدرنا نفتح الحساب.',
  accountCreatedConfirm: 'فتحنا حسابك. شيّك على بريدك وأكّد الحساب، بعدها سجّل دخولك.',
  privacy: 'الخصوصية',
  terms: 'الشروط',
  contact: 'تواصل معنا',
  buildIdTitle: 'معرّف البناء',
  toastTitle: 'تم تجهيز خطتك',
  toastBody: 'ابدأ من قسم اليوم وتابع تمرينك، أكلك، ومكملاتك من مكان واحد.',
  toastAction: 'افتح يومي',
  close: 'إغلاق',
  loadingLabel: 'جارٍ التحميل',
  weightChartLabel: 'رسم تقدّم الوزن',
  menu: 'القائمة',
  healthNoticeTitle: 'تنبيه صحي بسيط',
  healthNoticeBody:
    'هذي الصفحة لتنظيم خطتك الشخصية بس، ومو بديل عن استشارة طبية. قبل ما تغيّر تمارينك أو أكلك أو أي دواء أو مكمّل، راجع مختص — خصوصًا إذا عندك حالة صحية.',
  footerBlurb: 'قِمّة يجمع تمارينك وأكلك ومكملاتك وقياساتك والتزامك اليومي في مكان واحد — يعمل على جهازك.',
  footerRights: 'تطبيق شخصي للرياضي الفرد.',
  footerNote: 'تطبيقك الشخصي للتمرين والتغذية والمتابعة',
  footerNav: {
    today: 'يومي',
    goal: 'هدفي',
    profile: 'بياناتي',
    routine: 'جدولي',
    workout: 'تماريني',
    meals: 'أكلي',
    supplements: 'مكملاتي',
    commitment: 'التزامي',
  },
  authInvalidCredentials: 'البريد أو كلمة المرور مو صحيحة.',
  authAlreadyRegistered: 'هذا البريد مسجّل من قبل — سجّل دخولك على طول.',
  authEmailNotConfirmed: 'شيّك على بريدك وأكّد الحساب أول، بعدها سجّل دخولك.',
  authWeakPassword: 'كلمة المرور ضعيفة — استخدم 8 أحرف على الأقل مع حرف ورقم.',
  authInvalidEmail: 'البريد الإلكتروني مو صالح.',
  authRateLimit: 'محاولات كثيرة — انتظر شوي وجرّب مرة ثانية.',
  authNetwork: 'ما قدرنا نتصل بالخادم. تأكّد من النت وجرّب مرة ثانية.',
  authGeneric: 'صار خطأ غير متوقع. جرّب مرة ثانية.',
  authCloudDisabled: 'المزامنة السحابية مو مفعّلة في هذي النسخة.',
}

const en: MiscStrings = {
  loginFailed: 'Sign-in failed.',
  createFailed: 'Could not create your account.',
  accountCreatedConfirm: 'Your account is ready. Check your email to confirm it, then sign in.',
  privacy: 'Privacy',
  terms: 'Terms',
  contact: 'Contact us',
  buildIdTitle: 'Build ID',
  toastTitle: "You're all set",
  toastBody: 'Start with Today and track your workout, meals, and supplements in one place.',
  toastAction: 'Open Today',
  close: 'Close',
  loadingLabel: 'Loading',
  weightChartLabel: 'Weight progress chart',
  menu: 'Menu',
  healthNoticeTitle: 'A quick health note',
  healthNoticeBody:
    'This page is for organizing your personal plan only, not a substitute for medical advice. Before changing your workouts, diet, or any medication or supplement, consult a professional — especially if you have a health condition.',
  footerBlurb:
    'Qimmah brings your workouts, food, supplements, measurements, and daily commitments together in one place — running on your device.',
  footerRights: 'A personal app for the individual athlete.',
  footerNote: 'Your personal training, nutrition & tracking app',
  footerNav: {
    today: 'Today',
    goal: 'Goal',
    profile: 'My data',
    routine: 'Schedule',
    workout: 'Workouts',
    meals: 'Meals',
    supplements: 'Supplements',
    commitment: 'Commitment',
  },
  authInvalidCredentials: 'Incorrect email or password.',
  authAlreadyRegistered: 'This email is already registered. Sign in instead.',
  authEmailNotConfirmed: 'Check your inbox and confirm your account first, then sign in.',
  authWeakPassword: 'Password is too weak — use at least 8 characters with a letter and a number.',
  authInvalidEmail: 'That email address is not valid.',
  authRateLimit: 'Too many attempts. Wait a moment and try again.',
  authNetwork: "Couldn't reach the server. Check your connection and try again.",
  authGeneric: 'Something went wrong. Try again.',
  authCloudDisabled: 'Cloud sync is not enabled in this build.',
}

export const miscStrings: Record<Lang, MiscStrings> = { ar, en }
