'use client'

import React, { useState } from 'react'
import { TeamComparison } from '@/lib/types'
import DivergenceBar from './DivergenceBar'
import InfoTooltip from './InfoTooltip'

interface ProbabilityTableProps {
  teams: TeamComparison[]
  squadValues: Record<string, number>
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
              100K simulations
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
                <strong className="text-text-primary">Model %</strong> = how often this team wins across 100,000 simulated tournaments using{' '}
                <a href="https://en.wikipedia.org/wiki/Elo_rating_system" target="_blank" rel="noopener noreferrer" className="underline hover:text-text-primary">Elo ratings</a>.
              </p>
              <p className="font-body text-xs text-text-muted leading-relaxed">
                <strong className="text-text-primary">Consensus %</strong> = aggregated probability estimate from external prediction sources — useful context for comparing against the model.
              </p>
              <p className="font-body text-xs text-text-muted leading-relaxed">
                The Divergence bar shows how far the model and consensus differ. A large gap means the model sees this team differently than the broader consensus does.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <table style={{ minWidth: 600, width: '100%' }}>
          <thead>
            <tr className="border-b border-border/30">
              <th className="text-left py-2 px-4 font-mono-data text-[10px] text-text-muted uppercase tracking-widest w-8">#</th>
              <th className="text-left py-2 px-4 font-mono-data text-[10px] text-text-muted uppercase tracking-widest">Team</th>
              <th className="text-right py-2 px-4 font-mono-data text-[10px] uppercase tracking-widest">
                <span className="inline-flex items-center gap-0.5">
                  <a href="https://en.wikipedia.org/wiki/Elo_rating_system" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-text-primary transition-colors underline">
                    Elo
                  </a>
                  <InfoTooltip
                    term="Elo Rating"
                    definition="A numerical rating reflecting a team's historical strength and recent form. Higher = stronger. Used to calculate win probability for each match."
                    link="https://en.wikipedia.org/wiki/Elo_rating_system"
                  />
                </span>
              </th>
              <th className="text-right py-2 px-4 font-mono-data text-[10px] text-text-muted uppercase tracking-widest">
                <span className="inline-flex items-center gap-0.5">
                  Model%
                  <InfoTooltip
                    term="Model %"
                    definition="How often this team wins the tournament across 100,000 Monte Carlo simulations. Each run uses Elo ratings to determine each match outcome."
                    link="https://en.wikipedia.org/wiki/Monte_Carlo_method"
                  />
                </span>
              </th>
              <th className="text-center py-2 px-6 font-mono-data text-[10px] text-text-muted uppercase tracking-widest w-48">Divergence</th>
              <th className="text-right py-2 px-4 font-mono-data text-[10px] text-text-muted uppercase tracking-widest">
                <span className="inline-flex items-center gap-0.5">
                  Consensus%
                  <InfoTooltip
                    term="Consensus %"
                    definition="Aggregated probability estimate from external prediction sources. Useful for comparing against what the model sees — not the model's own output."
                  />
                </span>
              </th>
              <th className="text-right py-2 px-4 font-mono-data text-[10px] text-text-muted uppercase tracking-widest">Squad €</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((team, i) => {
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
