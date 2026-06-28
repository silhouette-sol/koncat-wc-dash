'use client'

import { useEffect, useRef } from 'react'
import { TeamComparison } from '@/lib/types'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { Chart: any }
}

const NATIONAL_COLORS: Record<string, string> = {
  France: '#002395',
  England: '#CF081F',
  Spain: '#AA151B',
  Brazil: '#009C3B',
  Argentina: '#74ACDF',
  Germany: '#2D2D2D',
  Netherlands: '#FF6600',
  Portugal: '#006600',
  Norway: '#EF2B2D',
  Morocco: '#C1272D',
  USA: '#002868',
  Japan: '#BC002D',
  Mexico: '#006847',
  Colombia: '#FCD116',
  Uruguay: '#5EB6E4',
  Belgium: '#EF3340',
}

const FLAGS: Record<string, string> = {
  France: '🇫🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Spain: '🇪🇸', Brazil: '🇧🇷', Argentina: '🇦🇷',
  Germany: '🇩🇪', Netherlands: '🇳🇱', Portugal: '🇵🇹', Norway: '🇳🇴', Morocco: '🇲🇦',
  USA: '🇺🇸', Japan: '🇯🇵', Mexico: '🇲🇽', Colombia: '🇨🇴', Uruguay: '🇺🇾',
  Belgium: '🇧🇪', Switzerland: '🇨🇭', Croatia: '🇭🇷', Senegal: '🇸🇳',
}

interface WinProbDoughnutProps {
  teams: TeamComparison[]
}

export default function WinProbDoughnut({ teams }: WinProbDoughnutProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null)

  const top10 = teams
    .filter(t => t.elo_win_prob >= 0.005)
    .sort((a, b) => b.elo_win_prob - a.elo_win_prob)
    .slice(0, 10)

  useEffect(() => {
    const initChart = () => {
      if (!canvasRef.current || !window.Chart) return
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }

      chartRef.current = new window.Chart(canvasRef.current, {
        type: 'doughnut',
        data: {
          labels: top10.map(t => t.name),
          datasets: [{
            data: top10.map(t => parseFloat((t.elo_win_prob * 100).toFixed(2))),
            backgroundColor: top10.map(t => NATIONAL_COLORS[t.name] ?? '#C4A882'),
            borderWidth: 2,
            borderColor: '#5C3D2E',
            hoverBorderColor: '#C9A027',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: { display: false },
            tooltip: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              callbacks: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label: (ctx: any) => {
                  const t = top10[ctx.dataIndex]
                  return ` ${FLAGS[t.name] ?? ''} ${t.name}, ${(t.elo_win_prob * 100).toFixed(1)}% chance to win`
                },
              },
              backgroundColor: '#0B1D3A',
              titleColor: '#F0E8D8',
              bodyColor: '#C4A882',
              borderColor: 'rgba(201,160,39,0.4)',
              borderWidth: 1,
              padding: 10,
            },
          },
        },
      })
    }

    if (window.Chart) {
      initChart()
    } else {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
      script.onload = initChart
      document.head.appendChild(script)
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="bg-card border border-border/30 rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border/30">
        <h2 className="font-display text-xl tracking-widest text-text-primary">
          MODEL WIN PROBABILITY
        </h2>
        <p className="font-mono-data text-xs text-text-muted mt-0.5">
          How likely is each team to win the tournament based on 10,000 simulated tournaments using{' '}
          <a
            href="https://en.wikipedia.org/wiki/Elo_rating_system"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-text-primary transition-colors"
          >
            Elo ratings
          </a>
        </p>
      </div>

      <div className="px-5 py-5 flex flex-col lg:flex-row items-center gap-6">
        <div style={{ height: 320, width: 320, position: 'relative', flexShrink: 0 }}>
          <canvas ref={canvasRef} />
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-2 w-full">
          {top10.map(team => (
            <div key={team.name} className="flex items-center gap-2.5">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: NATIONAL_COLORS[team.name] ?? '#C4A882' }}
              />
              <span className="font-mono-data text-xs text-text-muted mr-1">
                {FLAGS[team.name] ?? ''}
              </span>
              <span className="font-body text-sm text-text-primary flex-1">
                {team.name}
              </span>
              <span className="font-mono-data text-sm font-medium text-text-primary ml-auto">
                {(team.elo_win_prob * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
