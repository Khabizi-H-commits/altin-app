/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink:     'oklch(0.20 0.025 250)',
        primary: { DEFAULT: 'oklch(0.31 0.07 250)', soft: 'oklch(0.95 0.018 250)' },
        accent:  { DEFAULT: 'oklch(0.62 0.13 55)',  soft: 'oklch(0.95 0.04 65)' },
        paper:   { DEFAULT: 'oklch(0.99 0.005 80)', '2': 'oklch(0.965 0.008 80)' },
        muted:   'oklch(0.55 0.015 250)',
      },
      fontFamily: {
        display: ['Poppins', 'sans-serif'],
        body:    ['Poppins', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        xs: '6px',
        sm: '10px',
        md: '14px',
        lg: '20px',
      },
    },
  },
  plugins: [],
}
