'use client'

import { useState } from 'react'
import { TeamComparison, WCMatch } from '@/lib/types'
import { getFlag } from '@/lib/flags'

interface HeadToHeadProps {
  teams: TeamComparison[]
  wcMatches: WCMatch[]
}

export default function HeadToHead({ teams, wcMatches }: HeadToHeadProps) {
  const [team1, setTeam1] = useState('')
  const [team2, setTeam2] = useState('')
  const [result, setResult] = useState<{ p1: number; p2: number; analysis: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasError, setHasError] = useState(false)

  const allTeamNames = Array.from(new Set([
    ...wcMatches.map(m => m.team1),
    ...wcMatches.map(m => m.team2),
  ]))
    .filter(name => !/^[WL]\d+$/.test(name))
    .sort()

  function getElo(name: string): number {
    return teams.find(t => t.name === name)?.elo_rating ?? 1500
  }

  async function simulate() {
    if (!team1 || !team2 || team1 === team2) return
    const eloA = getElo(team1)
    const eloB = getElo(team2)
    const p1 = 1 / (1 + Math.pow(10, (eloB - eloA) / 400))
    const p2 = 1 - p1
    setLoading(true)
    setHasError(false)
    setResult(null)
    try {
      const res = await fetch('/api/headtohead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team1, team2, team1_prob: p1, team2_prob: p2 }),
      })
      const data = await res.json()
      setResult({ p1, p2, analysis: data.analysis || '' })
    } catch {
      setHasError(true)
      setResult({ p1, p2, analysis: '' })
    } finally {
      setLoading(false)
    }
  }

  const canSimulate = team1 && team2 && team1 !== team2

  return (
    <section className="bg-card border border-border rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h2 className="font-display text-xl tracking-widest text-text-primary">HEAD TO HEAD</h2>
        <p className="font-mono-data text-xs text-text-muted mt-0.5">Elo-based matchup simulator</p>
      </div>
      <div className="px-5 py-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          <select
            value={team1}
            onChange={e => setTeam1(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#f3ede0', fontFamily: 'var(--font-dm-sans)', fontSize: 14, padding: '0 12px', borderRadius: 8, minHeight: 44, width: '100%' }}
          >
            <option value="">Select team...</option>
            {allTeamNames.map(name => (
              <option key={name} value={name}>
                {getFlag(name)} {name}
              </option>
            ))}
          </select>
          <span className="font-display text-xl shrink-0" style={{ color: '#e3c27e' }}>VS</span>
          <select
            value={team2}
            onChange={e => setTeam2(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#f3ede0', fontFamily: 'var(--font-dm-sans)', fontSize: 14, padding: '0 12px', borderRadius: 8, minHeight: 44, width: '100%' }}
          >
            <option value="">Select team...</option>
            {allTeamNames.map(name => (
              <option key={name} value={name}>
                {getFlag(name)} {name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={simulate}
          disabled={!canSimulate || loading}
          className="w-full font-display text-sm tracking-widest transition-colors min-h-[44px]"
          style={{
            background: !canSimulate || loading ? 'rgba(255,255,255,0.06)' : '#e3c27e',
            color: '#f3ede0',
            opacity: !canSimulate ? 0.5 : 1,
          }}
        >
          {loading ? 'Simulating matchup...' : 'Simulate matchup ↗'}
        </button>
        {result && (
          <div className="space-y-3">
            <div className="flex justify-between font-body text-sm text-text-primary">
              <span>
                {getFlag(team1)} {team1} · {(result.p1 * 100).toFixed(1)}% to win
              </span>
              <span>
                {(result.p2 * 100).toFixed(1)}% to win · {getFlag(team2)} {team2}
              </span>
            </div>
            <div className="h-3 rounded-sm overflow-hidden flex">
              <div style={{ width: `${result.p1 * 100}%`, backgroundColor: '#e3c27e' }} />
              <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />
            </div>
            {result.analysis && (
              <p className="font-body text-sm text-text-muted italic leading-relaxed">
                {result.analysis}
              </p>
            )}
            {hasError && (
              <p className="font-mono-data text-xs" style={{ color: '#D85A30' }}>
                Analysis unavailable
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
