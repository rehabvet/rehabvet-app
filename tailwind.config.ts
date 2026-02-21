import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: '#EC6496',
          'pink-light': '#f590b5',
          'pink-dark': '#c94878',
          yellow: '#FDC61C',
          'yellow-light': '#FFD95A',
          'yellow-dark': '#E0A800',
          green: '#19BC00',
          'green-light': '#4CD137',
          'green-dark': '#128A00',
          navy: '#1a1a2e',
          'navy-light': '#2d2d44',
          dark: '#16213e',
        },
      },
    },
  },
  plugins: [],
}
export default config
