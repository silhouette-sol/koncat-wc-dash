import { ColorWinData } from '@/lib/types'

interface JerseyColorsProps {
  colorWins: Record<string, ColorWinData>
}

const COLOR_META: Record<string, { label: string; swatch: string; border?: boolean }> = {
  yellow:           { label: 'Yellow',           swatch: '#F5C518' },
  white:            { label: 'White',             swatch: '#F5F5F5', border: true },
  blue:             { label: 'Blue',              swatch: '#003087' },
  blue_white:       { label: 'Blue & White',      swatch: '#4F88C6' },
  red:              { label: 'Red',               swatch: '#CC0001' },
  orange:           { label: 'Orange',            swatch: '#FF6600' },
  green:            { label: 'Green',             swatch: '#009A44' },
  sky_blue:         { label: 'Sky Blue',          swatch: '#75AADB' },
  red_white_checks: { label: 'Red/White Checks',  swatch: '#CC0001' },
  maroon:           { label: 'Maroon',            swatch: '#800020' },
}

const MAX_DOTS = 5

export default function JerseyColors({ colorWins }: JerseyColorsProps) {
  const sorted = Object.entries(colorWins).sort((a, b) => b[1].wins - a[1].wins)

  return (
    <section className="bg-card border border-border rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl tracking-widest text-text-primary">
            DOES JERSEY COLOR PREDICT THE WINNER?
          </h2>
          <p className="font-mono-data text-xs text-text-muted mt-0.5">
            World Cup wins by primary kit color · all tournaments
          </p>
        </div>
        <span className="font-mono-data text-xs text-text-muted">22 WCs</span>
      </div>

      <div className="px-5 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          {sorted.map(([key, data]) => {
            const meta = COLOR_META[key] ?? { label: key, swatch: '#888' }
            const isLeader = data.wins === 5
            const filledDots = data.wins
            const emptyDots = MAX_DOTS - filledDots

            return (
              <div key={key} className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-sm shrink-0 flex-shrink-0"
                  style={{
                    backgroundColor: meta.swatch,
                    border: meta.border ? '1px solid #D4B896' : undefined,
                  }}
                />
                <div className="w-32 shrink-0">
                  <span
                    className="font-body text-sm leading-tight"
                    style={{ color: isLeader ? '#D4622A' : '#1A1512', fontWeight: isLeader ? 600 : 400 }}
                  >
                    {meta.label}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: filledDots }).map((_, i) => (
                    <span key={`f-${i}`} className="text-accent text-base leading-none">●</span>
                  ))}
                  {Array.from({ length: emptyDots }).map((_, i) => (
                    <span key={`e-${i}`} className="text-border text-base leading-none">○</span>
                  ))}
                </div>
                <span className="font-mono-data text-[10px] text-text-muted ml-1">
                  {data.winners.length > 0 ? data.winners.join(', ') : 'never won'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="px-5 py-2.5 border-t border-border/40 bg-[#F0E8D8]/40">
        <p className="font-mono-data text-xs text-text-muted italic">
          No team in a green, orange, or maroon kit has ever won the World Cup.
        </p>
      </div>
    </section>
  )
}
