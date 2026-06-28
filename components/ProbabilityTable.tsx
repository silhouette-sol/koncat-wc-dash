'use client'

import React, { useState } from 'react'
import { TeamComparison } from '@/lib/types'
import DivergenceBar from './DivergenceBar'

interface ProbabilityTableProps {
  teams: TeamComparison[]
  squadValues: Record<string, number>
}

function parseSignal(signal: string): { label: string; color: string } {
  if (signal.includes('MODEL')) return { label: 'MODEL UP', color: '#1D9E75' }
  if (signal.includes('MARKET')) return { label: 'MARKET', color: '#D85A30' }
  return { label: 'NEUTRAL', color: '#C4A882' }
}

function formatSquadValue(val: number | null): string {
  if (val === null) return '—'
  const m = Math.round(val / 1_000_000)
  if (m >= 1000) return `€${(m / 1000).toFixed(1).replace(/\.0$/, '')}B`
  return `€${m}M`
}

function lookupSquadValue(squadValues: Record<string, number>, name: string): number | null {
  if (squadValues[name] !== undefined) return squadValues[name]
  const alt = name.replace(' & ', ' and ').replace(' and ', ' & ')
  if (squadValues[alt] !== undefined) return squadValues[alt]
  return null
}

export default function ProbabilityTable({ teams, squadValues }: ProbabilityTableProps) {
  const [explainerOpen, setExplainerOpen] = useState(false)

  const filtered = teams
    .filter(t => t.elo_win_prob >= 0.005)
    .sort((a, b) => b.elo_win_prob - a.elo_win_prob)

  return (
    <section className="bg-card border border-border/30 rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border/30">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl tracking-widest text-text-primary">WIN PROBABILITY</h2>
          <span className="font-mono-data text-xs text-text-muted">
            <a
              href="https://en.wikipedia.org/wiki/Monte_Carlo_method"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-text-primary transition-colors"
            >
              10k simulations
            </a>
          </span>
        </div>

        <div className="mt-2">
          <button
            onClick={() => setExplainerOpen(o => !o)}
            className="font-mono-data text-[10px] text-text-muted hover:text-text-primary transition-colors"
          >
            {explainerOpen ? 'Hide explanation ↑' : 'What does this mean? ↓'}
          </button>
          {explainerOpen && (
            <div className="mt-2 p-3 rounded-sm space-y-1.5" style={{ background: 'rgba(11,29,58,0.5)', border: '1px solid rgba(201,160,39,0.2)' }}>
              <p className="font-body text-xs text-text-muted leading-relaxed">
                <strong className="text-text-primary">Model %</strong> = how often this team wins across 10,000 simulated tournaments using{' '}
                <a href="https://en.wikipedia.org/wiki/Elo_rating_system" target="_blank" rel="noopener noreferrer" className="underline hover:text-text-primary">Elo ratings</a>.
              </p>
              <p className="font-body text-xs text-text-muted leading-relaxed">
                <strong className="text-text-primary">Market %</strong> = implied probability from prediction market odds.
              </p>
              <p className="font-body text-xs text-text-muted leading-relaxed">
                When they disagree significantly, that&apos;s the interesting story. Signal Favors shows which source is more bullish on that team.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/30">
              <th className="text-left py-2 px-4 font-mono-data text-[10px] text-text-muted uppercase tracking-widest w-8">#</th>
              <th className="text-left py-2 px-4 font-mono-data text-[10px] text-text-muted uppercase tracking-widest">Team</th>
              <th className="text-right py-2 px-4 font-mono-data text-[10px] uppercase tracking-widest">
                <a href="https://en.wikipedia.org/wiki/Elo_rating_system" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-text-primary transition-colors underline">
                  Elo
                </a>
              </th>
              <th className="text-right py-2 px-4 font-mono-data text-[10px] text-text-muted uppercase tracking-widest">
                <span title="Win probability from 10,000 Monte Carlo simulations" className="cursor-help">
                  Model%
                </span>
              </th>
              <th className="text-center py-2 px-6 font-mono-data text-[10px] text-text-muted uppercase tracking-widest w-48">Divergence</th>
              <th className="text-right py-2 px-4 font-mono-data text-[10px] text-text-muted uppercase tracking-widest">Market%</th>
              <th className="text-right py-2 px-4 font-mono-data text-[10px] text-text-muted uppercase tracking-widest">Squad €</th>
              <th className="text-center py-2 px-4 font-mono-data text-[10px] text-text-muted uppercase tracking-widest">Signal Favors</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((team, i) => {
              const signal = parseSignal(team.signal)
              const sqVal = lookupSquadValue(squadValues, team.name)
              return (
                <React.Fragment key={team.name}>
                  <tr className="border-b border-border/20 hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-4 font-mono-data text-xs text-text-muted">{i + 1}</td>
                    <td className="py-2.5 px-4">
                      <span className="font-body text-sm font-medium text-text-primary">{team.name}</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-data text-xs text-text-muted">{team.elo_rating}</td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="font-mono-data text-sm font-medium text-teal">
                        {(team.elo_win_prob * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-6">
                      <DivergenceBar delta={team.delta} />
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-data text-sm font-medium text-coral">
                      {team.market_win_prob !== null ? `${(team.market_win_prob * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-data text-xs text-text-muted">
                      {formatSquadValue(sqVal)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="font-mono-data text-xs font-medium" style={{ color: signal.color }}>
                        {signal.label}
                      </span>
                    </td>
                  </tr>
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
