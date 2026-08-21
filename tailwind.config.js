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
          50: '#f6f1fe',
          100: '#ece1fd',
          200: '#dcc7fa',
          300: '#c39ff6',
          400: '#a772f0',
          500: '#8e4ae9',
          600: '#7839e6',
          700: '#6725d6',
          800: '#551eb5',
          900: '#461993',
          950: '#2a0c60',
        },
        indigo: {
          50: '#f6f1fe',
          100: '#ece1fd',
          200: '#dcc7fa',
          300: '#c39ff6',
          400: '#a772f0',
          500: '#8e4ae9',
          600: '#7839e6',
          700: '#6725d6',
          800: '#551eb5',
          900: '#461993',
          950: '#2a0c60',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'floating': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
}
