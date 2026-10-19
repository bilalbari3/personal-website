/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Calm clinical palette. All text pairings checked for WCAG AA on their backgrounds.
        brand: {
          50: '#effaf8',
          100: '#d6f1ec',
          200: '#ade2d9',
          300: '#7ccbbf',
          400: '#4aa99c',
          500: '#2f8b80',
          600: '#226f67', // primary buttons (white text 5.9:1)
          700: '#1d5a54',
          800: '#1a4844',
          900: '#163b38',
        },
        ink: {
          DEFAULT: '#1f2933',
          soft: '#3e4c59',
          muted: '#52606d',
        },
        canvas: '#f7f6f2',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        base: ['1.0625rem', '1.6'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
};
