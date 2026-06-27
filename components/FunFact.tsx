import { HistoricalPattern } from '@/lib/types'

interface FunFactProps {
  patterns: HistoricalPattern[]
}

export default function FunFact({ patterns }: FunFactProps) {
  return (
    <section className="bg-card border border-border rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h2 className="font-display text-xl tracking-widest text-text-primary">
          FUN FACTS
        </h2>
        <p className="font-mono-data text-xs text-text-muted mt-0.5">
          Historical patterns from World Cup data since 1930
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-px bg-border/30 min-w-max">
          {patterns.map((pattern) => (
            <div
              key={pattern.id}
              className="bg-card border-l-4 border-accent px-5 py-4 min-w-[260px] max-w-[320px]"
            >
              <p className="font-body text-sm text-text-primary leading-snug">
                {pattern.display}
              </p>
              {pattern.detail && (
                <p className="font-mono-data text-[10px] text-text-muted mt-1.5">
                  {pattern.detail.join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
