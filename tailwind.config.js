/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: {
          25: '#FEFCF9',
          50: '#FBF7F0',
          100: '#F7F1E8',
          200: '#EFE5D4',
          300: '#E4D5BC',
        },
        charcoal: {
          700: '#34343B',
          800: '#26262B',
          900: '#1B1B20',
          950: '#111114',
        },
        stone: {
          400: '#A1A1AA',
          500: '#71717A',
          600: '#52525B',
        },
        brand: {
          50: '#FFF5EC',
          100: '#FFE7CF',
          200: '#FFCF99',
          300: '#FFB163',
          400: '#FF9438',
          500: '#F97316',
          600: '#E25A0A',
          700: '#B8470A',
          800: '#8A3710',
          900: '#5C280A',
        },
        accent: {
          blue: '#3B82F6',
          purple: '#7C5CFC',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Calistoga"', '"Plus Jakarta Sans"', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(38,38,43,0.04), 0 2px 12px rgba(38,38,43,0.06)',
        card: '0 1px 2px rgba(38,38,43,0.04), 0 10px 28px rgba(38,38,43,0.08)',
        lift: '0 4px 12px rgba(38,38,43,0.08), 0 24px 64px rgba(38,38,43,0.16)',
        glow: '0 8px 24px rgba(249,115,22,0.32)',
        inset: 'inset 0 1px 2px rgba(38,38,43,0.04)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      animation: {
        fadeIn: 'fadeIn 0.25s ease-out',
        slideUp: 'slideUp 0.3s ease-out',
        scaleIn: 'scaleIn 0.2s ease-out',
        float: 'float 8s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.96)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        float: { '0%, 100%': { transform: 'translate(0, 0)' }, '50%': { transform: 'translate(-12px, 16px)' } },
      },
    },
  },
  plugins: [],
};
