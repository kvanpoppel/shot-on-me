/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'lime-revig':  '#C8F135',
        'coral-revig': '#FF5F57',
        'cyan-revig':  '#00D4FF',
        'navy-revig':  '#1A1A2E',
        'dark-revig':  '#0F0F1E',
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      },
      keyframes: {
        'slide-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
        float: 'float 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
