/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Tajawal', 'system-ui', 'sans-serif'],
        display: ['Tajawal', 'system-ui', 'sans-serif'],
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
        glow: '0 0 0 1px rgba(242,106,33,0.18), 0 14px 40px -12px rgba(242,106,33,0.30)',
        card: '0 1px 2px 0 rgba(43,37,32,0.04), 0 12px 32px -16px rgba(43,37,32,0.18)',
        soft: '0 1px 2px 0 rgba(43,37,32,0.05), 0 8px 24px -14px rgba(43,37,32,0.15)',
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
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out both',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
