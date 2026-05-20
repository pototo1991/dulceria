/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.html",
    "./public/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        'dulce-pink': '#FF7E9F', // Rosa chicle del logo
        'dulce-cyan': '#00D2C4', // Turquesa neón del logo
        'dulce-coral': '#FF8680', // Coral/salmón del logo
        'dulce-bg': '#FFE6ED'    // Rosa suave de fondo
      },
      fontFamily: {
        'sans': ['Inter', 'sans-serif'],
        'display': ['Outfit', 'sans-serif'],
        'vintage': ['"Pacifico"', 'cursive']
      },
      animation: {
        'float': 'float 4s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s infinite alternate',
        'bg-drift': 'bg-drift 15s ease infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glow-pulse': {
          '0%': { 'text-shadow': '0 0 8px rgba(255,255,255,0.8), 0 0 15px rgba(0,210,196,0.3)' },
          '100%': { 'text-shadow': '0 0 18px rgba(255,255,255,1), 0 0 30px rgba(0,210,196,0.7)' },
        },
        'bg-drift': {
          '0%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
          '100%': { 'background-position': '0% 50%' },
        }
      }
    },
  },
  plugins: [],
}
