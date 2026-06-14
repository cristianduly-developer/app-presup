/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#3B82F6',
          green: '#22C55E',
          orange: '#F97316',
          purple: '#A855F7',
          teal: '#14B8A6',
        },
        surface: {
          bg: '#0A0A0F',
          card: '#13131A',
          elevated: '#1C1C27',
          border: '#2A2A3A',
        },
      },
    },
  },
  plugins: [],
}
