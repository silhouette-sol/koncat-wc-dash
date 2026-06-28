import { Upset } from '@/lib/types'

interface BiggestUpsetsProps {
  upsets: Upset[]
}

export default function BiggestUpsets({ upsets }: BiggestUpsetsProps) {
  const top8 = upsets.slice(0, 8)
  const maxSurprise = Math.max(...top8.map(u => u.surprise_score))

  return (
    <section className="bg-card border border-border/30 rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border/30 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl tracking-widest text-text-primary">
            BIGGEST UPSETS SO FAR
          </h2>
          <p className="font-mono-data text-xs text-text-muted mt-0.5">
            Ranked by Elo surprise score
          </p>
        </div>
        <span className="font-mono-data text-xs text-text-muted">Top 8</span>
      </div>

      <div className="divide-y divide-border/20">
        {top8.map((upset, i) => {
          const barPct = maxSurprise > 0 ? (upset.surprise_score / maxSurprise) * 100 : 0
          return (
            <div key={`${upset.match}-${upset.date}`} className="px-5 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-3">
                  <span className="font-mono-data text-xs text-text-muted w-4 shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-body text-sm font-medium text-text-primary leading-tight">
                      {upset.match}
                    </p>
                    <p className="font-mono-data text-[10px] text-text-muted">
                      {upset.result}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-display text-base text-text-primary tracking-wide">
                    {upset.score}
                  </span>
                  <span className="font-mono-data text-xs text-coral font-medium w-12 text-right">
                    {(upset.surprise_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="ml-7 w-full h-1.5 bg-border/20 rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm transition-all"
                  style={{ width: `${barPct}%`, backgroundColor: '#D85A30' }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="px-5 py-2.5 border-t border-border/20">
        <p className="font-mono-data text-[10px] text-text-muted">
          Surprise score measures how unlikely a result was based on pre-match ratings. 1.0 = completely unexpected.
        </p>
      </div>
    </section>
  )
}
