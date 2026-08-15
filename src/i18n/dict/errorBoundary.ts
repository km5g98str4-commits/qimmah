import type { Lang } from '@/lib/appPreferences'

export interface ErrorBoundaryStrings {
  title: string
  body: string
  reload: string
  routeTitle: string
  routeBody: string
  retry: string
  support: string
  referenceLabel: string
}
export const errorBoundaryStrings: Record<Lang, ErrorBoundaryStrings> = {
  ar: {
    title: 'صار خلل بسيط',
    body: 'واجهنا مشكلة غير متوقعة في هذي الشاشة. جرّب تحدّث الصفحة — بياناتك محفوظة على جهازك.',
    reload: 'حدّث الصفحة',
    routeTitle: 'صار خطأ غير متوقّع',
    routeBody: 'ما قدرنا نحمّل هذي الشاشة. جرّب مرة ثانية — بياناتك محفوظة على جهازك.',
    retry: 'جرّب مرة ثانية',
    support: 'راسل الدعم',
    referenceLabel: 'مرجع الخطأ',
  },
  en: {
    title: 'Something went wrong',
    body: 'We hit an unexpected problem on this screen. Try reloading — your data is still saved on your device.',
    reload: 'Reload page',
    routeTitle: 'Something went wrong',
    routeBody: 'We couldn’t load this screen. Try again — your data is still saved on your device.',
    retry: 'Try again',
    support: 'Email support',
    referenceLabel: 'Error reference',
  },
}
