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

export default function AccuracyTracker() {
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
    <section className="bg-card border border-border rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h2 className="font-display text-xl tracking-widest text-text-primary">MODEL ACCURACY</h2>
        <p className="font-mono-data text-xs text-text-muted mt-0.5">
          How well predictions matched results
        </p>
      </div>
      <div className="px-5 py-4 space-y-4">
        <div className="flex items-end gap-4">
          <p className="font-display text-5xl text-text-primary leading-none">
            {correct}/{total}
          </p>
          <p className="font-display text-3xl text-accent leading-none pb-1">{pct}%</p>
          <p className="font-mono-data text-xs text-text-muted pb-1">correct</p>
        </div>
        <div className="h-2 rounded-sm overflow-hidden flex">
          <div className="h-full" style={{ width: `${pct}%`, backgroundColor: '#1D9E75' }} />
          <div className="h-full flex-1" style={{ backgroundColor: '#D85A30', opacity: 0.5 }} />
        </div>
        <div className="space-y-1">
          <p className="font-mono-data text-[10px] text-text-muted uppercase tracking-widest mb-2">
            Last 5 predictions
          </p>
          {last5.map((p, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="font-body text-text-muted truncate max-w-[200px]">{p.match}</span>
              <span
                className="font-mono-data"
                style={{ color: p.correct ? '#1D9E75' : '#D85A30' }}
              >
                {p.correct ? '✓' : '✗'} {p.actual_winner}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
