/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: '#008080',
          50: '#e6f2f2',
          100: '#cce5e5',
          600: '#008080',
          700: '#006666',
          800: '#004d4d',
        },
        navy: {
          DEFAULT: '#0b1c30',
          900: '#0b1c30',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
