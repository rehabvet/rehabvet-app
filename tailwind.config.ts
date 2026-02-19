import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: '#D6336C',
          'pink-light': '#F06595',
          'pink-dark': '#A61E4D',
          gold: '#F59F00',
          'gold-light': '#FFD43B',
          'gold-dark': '#E67700',
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
