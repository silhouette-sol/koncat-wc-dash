import { SmallestNation } from '@/lib/types'

interface SmallestNationsProps {
  nations: SmallestNation[]
}

const FUN_COMPARISONS: Record<string, string> = {
  Croatia: 'roughly the population of Los Angeles',
  Norway: 'fewer people than the greater Bay Area',
  Switzerland: 'about the size of New York City metro',
  Austria: 'similar population to New York City proper',
  Portugal: 'smaller than the state of Ohio',
  Belgium: 'about the size of the greater LA metro',
}

export default function SmallestNations({ nations }: SmallestNationsProps) {
  const sorted = [...nations].sort((a, b) => a.population_millions - b.population_millions)
  const smallest = sorted[0]

  return (
    <section className="bg-card border border-border rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl tracking-widest text-text-primary">
            SMALLEST NATIONS STILL WITH A SHOT
          </h2>
          <p className="font-mono-data text-xs text-text-muted mt-0.5">
            Population vs tournament win probability
          </p>
        </div>
        <span className="font-mono-data text-xs text-text-muted">{sorted.length} teams</span>
      </div>

      <div className="divide-y divide-border/40">
        {sorted.map((nation) => {
          const comparison = FUN_COMPARISONS[nation.team]
          const isSmallest = nation.team === smallest.team
          return (
            <div key={nation.team} className="px-5 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  {isSmallest && (
                    <span className="font-mono-data text-[9px] text-teal border border-teal/50 px-1 py-0.5 rounded-sm leading-tight shrink-0 mt-0.5">
                      smallest
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="font-body text-sm font-medium text-text-primary">
                      {nation.team}
                    </p>
                    {comparison && (
                      <p className="font-mono-data text-[10px] text-text-muted mt-0.5">
                        {nation.population_millions}M people — {comparison}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-lg text-accent leading-tight tracking-wide">
                    {(nation.win_prob * 100).toFixed(1)}%
                  </p>
                  <p className="font-mono-data text-[10px] text-text-muted">win prob</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="px-5 py-2.5 border-t border-border/40" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <p className="font-mono-data text-[10px] text-text-muted">
          Uruguay won in 1930 and 1950 with just 1.7M people — small nations have done it before.
        </p>
      </div>
    </section>
  )
}
