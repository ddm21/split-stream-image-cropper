const themeColors = ['indigo', 'emerald', 'rose', 'amber', 'violet', 'cyan'];

// These classes are constructed dynamically in the app based on the selected theme.
// Tailwind's JIT compiler cannot detect them at build time, so we must safelist them.
const safelistClasses = themeColors.flatMap((color) => [
  // Backgrounds
  `bg-${color}-100`,
  `bg-${color}-600`,
  `hover:bg-${color}-500`,
  `dark:bg-${color}-400/10`,
  `bg-${color}-500/10`,
  `bg-${color}-500/20`,
  // Texts
  `text-${color}-500`,
  `text-${color}-600`,
  `text-${color}-700`,
  `dark:text-${color}-200`,
  `dark:text-${color}-300`,
  // Borders
  `border-t-${color}-500`,
  `border-${color}-500/20`,
  `border-${color}-500/30`,
  // Rings
  `focus:ring-${color}-500`,
  // Shadows
  `shadow-${color}-500/20`,
  `hover:shadow-${color}-500/20`,
]);

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./*.{ts,tsx}",
    "./{components,contexts,services}/**/*.{ts,tsx}",
  ],
  safelist: safelistClasses,
  theme: {
    extend: {},
  },
  plugins: [],
}