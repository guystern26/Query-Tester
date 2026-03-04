/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./packages/playground/src/main/webapp/**/*.{ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        // Custom navy backgrounds
        navy: {
          950: '#0a1628',
          900: '#162033',
          800: '#202b43',
          700: '#2a3a5c',
        },
        // Primary button color
        btnprimary: {
          DEFAULT: '#60A5FA',
          hover: '#4A90E2',
          dark: '#3574C4',
        },
        // Accent scale — blue-400 based for dark theme
        accent: {
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#4A90E2',
          600: '#3574C4',
          700: '#2A5FA0',
          900: '#1a2d4d',
        },
      },
    },
  },
  plugins: [],
};
