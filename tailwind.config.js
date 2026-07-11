/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Font is token-driven so the v2.1 seam can switch it from one place.
        // `--font-sans`/`--font-display` are UNDEFINED by default → the var()
        // fallback (Tajawal) renders, so the default build is byte-identical.
        // Under `[data-design="v2"]` (tokens.css) they resolve to IBM Plex Sans
        // Arabic / Readex Pro. No mixed fonts: every `font-sans` user switches.
        sans: ['var(--font-sans, "Tajawal", system-ui, sans-serif)'],
        display: ['var(--font-display, "Tajawal", system-ui, sans-serif)'],
      },
      colors: {
        // ألوان ديناميكية تُقاد من مركز التخصيص عبر CSS variables
        primary: 'var(--c-primary)',
        accent: 'var(--c-accent)',

        // أسطح الثيم — قنوات RGB عبر CSS variables لدعم مُعدِّل الشفافية (/opacity)
        page: 'rgb(var(--c-page) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        beige: 'rgb(var(--c-beige) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',

        // مقياس النص — أبيض قوي → رمادي خافت
        ink: {
          900: 'rgb(var(--c-ink-900) / <alpha-value>)',
          700: 'rgb(var(--c-ink-700) / <alpha-value>)',
          500: 'rgb(var(--c-ink-500) / <alpha-value>)',
          400: 'rgb(var(--c-ink-400) / <alpha-value>)',
        },

        // العلامة — برتقالي دافئ (يُقاد افتراضيًا من --c-primary أيضًا)
        brand: {
          50: '#FEF3EB',
          100: '#FDE7D8',
          200: '#FBCBA9',
          300: '#F8A06A',
          400: '#F58145',
          500: '#F26A21',
          600: '#D4540F',
          700: '#B0440B',
          800: '#8A360A',
          900: '#6B2A08',
        },
        // لون التمييز — كهرماني دافئ
        gold: {
          200: '#F6DCA8',
          300: '#EFC066',
          400: '#E0941F',
          500: '#C97E12',
          600: '#A9670D',
        },

        // ألوان الحالة
        success: '#3E9E6B',
        warning: '#E0941F',
        danger: '#D6553A',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(242,106,33,0.20), 0 14px 40px -12px rgba(242,106,33,0.34)',
        // ظلال مُعايَرة للثيم الداكن (أساس أسود لعمق حقيقي على خلفية #101216)
        card: '0 1px 2px 0 rgba(0,0,0,0.30), 0 14px 34px -18px rgba(0,0,0,0.55)',
        soft: '0 1px 2px 0 rgba(0,0,0,0.25), 0 8px 24px -14px rgba(0,0,0,0.45)',
        elevated: '0 2px 4px 0 rgba(0,0,0,0.35), 0 24px 56px -20px rgba(0,0,0,0.70)',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
        'radial-brand':
          'radial-gradient(60% 50% at 50% 0%, rgba(242,106,33,0.22) 0%, rgba(242,106,33,0) 70%)',
        'app-hero':
          'radial-gradient(80% 60% at 50% 0%, rgba(242,106,33,0.28) 0%, rgba(242,106,33,0) 60%), radial-gradient(70% 50% at 80% 100%, rgba(224,148,31,0.18) 0%, rgba(224,148,31,0) 60%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        // لمعان هيكل التحميل (skeleton) — يمرّ من اليمين لليسار مناسبًا للـ RTL
        shimmer: {
          '100%': { transform: 'translateX(-100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out both',
        'fade-in': 'fade-in 0.4s ease-out both',
        'pop-in': 'pop-in 0.28s cubic-bezier(0.22,1,0.36,1) both',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
