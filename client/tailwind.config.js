/** @type {import('tailwindcss').Config} */
export default {
  // Ici, on dit à Tailwind : "Regarde tous les fichiers .html, .vue, .js"
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}