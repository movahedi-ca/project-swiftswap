/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Georgia', '"Times New Roman"', 'serif'],
      },
    },
  },
  plugins: [],
};
