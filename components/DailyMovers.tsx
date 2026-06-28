'use client'

import { useEffect, useState } from 'react'

const FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Spain: '🇪🇸', Argentina: '🇦🇷',
  Germany: '🇩🇪', Morocco: '🇲🇦', USA: '🇺🇸', Norway: '🇳🇴', Japan: '🇯🇵',
  Portugal: '🇵🇹', Netherlands: '🇳🇱', Mexico: '🇲🇽', Colombia: '🇨🇴', Uruguay: '🇺🇾',
  Belgium: '🇧🇪', Croatia: '🇭🇷', Switzerland: '🇨🇭', Australia: '🇦🇺',
}

interface Mover { team: string; today: number; yesterday: number; change: number; direction: string }

export default function DailyMovers() {
  const [movers, setMovers] = useState<Mover[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/history/movers')
      .then(r => r.json())
      .then(d => { setMovers(d.movers || []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  if (!loaded) return null

  return (
    <section className="bg-card border border-border rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h2 className="font-display text-xl tracking-widest text-text-primary">BIGGEST MOVERS</h2>
        <p className="font-mono-data text-xs text-text-muted mt-0.5">
          Biggest win probability changes in 24 hours
        </p>
      </div>
      <div className="px-5 py-4">
        {movers.length < 2 ? (
          <p className="font-mono-data text-xs text-text-muted">
            Check back tomorrow to see daily changes
          </p>
        ) : (
          <div className="space-y-2">
            {movers.map(m => (
              <div key={m.team} className="flex items-center justify-between">
                <span className="font-body text-sm text-text-primary">
                  {FLAGS[m.team] ?? '🏳'} {m.team}
                </span>
                <span
                  className="font-mono-data text-sm font-medium"
                  style={{ color: m.direction === 'up' ? '#1D9E75' : '#D85A30' }}
                >
                  {m.direction === 'up' ? '+' : ''}
                  {(m.change * 100).toFixed(1)}% {m.direction === 'up' ? '↑' : '↓'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
