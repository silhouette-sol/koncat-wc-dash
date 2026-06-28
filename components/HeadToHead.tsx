'use client'

import { useState } from 'react'
import { TeamComparison } from '@/lib/types'

const FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Spain: '🇪🇸', Argentina: '🇦🇷',
  Germany: '🇩🇪', Morocco: '🇲🇦', USA: '🇺🇸', Norway: '🇳🇴', Japan: '🇯🇵',
  Portugal: '🇵🇹', Netherlands: '🇳🇱', Mexico: '🇲🇽', Colombia: '🇨🇴', Uruguay: '🇺🇾',
  Belgium: '🇧🇪', Croatia: '🇭🇷', Switzerland: '🇨🇭', Australia: '🇦🇺',
}

interface HeadToHeadProps { teams: TeamComparison[] }

export default function HeadToHead({ teams }: HeadToHeadProps) {
  const [team1, setTeam1] = useState('')
  const [team2, setTeam2] = useState('')
  const [result, setResult] = useState<{ p1: number; p2: number; analysis: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasError, setHasError] = useState(false)

  const sortedTeams = [...teams]
    .filter(t => t.elo_win_prob >= 0.005)
    .sort((a, b) => a.name.localeCompare(b.name))

  async function simulate() {
    if (!team1 || !team2 || team1 === team2) return
    const t1 = teams.find(t => t.name === team1)
    const t2 = teams.find(t => t.name === team2)
    if (!t1 || !t2) return
    const p1 = 1 / (1 + Math.pow(10, (t2.elo_rating - t1.elo_rating) / 400))
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
        <div className="flex items-center gap-4">
          <select
            value={team1}
            onChange={e => setTeam1(e.target.value)}
            className="flex-1 bg-[#3D2A1E] border border-border text-text-primary font-body text-sm px-3 py-2 rounded-sm"
          >
            <option value="">Select team...</option>
            {sortedTeams.map(t => (
              <option key={t.name} value={t.name}>
                {FLAGS[t.name] ?? ''} {t.name}
              </option>
            ))}
          </select>
          <span className="font-display text-2xl text-accent shrink-0">VS</span>
          <select
            value={team2}
            onChange={e => setTeam2(e.target.value)}
            className="flex-1 bg-[#3D2A1E] border border-border text-text-primary font-body text-sm px-3 py-2 rounded-sm"
          >
            <option value="">Select team...</option>
            {sortedTeams.map(t => (
              <option key={t.name} value={t.name}>
                {FLAGS[t.name] ?? ''} {t.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={simulate}
          disabled={!canSimulate || loading}
          className="w-full py-2 font-display text-sm tracking-widest transition-colors"
          style={{
            background: !canSimulate || loading ? '#3D2A1E' : '#D4622A',
            color: '#F0E8D8',
            opacity: !canSimulate ? 0.5 : 1,
          }}
        >
          {loading ? 'Simulating matchup...' : 'Simulate matchup ↗'}
        </button>
        {result && (
          <div className="space-y-3">
            <div className="flex justify-between font-body text-sm text-text-primary">
              <span>
                {FLAGS[team1] ?? ''} {team1} · {(result.p1 * 100).toFixed(1)}% to win
              </span>
              <span>
                {(result.p2 * 100).toFixed(1)}% to win · {FLAGS[team2] ?? ''} {team2}
              </span>
            </div>
            <div className="h-3 rounded-sm overflow-hidden flex">
              <div style={{ width: `${result.p1 * 100}%`, backgroundColor: '#D4622A' }} />
              <div style={{ flex: 1, backgroundColor: '#5C3D2E' }} />
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
