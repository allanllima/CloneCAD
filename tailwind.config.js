/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cad: {
          bg: '#1b1e23',
          canvas: '#21252b',
          ribbon: '#282c34',
          panel: '#21252b',
          border: '#3a3f4b',
          hover: '#353b45',
          active: '#404754',
          accent: '#007acc',
          text: '#abb2bf',
          textBright: '#e5e9f0',
          console: '#181a1f',
          status: '#21252b',
          selectionBlue: 'rgba(0, 122, 204, 0.25)',
          selectionGreen: 'rgba(46, 204, 113, 0.25)'
        }
      },
      fontFamily: {
        cad: ['Consolas', 'Courier New', 'monospace', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
