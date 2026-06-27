import { GoldenBootEntry } from '@/lib/types'

interface GoldenBootProps {
  entries: GoldenBootEntry[]
}

export default function GoldenBoot({ entries }: GoldenBootProps) {
  const top5 = entries.slice(0, 5)
  const maxGoals = top5[0]?.goals ?? 1

  return (
    <section className="bg-card border border-border rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h2 className="font-display text-xl tracking-widest text-text-primary">
          GOLDEN BOOT
        </h2>
        <p className="font-mono-data text-xs text-text-muted mt-0.5">
          Top scorers · Group stage
        </p>
      </div>

      <div className="divide-y divide-border/40">
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
                      {entry.team}
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
              <div className="w-full h-1 bg-border/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
