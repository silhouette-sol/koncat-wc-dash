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
        bg:           '#07090e',
        card:         'rgba(255,255,255,0.04)',
        border:       'rgba(255,255,255,1)',   // base; use /9 for card outline, /20 for dividers
        accent:       '#e3c27e',
        gold:         '#e3c27e',
        teal:         '#1D9E75',
        coral:        '#D85A30',
        'text-primary': '#f3ede0',
        'text-muted':   'rgba(243,237,224,0.52)',
        ink:          '#07090e',
        'ink-muted':  'rgba(255,255,255,0.06)',
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
