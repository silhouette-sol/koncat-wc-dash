'use client'

import { useEffect, useRef, useState } from 'react'

const TEAMS: [string, string][] = [
  ['France', '🇫🇷'], ['England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['Spain', '🇪🇸'], ['Argentina', '🇦🇷'],
  ['Brazil', '🇧🇷'], ['Germany', '🇩🇪'], ['Portugal', '🇵🇹'], ['Netherlands', '🇳🇱'],
  ['USA', '🇺🇸'], ['Norway', '🇳🇴'], ['Morocco', '🇲🇦'], ['Japan', '🇯🇵'],
  ['Mexico', '🇲🇽'], ['Colombia', '🇨🇴'], ['Uruguay', '🇺🇾'], ['Belgium', '🇧🇪'],
]

interface PickCount { team: string; count: number }

type Phase = 'choosing' | 'animating' | 'locked'

export default function MyPrediction() {
  const [phase, setPhase] = useState<Phase>('choosing')
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [lockedTeam, setLockedTeam] = useState<string | null>(null)
  const [lockedFlag, setLockedFlag] = useState<string>('')
  const [counts, setCounts] = useState<PickCount[]>([])
  const [total, setTotal] = useState(0)
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('wc_first_pick')
    if (stored) {
      setPhase('locked')
      setLockedTeam(stored)
      setLockedFlag(TEAMS.find(([t]) => t === stored)?.[1] ?? '🏳')
    }
    fetch('/api/firstpick')
      .then(r => r.json())
      .then(d => { setCounts(d.counts || []); setTotal(d.total || 0) })
  }, [])

  useEffect(() => {
    if (phase !== 'animating') return
    import('canvas-confetti').then(mod => {
      mod.default({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#D4622A', '#F0E8D8', '#1D9E75', '#C4A882'],
      })
    })
    animTimerRef.current = setTimeout(() => setPhase('locked'), 2500)
    return () => { if (animTimerRef.current) clearTimeout(animTimerRef.current) }
  }, [phase])

  async function handleLock() {
    if (!selectedTeam) return
    const flag = TEAMS.find(([t]) => t === selectedTeam)?.[1] ?? '🏳'
    const res = await fetch('/api/firstpick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team: selectedTeam }),
    })
    const data = await res.json()
    if (data.locked) {
      setLockedTeam(data.team)
      setLockedFlag(TEAMS.find(([t]) => t === data.team)?.[1] ?? '🏳')
      setPhase('locked')
    } else {
      localStorage.setItem('wc_first_pick', selectedTeam)
      setLockedTeam(selectedTeam)
      setLockedFlag(flag)
      setPhase('animating')
    }
  }

  const maxCount = counts[0]?.count || 1

  if (phase === 'animating' && lockedTeam) {
    return (
      <section className="bg-card border border-border rounded-sm overflow-hidden">
        <style>{`
          @keyframes wc-scaleIn { from { transform: scale(0.2); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          @keyframes wc-pulseRing { from { transform: scale(0.8); opacity: 1; } to { transform: scale(2.5); opacity: 0; } }
          .wc-flag-anim { animation: wc-scaleIn 0.4s ease-out; }
          .wc-ring-anim { animation: wc-pulseRing 1s ease-out 2; }
        `}</style>
        <div className="px-5 py-8 flex flex-col items-center gap-4 relative">
          <div className="relative inline-block">
            <div
              className="wc-ring-anim absolute inset-[-20px] rounded-full"
              style={{ border: '3px solid #D4622A' }}
            />
            <div className="wc-flag-anim" style={{ fontSize: 80 }}>{lockedFlag}</div>
          </div>
          <p className="font-display text-2xl text-accent tracking-widest">{lockedTeam}</p>
          <p className="font-body text-base text-text-primary mt-2">Official prediction locked 🔒</p>
        </div>
      </section>
    )
  }

  if (phase === 'locked' && lockedTeam) {
    return (
      <section className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="font-display text-xl tracking-widest text-text-primary">
            YOUR OFFICIAL PREDICTION
          </h2>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="flex flex-col items-center py-4 gap-2">
            <span style={{ fontSize: 48 }}>{lockedFlag}</span>
            <p className="font-display text-2xl text-accent tracking-widest">{lockedTeam}</p>
            <p className="font-mono-data text-xs text-text-muted">🔒 locked in</p>
            <p className="font-mono-data text-[10px] text-text-muted italic">First pick is permanent</p>
          </div>
          {counts.length > 0 && (
            <div className="space-y-2">
              <p className="font-mono-data text-xs text-text-muted">
                Community first picks — {total} total
              </p>
              {counts.slice(0, 8).map(c => {
                const pct = total > 0 ? (c.count / total) * 100 : 0
                const isUser = c.team === lockedTeam
                return (
                  <div key={c.team} className="space-y-0.5">
                    <div className="flex justify-between font-mono-data text-[10px] text-text-muted">
                      <span>{c.team}{isUser ? ' ← your pick' : ''}</span>
                      <span>{Math.round(pct)}% ({c.count})</span>
                    </div>
                    <div className="h-1.5 bg-border/20 rounded-sm overflow-hidden">
                      <div
                        className="h-full rounded-sm"
                        style={{
                          width: `${(c.count / maxCount) * 100}%`,
                          backgroundColor: isUser ? '#D4622A' : '#5C3D2E',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="bg-card border border-border rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h2 className="font-display text-xl tracking-widest text-text-primary">
          YOUR OFFICIAL PREDICTION
        </h2>
        <p className="font-mono-data text-xs text-text-muted mt-0.5">
          Your first pick is permanent — choose wisely
        </p>
      </div>
      <div className="px-5 py-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TEAMS.map(([team, flag]) => {
            const isSelected = selectedTeam === team
            return (
              <button
                key={team}
                onClick={() => setSelectedTeam(team)}
                className="px-3 py-2 rounded-sm text-left transition-all"
                style={{
                  background: '#3D2A1E',
                  border: isSelected ? '2px solid #D4622A' : '1px solid #7A5C45',
                  color: isSelected ? '#D4622A' : '#F0E8D8',
                  opacity: selectedTeam && !isSelected ? 0.6 : 1,
                  transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                }}
              >
                <div className="font-body text-sm">{flag} {team}</div>
              </button>
            )
          })}
        </div>
        {selectedTeam && (
          <button
            onClick={handleLock}
            className="w-full py-2 font-display text-sm tracking-widest"
            style={{ background: '#D4622A', color: '#F0E8D8' }}
          >
            Lock in {TEAMS.find(([t]) => t === selectedTeam)?.[1]} {selectedTeam} as my official pick
          </button>
        )}
      </div>
    </section>
  )
}
