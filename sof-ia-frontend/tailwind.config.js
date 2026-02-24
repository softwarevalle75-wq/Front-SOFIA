/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Colores universitarios
        university: {
          yellow: '#C9A227',
          'yellow-light': '#D4B44A',
          'yellow-dark': '#A88B1F',
          indigo: '#1A1F71',
          'indigo-dark': '#2E2A78',
          'indigo-light': '#4A55A8',
        },
        // Actualizar primary para que use azul índigo universitario
        primary: {
          50: '#F0F2FF',
          100: '#E0E5FF',
          200: '#C2CCFF',
          300: '#A3B3FF',
          400: '#8599FF',
          500: '#1A1F71',
          600: '#161A5C',
          700: '#121547',
          800: '#0E0F32',
          900: '#0A0A1E',
        },
        // Mantener colores semánticos pero ajustarlos
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
        // Grises universitarios
        gray: {
          50: '#F8F9FA',
          100: '#F4F6F9',
          200: '#E9ECEF',
          300: '#DEE2E6',
          400: '#CED4DA',
          500: '#6C757D',
          600: '#495057',
          700: '#343A40',
          800: '#212529',
          900: '#000000',
        }
      },
      fontFamily: {
        'poppins': ['Poppins', 'sans-serif'],
        'opensans': ['Open Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}