/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        felt: {
          950: '#060d08',
          900: '#0b1810',
          800: '#112316',
          700: '#1a3320',
          600: '#234428',
        },
        gold: {
          300: '#fcd57a',
          400: '#f5b832',
          500: '#e09a0e',
          600: '#b87a00',
        },
        ivory: {
          50:  '#fdfaf3',
          100: '#f9f3e3',
          200: '#f0e6c8',
        },
        crimson: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      boxShadow: {
        gold:    '0 0 20px rgba(245,184,50,0.15)',
        'gold-lg': '0 0 40px rgba(245,184,50,0.25)',
        card:    '0 4px 24px rgba(0,0,0,0.4)',
      },
      animation: {
        'fade-in':  'fadeIn 0.35s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out forwards',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' },                               to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseGold: {
          '0%,100%': { boxShadow: '0 0 8px rgba(245,184,50,0.2)' },
          '50%':     { boxShadow: '0 0 24px rgba(245,184,50,0.5)' },
        },
      },
    },
  },
  plugins: [],
}
