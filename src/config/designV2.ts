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
