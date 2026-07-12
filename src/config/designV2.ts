export const DESIGN_V2_QUERY_KEY = 'design'
export const DESIGN_V2_QUERY_VALUE = 'v2'

export const designV2Tokens = {
  color: {
    ember: '#F0512A',
    blue: '#2A6CE0',
    green: '#1F9D57',
    teal: '#12A594',
    error: '#E11D2E',
  },
  space: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    screen: '1.25rem',
  },
  radius: {
    control: '0.75rem',
    card: '1rem',
    hero: '1.5rem',
    pill: '9999px',
  },
  motion: {
    press: '150ms',
    control: '200ms',
    entrance: '400ms',
    easeOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
} as const

export const designV2Copy = {
  brandLatin: 'QIMMAH',
  brandArabic: 'قِمّة',
  welcome: {
    headline: 'درّب بوضوح. تقدّم بثقة.',
    subline: 'تمرينك وتغذيتك وتقدّمك في مكان واحد — بالعربية، وبخطوات واضحة.',
    primaryCta: 'ابدأ الآن',
    secondaryPrefix: 'لديك حساب؟',
    secondaryCta: 'تسجيل الدخول',
  },
  tabs: ['اليوم', 'التمارين', 'تسجيل', 'التغذية', 'التقدّم'],
} as const

export const designV2Onboarding = {
  progressLabel: 'إعداد خطتك',
  back: 'رجوع',
  next: 'تابع',
  retry: 'أعد المحاولة',
  goal: {
    eyebrow: 'هدفك',
    title: 'ما هدفك الآن؟',
    hint: 'اختر المسار الأقرب لهدفك الحالي.',
    error: 'اختر هدفًا للمتابعة.',
    options: [
      { value: 'cut', label: 'تنشيف', description: 'خفّض الدهون مع الحفاظ على العضل', icon: 'TrendingDown' },
      { value: 'maintain', label: 'محافظة', description: 'ثبّت وزنك وحافظ على تقدّمك', icon: 'ShieldCheck' },
      { value: 'bulk', label: 'تضخيم', description: 'ابنِ العضل بزيادة مدروسة', icon: 'TrendingUp' },
    ],
  },
  reality: {
    eyebrow: 'واقع تمرينك',
    title: 'كم مرة تتمرّن؟',
    hint: 'اختر عدد الأيام ومدة الجلسة المناسبة لجدولك.',
    daysLabel: 'أيام التمرين في الأسبوع',
    durationLabel: 'مدة الجلسة',
    days: [3, 4, 5, 6],
    durations: [30, 45, 60, 75],
    dayUnit: 'أيام',
    minuteUnit: 'دقيقة',
    error: 'اختر الأيام ومدة الجلسة للمتابعة.',
  },
  equipment: {
    eyebrow: 'مكان التمرين',
    title: 'أين تتمرّن؟ وكيف تفضّل؟',
    hint: 'اختر المكان والتجهيز الأقرب لواقعك.',
    error: 'اختر مكان التمرين للمتابعة.',
    options: [
      { value: 'commercial_gym', label: 'صالة كاملة', description: 'أجهزة وأوزان حرة', icon: 'Building2' },
      { value: 'small_gym', label: 'صالة صغيرة', description: 'تجهيزات أساسية', icon: 'Dumbbell' },
      { value: 'home_gym', label: 'تمرين منزلي', description: 'أدوات بسيطة في المنزل', icon: 'Home' },
      { value: 'bodyweight', label: 'وزن الجسم', description: 'بدون أدوات', icon: 'Activity' },
    ],
  },
  assembly: {
    eyebrow: 'خطتك',
    loadingTitle: 'يتم إعداد خطتك',
    loadingBody: 'نرتّب أيامك وتمارينك وفق اختياراتك.',
    readyTitle: 'خطتك جاهزة',
    readyBody: 'راجع الأساس، ثم ابدأ خطتك.',
    goalLabel: 'الهدف',
    scheduleLabel: 'الجدول',
    placeLabel: 'المكان',
    start: 'ابدأ خطتي',
    error: 'تعذّر إعداد الخطة. أعد المحاولة.',
  },
} as const

export function isDesignV2Preview(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get(DESIGN_V2_QUERY_KEY) === DESIGN_V2_QUERY_VALUE
}

export function loadDesignV2Fonts(): void {
  if (!isDesignV2Preview() || typeof document === 'undefined') return
  if (document.querySelector('[data-qimmah-design-v2-fonts]')) return

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href =
    'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Readex+Pro:wght@600;700&display=swap'
  link.dataset.qimmahDesignV2Fonts = 'true'
  document.head.append(link)
}
