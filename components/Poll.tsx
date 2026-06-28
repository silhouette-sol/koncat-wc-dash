'use client'

import { useEffect, useState } from 'react'

const TEAMS: [string, string][] = [
  ['France', '🇫🇷'], ['England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['Spain', '🇪🇸'], ['Argentina', '🇦🇷'],
  ['Brazil', '🇧🇷'], ['Germany', '🇩🇪'], ['Portugal', '🇵🇹'], ['Netherlands', '🇳🇱'],
  ['USA', '🇺🇸'], ['Norway', '🇳🇴'], ['Morocco', '🇲🇦'], ['Japan', '🇯🇵'],
  ['Mexico', '🇲🇽'], ['Colombia', '🇨🇴'], ['Uruguay', '🇺🇾'], ['Belgium', '🇧🇪'],
]

interface VoteCount { team: string; count: number }

export default function Poll() {
  const [votes, setVotes] = useState<VoteCount[]>([])
  const [total, setTotal] = useState(0)
  const [userVote, setUserVote] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [voted, setVoted] = useState(false)

  useEffect(() => {
    fetch('/api/poll')
      .then(r => r.json())
      .then(d => { setVotes(d.votes || []); setTotal(d.total || 0) })
    const stored = localStorage.getItem('wc_poll_vote')
    if (stored) { setUserVote(stored); setVoted(true) }
  }, [])

  async function handleVote() {
    if (!selected || submitting) return
    setSubmitting(true)
    await fetch('/api/poll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team: selected }),
    })
    localStorage.setItem('wc_poll_vote', selected)
    setUserVote(selected)
    setVoted(true)
    setSubmitting(false)
    fetch('/api/poll')
      .then(r => r.json())
      .then(d => { setVotes(d.votes || []); setTotal(d.total || 0) })
  }

  const topVotes = [...votes].sort((a, b) => b.count - a.count).slice(0, 8)
  const maxCount = topVotes[0]?.count || 1

  return (
    <section className="bg-card border border-border rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h2 className="font-display text-xl tracking-widest text-text-primary">COMMUNITY POLL</h2>
        <p className="font-mono-data text-xs text-text-muted mt-0.5">{total} votes cast · who wins?</p>
      </div>
      <div className="px-5 py-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TEAMS.map(([team, flag]) => {
            const isSelected = selected === team || userVote === team
            const count = votes.find(v => v.team === team)?.count || 0
            const pct = total > 0 ? Math.round((count / total) * 100) : 0
            return (
              <button
                key={team}
                onClick={() => { if (!voted) setSelected(team) }}
                className="px-3 py-2 rounded-sm text-left transition-all"
                style={{
                  background: '#3D2A1E',
                  border: isSelected ? '2px solid #D4622A' : '1px solid #7A5C45',
                  color: isSelected ? '#D4622A' : '#F0E8D8',
                  opacity: selected && !isSelected && !voted ? 0.6 : 1,
                  cursor: voted ? 'default' : 'pointer',
                }}
              >
                <div className="font-body text-sm">{flag} {team}</div>
                {voted && (
                  <div className="font-mono-data text-[10px] text-text-muted mt-0.5">
                    {pct}% ({count})
                  </div>
                )}
              </button>
            )
          })}
        </div>
        {!voted && (
          <button
            onClick={handleVote}
            disabled={!selected || submitting}
            className="w-full py-2 font-display text-sm tracking-widest transition-colors"
            style={{
              background: !selected || submitting ? '#3D2A1E' : '#D4622A',
              color: '#F0E8D8',
              opacity: !selected ? 0.5 : 1,
            }}
          >
            {submitting ? 'Updating...' : 'Cast my vote ↗'}
          </button>
        )}
        {voted && topVotes.length > 0 && (
          <div className="space-y-2">
            {topVotes.map(v => {
              const pct = total > 0 ? (v.count / total) * 100 : 0
              const isUser = v.team === userVote
              return (
                <div key={v.team} className="space-y-0.5">
                  <div className="flex justify-between font-mono-data text-[10px] text-text-muted">
                    <span>{v.team}</span>
                    <span>{Math.round(pct)}%</span>
                  </div>
                  <div className="h-1.5 rounded-sm overflow-hidden bg-border/20">
                    <div
                      className="h-full rounded-sm"
                      style={{
                        width: `${(v.count / maxCount) * 100}%`,
                        backgroundColor: isUser ? '#D4622A' : '#5C3D2E',
                      }}
                    />
                  </div>
                </div>
              )
            })}
            <p className="font-mono-data text-[11px] text-text-muted italic">Change your vote anytime</p>
          </div>
        )}
      </div>
    </section>
  )
}
