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
        // Primary button color — solid blue-400
        btnprimary: {
          DEFAULT: '#60A5FA',
          hover: '#4A90E2',
        },
        // Accent scale — original theme
        accent: {
          200: '#e6f3ff',
          300: '#cce6ff',
          400: '#b3d9ff',
          500: '#99ccff',
          600: '#80bfff',
          700: '#66b3ff',
          900: 'rgba(179,217,255,0.15)',
        },
      },
    },
  },
  plugins: [],
};
