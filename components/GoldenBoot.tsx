import { GoldenBootEntry } from '@/lib/types'
import { getFlag } from '@/lib/flags'

interface GoldenBootProps {
  entries: GoldenBootEntry[]
}

export default function GoldenBoot({ entries }: GoldenBootProps) {
  const top5 = entries.slice(0, 5)
  const maxGoals = top5[0]?.goals ?? 1

  return (
    <section className="bg-card border border-border/30 rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border/30">
        <h2 className="font-display text-xl tracking-widest text-text-primary">
          GOLDEN BOOT{' '}
          <a
            href="https://en.wikipedia.org/wiki/FIFA_World_Cup_Golden_Boot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block align-middle font-mono-data text-[10px] text-text-muted hover:text-text-primary border border-border/40 px-1.5 py-0.5 rounded-sm transition-colors"
            title="What is the Golden Boot?"
          >
            ?
          </a>
        </h2>
        <p className="font-mono-data text-xs text-text-muted mt-0.5">
          Top scorers · Group stage
        </p>
      </div>

      <div className="divide-y divide-border/20">
        {top5.map((entry, i) => {
          const barWidth = (entry.goals / maxGoals) * 100
          return (
            <div key={entry.player} className="px-5 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono-data text-xs text-text-muted w-4">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-body text-sm font-medium text-text-primary leading-tight">
                      {entry.player}
                    </p>
                    <p className="font-mono-data text-[10px] text-text-muted">
                      {getFlag(entry.team)} {entry.team}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-display text-2xl text-accent leading-none">
                    {entry.goals}
                  </span>
                  <p className="font-mono-data text-[10px] text-text-muted">
                    {entry.matches_scored_in}G
                  </p>
                </div>
              </div>
              <div className="w-full h-1 bg-border/20 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${barWidth}%`, backgroundColor: '#e3c27e' }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
