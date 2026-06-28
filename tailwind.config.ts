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
        bg: '#0B1D3A',
        card: '#5C3D2E',
        border: '#C9A027',
        accent: '#D4622A',
        gold: '#C9A027',
        teal: '#1D9E75',
        coral: '#D85A30',
        'text-primary': '#F0E8D8',
        'text-muted': '#C4A882',
        ink: '#0B1D3A',
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
