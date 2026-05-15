/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0F0F1E',
        card:       '#1C1C32',
        card2:      '#23233A',
        lime: {
          revig:  '#C8F135',
          dark:  '#A8CF10',
          light: '#D8FF55',
          50:    'rgba(200,241,53,0.05)',
          100:   'rgba(200,241,53,0.10)',
          200:   'rgba(200,241,53,0.20)',
        },
        coral: {
          revig:  '#FF5F57',
          dark:  '#E04040',
          light: '#FF9A57',
          100:   'rgba(255,95,87,0.10)',
          200:   'rgba(255,95,87,0.20)',
        },
        cyan: {
          revig:  '#00D4FF',
          dark:  '#00AACC',
          light: '#33DDFF',
          100:   'rgba(0,212,255,0.10)',
          200:   'rgba(0,212,255,0.20)',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.07)',
          lime:    'rgba(200,241,53,0.25)',
          coral:   'rgba(255,95,87,0.20)',
          cyan:    'rgba(0,212,255,0.20)',
        },
      },
      fontFamily: {
        'sans':    ['Inter', 'system-ui', 'sans-serif'],
        'display': ['Poppins', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'revig-gradient': 'linear-gradient(135deg, #C8F135 0%, #00D4FF 50%, #FF5F57 100%)',
        'revig-gradient-dark': 'linear-gradient(135deg, #1A1A2E 0%, #252540 100%)',
        'hero-gradient': 'linear-gradient(135deg, #C8F135 0%, #00D4FF 60%, #FF5F57 100%)',
      },
      animation: {
        'bubble-rise': 'bubble-rise 3s ease-in infinite',
        'revig-pop': 'revig-pop 0.4s ease-out',
        'sparkle': 'sparkle 1.5s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'pulse-lime': 'pulse-lime 2s ease-in-out infinite',
      },
      keyframes: {
        'bubble-rise': {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '0.8' },
          '100%': { transform: 'translateY(-100px) scale(0.3)', opacity: '0' },
        },
        'revig-pop': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '60%': { transform: 'scale(1.2)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'sparkle': {
          '0%, 100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
          '50%': { transform: 'scale(1.2) rotate(180deg)', opacity: '0.7' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-lime': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(200, 241, 53, 0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(200, 241, 53, 0)' },
        },
      },
    },
  },
  plugins: [],
}
