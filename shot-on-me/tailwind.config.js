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
        primary: {
          50: '#faf8f3',
          100: '#f5f0e6',
          200: '#e8dcc4',
          300: '#d9c49f',
          400: '#c9a875',
          500: '#B8945A', // Soft, pale gold - mature and elegant
          600: '#9A7A4A',
          700: '#7D6139',
          800: '#604A2B',
          900: '#4A3820',
        },
        // Alias gold to primary for consistency
        gold: {
          50: '#faf8f3',
          100: '#f5f0e6',
          200: '#e8dcc4',
          300: '#d9c49f',
          400: '#c9a875',
          500: '#B8945A', // Same as primary-500 - soft, pale gold
          600: '#9A7A4A',
          700: '#7D6139',
          800: '#604A2B',
          900: '#4A3820',
        },
      },
      fontFamily: {
        'script': ['"Dancing Script"', 'cursive', 'serif'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

