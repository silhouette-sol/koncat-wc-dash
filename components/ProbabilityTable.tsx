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

const PATH_CONFIG = {
  easy:   { emoji: '🟢', label: 'Easy',   color: '#1D9E75' },
  medium: { emoji: '🟡', label: 'Medium', color: '#C4A882' },
  hard:   { emoji: '🔴', label: 'Hard',   color: '#D85A30' },
} as const

function PathBadge({ team }: { team: TeamComparison }) {
  const d = team.path_difficulty
  if (!d) return <span className="font-mono-data text-xs text-text-muted">—</span>

  const cfg = PATH_CONFIG[d]
  const tooltipLines = [
    `Avg potential opponent Elo: ${team.avg_potential_opp_elo ?? '—'}`,
    team.path_note ?? '',
  ].filter(Boolean)

  return (
    <div className="relative group inline-flex">
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-mono-data text-[10px] font-medium cursor-default"
        style={{ backgroundColor: `${cfg.color}22`, color: cfg.color, border: `1px solid ${cfg.color}44` }}
      >
        {cfg.emoji} {cfg.label}
      </span>
      <div
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 pointer-events-none
                   opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        style={{ minWidth: 220 }}
      >
        <div
          className="rounded-sm px-3 py-2 text-left shadow-lg"
          style={{ background: '#0B1D3A', border: '1px solid rgba(201,160,39,0.4)' }}
        >
          {tooltipLines.map((line, i) => (
            <p key={i} className="font-mono-data text-[10px] text-text-muted leading-snug whitespace-nowrap">
              {line}
            </p>
          ))}
        </div>
        <div className="flex justify-center">
          <div
            className="w-0 h-0"
            style={{
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid rgba(201,160,39,0.4)',
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default function ProbabilityTable({ teams, squadValues }: ProbabilityTableProps) {
  const [explainerOpen, setExplainerOpen] = useState(false)

  const filtered = teams
    .filter(t => t.elo_win_prob >= 0.005)
    .sort((a, b) => b.elo_win_prob - a.elo_win_prob)

  const hasPathData = filtered.some(t => t.path_difficulty !== null && t.path_difficulty !== undefined)

  return (
    <section className="bg-card border border-border/30 rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl tracking-widest text-text-primary">WIN PROBABILITY</h2>
            {hasPathData && (
              <p className="font-mono-data text-[10px] text-text-muted mt-0.5">
                Path difficulty = avg Elo of potential opponents in team&apos;s bracket half
              </p>
            )}
          </div>
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
                <strong className="text-text-primary">Market %</strong> = what prediction markets imply based on real money being bet.
              </p>
              <p className="font-body text-xs text-text-muted leading-relaxed">
                When they disagree significantly, that&apos;s the interesting story. A high Signal means the model sees more value than the market does.
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
              {hasPathData && (
                <th className="text-center py-2 px-4 font-mono-data text-[10px] text-text-muted uppercase tracking-widest">Path</th>
              )}
              <th className="text-right py-2 px-4 font-mono-data text-[10px] text-text-muted uppercase tracking-widest">Squad €</th>
              <th className="text-center py-2 px-4 font-mono-data text-[10px] text-text-muted uppercase tracking-widest">Signal</th>
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
                    {hasPathData && (
                      <td className="py-2.5 px-4 text-center">
                        <PathBadge team={team} />
                      </td>
                    )}
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
