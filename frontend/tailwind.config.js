/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          500: '#4f7cff',
          600: '#3f66e8',
          700: '#3353c8',
        },
      },
      boxShadow: {
        glow: '0 20px 60px rgba(63, 102, 232, 0.24)',
      },
    },
  },
  plugins: [],
};
