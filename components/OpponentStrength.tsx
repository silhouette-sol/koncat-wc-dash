import { OppStrength } from '@/lib/types'

interface OpponentStrengthProps {
  oppStrength: OppStrength[]
}

export default function OpponentStrength({ oppStrength }: OpponentStrengthProps) {
  const top15 = oppStrength.slice(0, 15)
  const minElo = Math.min(...top15.map((t) => t.avg_opp_elo))
  const maxElo = Math.max(...top15.map((t) => t.avg_opp_elo))

  return (
    <section className="bg-card border border-border rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl tracking-widest text-text-primary">
            WHO HAS HAD THE TOUGHEST PATH
          </h2>
          <p className="font-mono-data text-xs text-text-muted mt-0.5">
            Average opponent Elo rating faced so far
          </p>
        </div>
        <span className="font-mono-data text-xs text-text-muted">Top 15</span>
      </div>

      <div className="divide-y divide-border/40">
        {top15.map((entry, i) => {
          const range = maxElo - minElo || 1
          const barPct = ((entry.avg_opp_elo - minElo) / range) * 70 + 30
          const isBrutal = i < 3

          return (
            <div key={entry.team} className="px-5 py-2.5">
              <div className="flex items-center gap-3">
                <span className="font-mono-data text-xs text-text-muted w-4 shrink-0">
                  {i + 1}
                </span>
                <div className="w-28 shrink-0 flex items-center gap-2">
                  <span className="font-body text-sm text-text-primary leading-tight">
                    {entry.team}
                  </span>
                  {isBrutal && (
                    <span className="font-mono-data text-[9px] text-coral border border-coral/50 px-1 rounded-sm leading-tight shrink-0">
                      brutal draw
                    </span>
                  )}
                </div>
                <div className="flex-1 h-4 bg-border/20 rounded-sm overflow-hidden">
                  <div
                    className="h-full rounded-sm transition-all"
                    style={{
                      width: `${barPct}%`,
                      backgroundColor: isBrutal ? '#D85A30' : '#1D9E75',
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 w-24 justify-end shrink-0">
                  <span className="font-mono-data text-xs font-medium text-text-primary">
                    {entry.avg_opp_elo}
                  </span>
                  <span className="font-mono-data text-[10px] text-text-muted">
                    ({entry.games}G)
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="px-5 py-2.5 border-t border-border/40">
        <p className="font-mono-data text-[10px] text-text-muted">
          Higher Elo = stronger opponents faced · bars scaled relative to this group
        </p>
      </div>
    </section>
  )
}
