import { EloMover } from '@/lib/types'
import { filterRealTeams } from '@/lib/utils'

interface EloMoversProps {
  movers: EloMover[]
}

export default function EloMovers({ movers }: EloMoversProps) {
  const realMovers = filterRealTeams(movers)
  const risers = realMovers.filter((m) => m.direction === 'up').slice(0, 6)
  const fallers = realMovers
    .filter((m) => m.direction === 'down')
    .sort((a, b) => a.change - b.change)
    .slice(0, 6)

  return (
    <section className="bg-card border border-border rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h2 className="font-display text-xl tracking-widest text-text-primary">
          HOT &amp; COLD
        </h2>
        <p className="font-mono-data text-xs text-text-muted mt-0.5">
          Which teams are exceeding expectations and which are struggling
        </p>
        <p className="font-mono-data text-[10px] text-text-muted mt-1 leading-snug">
          Based on results vs pre-tournament expectations — a team climbing means they&apos;re outperforming what the model predicted
        </p>
      </div>

      <div className="grid grid-cols-2 divide-x divide-border/40">
        <div className="px-4 py-3">
          <p className="font-mono-data text-[10px] text-teal uppercase tracking-widest mb-2">
            Heating Up 🔥
          </p>
          <div className="space-y-2">
            {risers.map((m) => (
              <div key={m.team} className="flex items-center justify-between">
                <span className="font-body text-xs text-text-primary">
                  {m.team}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono-data text-[10px] text-text-muted">
                    {m.pre_wc} → {m.current}
                  </span>
                  <span className="font-mono-data text-xs font-medium text-teal">
                    +{m.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 py-3">
          <p className="font-mono-data text-[10px] text-coral uppercase tracking-widest mb-2">
            Cooling Down 🧊
          </p>
          <div className="space-y-2">
            {fallers.map((m) => (
              <div key={m.team} className="flex items-center justify-between">
                <span className="font-body text-xs text-text-primary">
                  {m.team}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono-data text-[10px] text-text-muted">
                    {m.pre_wc} → {m.current}
                  </span>
                  <span className="font-mono-data text-xs font-medium text-coral">
                    {m.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
