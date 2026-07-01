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
}

const ar: MiscStrings = {
  loginFailed: 'تعذّر تسجيل الدخول.',
  createFailed: 'تعذّر إنشاء الحساب.',
  accountCreatedConfirm: 'أنشئنا حسابك. تحقّق من بريدك لتأكيد الحساب ثم سجّل الدخول.',
  privacy: 'الخصوصية',
  terms: 'الشروط',
  contact: 'تواصل معنا',
  buildIdTitle: 'معرّف البناء',
  toastTitle: 'تم تجهيز صفحتك',
  toastBody: 'ابدأ من قسم اليوم وتابع تمرينك، أكلك، ومكملاتك من مكان واحد.',
  toastAction: 'افتح يومي',
  close: 'إغلاق',
  loadingLabel: 'جارٍ التحميل',
  weightChartLabel: 'رسم تقدّم الوزن',
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
}

export const miscStrings: Record<Lang, MiscStrings> = { ar, en }
