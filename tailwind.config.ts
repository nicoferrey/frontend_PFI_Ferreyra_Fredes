import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        soil: {
          50: '#f6f5ef',
          100: '#ece9dd',
          200: '#d6cfb7',
          300: '#b7aa82',
          400: '#9d8b63',
          500: '#7f6f4a',
          600: '#655939',
          700: '#4d432d',
          800: '#363024',
          900: '#231f19',
        },
        crop: {
          50: '#effaf0',
          100: '#d9f2de',
          200: '#b3e2bd',
          300: '#85cb92',
          400: '#5fb46d',
          500: '#3f9d4f',
          600: '#328141',
          700: '#286635',
          800: '#1f4d29',
          900: '#14341b',
        },
        water: {
          50: '#eef8ff',
          100: '#d7efff',
          200: '#b2ddff',
          300: '#7cc5ff',
          400: '#44a7ff',
          500: '#1586f4',
          600: '#0f68cf',
          700: '#0f52a5',
          800: '#11447e',
          900: '#123962',
        },
      },
      boxShadow: {
        soft: '0 24px 80px rgba(15, 23, 42, 0.12)',
      },
      backgroundImage: {
        'grid-fade': 'radial-gradient(circle at top, rgba(255,255,255,0.14), transparent 55%), linear-gradient(180deg, rgba(12, 17, 29, 0.96), rgba(10, 14, 23, 1))',
      },
    },
  },
  plugins: [],
};

export default config;