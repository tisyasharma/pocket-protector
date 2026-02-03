/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  safelist: [
    'text-[#FC913A]',
    'text-[#EDE574]',
    'text-[#ee6c4d]',
    'text-[#3d5a80]',
    'text-[#FF4E50]',
    'text-[#98c1d9]',
    'text-[#e0fbfc]',
    'text-[#ADB5BD]',
    'h-48',
    'h-56'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f5fa',
          100: '#dce6f0',
          200: '#b8cde0',
          300: '#8fb0cc',
          400: '#6893b5',
          500: '#3d5a80',
          600: '#354f70',
          700: '#2d4360',
          800: '#253750',
          900: '#293241',
        }
      }
    }
  },
  plugins: []
}
