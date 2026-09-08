/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        space: {
          900: '#060B18',
          800: '#0C152B',
          700: '#142042',
          600: '#1E3060',
          accent: '#00F0FF',
          isro: '#FF7700',
          sar: '#A855F7',
          success: '#10B981',
          danger: '#EF4444'
        }
      },
      borderRadius: {
        radius: '1rem',
      },
      fontFamily: {
        sans: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
        serif: ['"Source Serif 4"', 'serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    },
  },
  plugins: [],
}
