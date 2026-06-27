import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#F0E8D8',
        card: '#5C3D2E',
        border: '#D4B896',
        accent: '#D4622A',
        teal: '#1D9E75',
        coral: '#D85A30',
        'text-primary': '#F0E8D8',
        'text-muted': '#C4A882',
        ink: '#1A1512',
        'ink-muted': '#5C3D2E',
      },
      fontFamily: {
        display: ['var(--font-bebas)', 'sans-serif'],
        body: ['var(--font-dm-sans)', 'sans-serif'],
        mono: ['var(--font-dm-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
