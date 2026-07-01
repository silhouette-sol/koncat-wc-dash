'use client'

import { useEffect, useState } from 'react'

interface Prediction {
  match: string
  date: string
  predicted_winner: string
  actual_winner: string
  predicted_prob: number
  correct: boolean
}

interface AccuracyTrackerProps {
  showFullExplanation?: boolean
}

export default function AccuracyTracker({ showFullExplanation }: AccuracyTrackerProps) {
  const [preds, setPreds] = useState<Prediction[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/predictions')
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        setPreds(Array.isArray(data) ? data : [])
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  if (!loaded || preds.length === 0) return null

  const correct = preds.filter(p => p.correct).length
  const total = preds.length
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0
  const last5 = [...preds].reverse().slice(0, 5)

  return (
    <section className="bg-card border border-border/30 rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border/30">
        <h2 className="font-display text-xl tracking-widest text-text-primary">MODEL ACCURACY</h2>
        <p className="font-mono-data text-xs text-text-muted mt-0.5">
          Before each match the model picks a winner based on{' '}
          <a
            href="https://en.wikipedia.org/wiki/Elo_rating_system"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-text-primary transition-colors"
          >
            Elo ratings
          </a>
          . After the match we check if it was right.{' '}
          {pct}% means it called {correct} of {total} matches correctly.
        </p>
      </div>
      <div className="px-5 py-4 space-y-4">
        <div className="flex items-end gap-4">
          <p className="font-display text-5xl text-text-primary leading-none">
            {correct}/{total}
          </p>
          <p className="font-display text-3xl leading-none pb-1" style={{ color: '#e3c27e' }}>{pct}%</p>
          <p className="font-mono-data text-xs text-text-muted pb-1">correct</p>
        </div>
        <div className="h-2 rounded-sm overflow-hidden flex">
          <div className="h-full" style={{ width: `${pct}%`, backgroundColor: '#1D9E75' }} />
          <div className="h-full flex-1" style={{ backgroundColor: '#D85A30', opacity: 0.5 }} />
        </div>

        {showFullExplanation && (
          <div className="border-t border-border/20 pt-4 space-y-2">
            <p className="font-mono-data text-[10px] uppercase tracking-widest" style={{ color: '#e3c27e' }}>
              HOW THIS WORKS
            </p>
            <p className="font-body text-sm text-text-muted leading-relaxed">
              Before every match, the model predicts a winner based on each team&apos;s{' '}
              <a href="https://en.wikipedia.org/wiki/Elo_rating_system" target="_blank" rel="noopener noreferrer" className="underline hover:text-text-primary transition-colors">
                Elo rating
              </a>
              , a number that captures historical strength and recent form. The team with the higher probability is the model&apos;s prediction.
            </p>
            <p className="font-body text-sm text-text-muted leading-relaxed">
              After the match we check: did the predicted team win? A draw or underdog win counts as incorrect.
            </p>
            <p className="font-body text-sm text-text-muted leading-relaxed">
              {pct}% accuracy means the model called {correct} of {total} matches correctly. A random coin flip would get 50%. Professional sports prediction models typically achieve 60-70% on football.
            </p>
            <p className="font-body text-sm text-text-muted leading-relaxed">
              <a href="https://en.wikipedia.org/wiki/Elo_rating_system" target="_blank" rel="noopener noreferrer" className="underline hover:text-text-primary transition-colors">
                Read about Elo ratings on Wikipedia
              </a>{' '}to go deeper.
            </p>
          </div>
        )}

        {!showFullExplanation && (
          <div className="space-y-1">
            <p className="font-mono-data text-[10px] text-text-muted uppercase tracking-widest mb-2">
              Last 5 predictions
            </p>
            {last5.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="font-body text-text-muted truncate max-w-[200px]">{p.match}</span>
                <span className="font-mono-data" style={{ color: p.correct ? '#1D9E75' : '#D85A30' }}>
                  {p.correct ? '✓' : '✗'} {p.actual_winner}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
