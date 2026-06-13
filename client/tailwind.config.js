/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#38bdf8',
          accent: '#0ea5e9',
          dark: '#0f172a',
        }
      }
    },
  },
  plugins: [],
}