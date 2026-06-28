'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Chart: any
  }
}

interface HistoryRow {
  snapshot_date: string
  model_win_prob: number
  market_win_prob: number | null
}

export default function ProbabilityTrend({ team }: { team: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null)
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch(`/api/history?team=${encodeURIComponent(team)}`)
      .then(r => r.json())
      .then(d => { setHistory(d.history || []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [team])

  useEffect(() => {
    if (!loaded || history.length < 2 || !canvasRef.current) return

    const init = () => {
      if (!window.Chart) return
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
      chartRef.current = new window.Chart(canvasRef.current, {
        type: 'line',
        data: {
          labels: history.map(r => r.snapshot_date),
          datasets: [
            {
              label: 'Model',
              data: history.map(r => parseFloat((r.model_win_prob * 100).toFixed(2))),
              borderColor: '#D4622A',
              backgroundColor: 'transparent',
              borderWidth: 2,
              pointRadius: 3,
              tension: 0.3,
            },
            {
              label: 'Market',
              data: history.map(r =>
                r.market_win_prob != null
                  ? parseFloat((r.market_win_prob * 100).toFixed(2))
                  : null
              ),
              borderColor: '#C4A882',
              backgroundColor: 'transparent',
              borderWidth: 1.5,
              borderDash: [4, 4],
              pointRadius: 2,
              tension: 0.3,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { mode: 'index', intersect: false },
          },
          scales: {
            x: { display: false },
            y: { display: false, min: 0 },
          },
        },
      })
    }

    if (window.Chart) {
      init()
    } else {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
      s.onload = init
      document.head.appendChild(s)
    }

    return () => {
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    }
  }, [loaded, history])

  if (!loaded) {
    return (
      <div className="h-[120px] flex items-center justify-center">
        <span className="font-mono-data text-xs text-text-muted">Loading...</span>
      </div>
    )
  }
  if (history.length < 2) {
    return (
      <div className="h-[120px] flex items-center justify-center">
        <span className="font-mono-data text-xs text-text-muted">Not enough history yet</span>
      </div>
    )
  }

  return (
    <div style={{ height: 120, position: 'relative' }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
