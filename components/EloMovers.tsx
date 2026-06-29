import { EloMover } from '@/lib/types'
import { filterRealTeams } from '@/lib/utils'
import { getFlag } from '@/lib/flags'

interface EloMoversProps {
  movers: EloMover[]
}

export default function EloMovers({ movers }: EloMoversProps) {
  const realMovers = filterRealTeams(movers)
  const risers = realMovers.filter(m => m.direction === 'up').slice(0, 6)
  const fallers = realMovers
    .filter(m => m.direction === 'down')
    .sort((a, b) => a.change - b.change)
    .slice(0, 6)

  return (
    <section className="bg-card border border-border/30 rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border/30">
        <h2 className="font-display text-xl tracking-widest text-text-primary">
          HOT &amp; COLD
        </h2>
        <p className="font-mono-data text-xs text-text-muted mt-0.5">
          Which teams are exceeding expectations and which are struggling
        </p>
        <p className="font-mono-data text-[10px] text-text-muted mt-1 leading-snug">
          Based on results vs pre-tournament expectations. A team climbing means they&apos;re outperforming
          what the{' '}
          <a
            href="https://en.wikipedia.org/wiki/Elo_rating_system"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-text-primary transition-colors"
          >
            Elo model
          </a>{' '}
          predicted.
        </p>
      </div>

      <div className="grid grid-cols-2 divide-x divide-border/20">
        <div className="px-4 py-3">
          <p className="font-mono-data text-[10px] text-teal uppercase tracking-widest mb-2">
            Heating Up 🔥
          </p>
          <div className="space-y-2">
            {risers.map(m => (
              <div key={m.team} className="flex items-center justify-between">
                <span className="font-body text-xs text-text-primary">{getFlag(m.team)} {m.team}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono-data text-[10px] text-text-muted">
                    {m.pre_wc} to {m.current}
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
            {fallers.map(m => (
              <div key={m.team} className="flex items-center justify-between">
                <span className="font-body text-xs text-text-primary">{getFlag(m.team)} {m.team}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono-data text-[10px] text-text-muted">
                    {m.pre_wc} to {m.current}
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
