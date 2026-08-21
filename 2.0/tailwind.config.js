/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          bg: '#F5F2E9',
          card: '#FCFAF5',
          muted: '#ECE9DF',
          border: '#DED9CC',
        },
        ink: {
          DEFAULT: '#1D2739',
          primary: '#1D2739',
          muted: '#646C78',
          border: '#2D384D',
          hover: '#253248',
        },
        chartreuse: {
          DEFAULT: '#E8EB4F',
          pale: '#E6EDBF',
        },
        status: {
          mint: {
            bg: '#DCECC3',
            text: '#3E6B2A',
          },
          blue: {
            bg: '#DCEAF0',
            text: '#276170',
          },
          sand: {
            bg: '#ECE8DC',
            text: '#6D695E',
          },
          coral: {
            bg: '#F4DDD5',
            text: '#BF503D',
            DEFAULT: '#DB594A',
          },
          peach: '#E8B98B',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
      borderRadius: {
        control: '12px',
        card: '16px',
        modal: '16px',
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(29, 39, 57, 0.04)',
        paper: '0 1px 3px 0 rgba(29, 39, 57, 0.06), 0 1px 2px -1px rgba(29, 39, 57, 0.06)',
        momentum: '0 4px 6px -1px rgba(29, 39, 57, 0.08), 0 2px 4px -2px rgba(29, 39, 57, 0.06)',
        modal: '0 20px 25px -5px rgba(29, 39, 57, 0.15), 0 8px 10px -6px rgba(29, 39, 57, 0.1)',
      },
      animation: {
        'rise-in': 'rise-in 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) both',
      },
      keyframes: {
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
