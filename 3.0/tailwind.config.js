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
          50: '#f5f0ff',
          100: '#ebe2fe',
          200: '#dac8fc',
          300: '#bfa2f9',
          400: '#a073f4',
          500: '#874def',
          600: '#7839e6', // Electric Royal Violet / Iris (#7839e6)
          700: '#6625d0',
          800: '#541ea9',
          900: '#461b89',
          950: '#2a0c5c',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
      },
      borderRadius: {
        'card': '12px',
        'control': '8px',
        'modal': '14px',
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 4px 12px -2px rgba(120, 57, 230, 0.12), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'floating': '0 12px 30px -4px rgba(120, 57, 230, 0.16), 0 4px 12px -2px rgba(0, 0, 0, 0.06)',
      }
    },
  },
  plugins: [],
}
