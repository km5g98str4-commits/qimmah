/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Tajawal', 'system-ui', 'sans-serif'],
        display: ['Tajawal', 'system-ui', 'sans-serif'],
      },
      colors: {
        // لوحة ألوان فاخرة — أسود فحمي + ذهبي/أخضر نيون
        ink: {
          950: '#06070a',
          900: '#0a0c11',
          800: '#11141c',
          700: '#181c27',
          600: '#222736',
          500: '#2e3445',
        },
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        gold: {
          300: '#f5d98b',
          400: '#eecb6a',
          500: '#d4af37',
          600: '#b8932a',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(16,185,129,0.15), 0 18px 60px -15px rgba(16,185,129,0.35)',
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 20px 50px -20px rgba(0,0,0,0.8)',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
        'radial-brand':
          'radial-gradient(60% 50% at 50% 0%, rgba(16,185,129,0.18) 0%, rgba(6,7,10,0) 70%)',
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
