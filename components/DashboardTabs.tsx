'use client'

import React, { useEffect, useState } from 'react'
import {
  TeamComparison, DescriptiveData, FunFactsData, WCMatch, GoldenBootEntry,
} from '@/lib/types'
import StatCard from './StatCard'
import WinProbDoughnut from './WinProbDoughnut'
import ProbabilityTable from './ProbabilityTable'
import GoldenBoot from './GoldenBoot'
import EloMovers from './EloMovers'
import GoalTiming from './GoalTiming'
import BiggestUpsets from './BiggestUpsets'

import GroupStandings from './GroupStandings'
import KnockoutBracket from './KnockoutBracket'
import HeadToHead from './HeadToHead'
import BuildingTab from './BuildingTab'
import OnboardingOverlay from './OnboardingOverlay'
import { getFlag } from '@/lib/flags'
import { getPacificDateString } from '@/lib/dateUtils'
import { getMatchResult } from '@/lib/matchResult'

// ── Types ─────────────────────────────────────────────────────

interface DashboardTabsProps {
  teams: TeamComparison[]
  descriptive: DescriptiveData
  funFacts: FunFactsData
  worldcupMatches: WCMatch[]
  squadValues: Record<string, number>
  marketSource: string
  generatedAt: string
}

const TABS = ['BRACKET', 'OVERVIEW', 'MY MODEL', 'GROUPS'] as const
type Tab = typeof TABS[number]

// ── Daily summary ─────────────────────────────────────────────

function parseBullets(text: string): string[] {
  const byNewline = text.split('\n').map(s => s.trim()).filter(Boolean)
  const bulletLines = byNewline.filter(s => s.startsWith('•') || s.startsWith('·') || s.startsWith('-'))
  if (bulletLines.length >= 2) {
    return bulletLines.slice(0, 3).map(s => s.replace(/^[•·\-]\s*/, '').trim())
  }
  return text.split(/\.\s+/).map(s => s.trim()).filter(s => s.length > 15).slice(0, 3)
}

function DailySummaryCard({ matches }: { matches: WCMatch[] }) {
  const today = getPacificDateString()
  const [bullets, setBullets] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [displayDate, setDisplayDate] = useState('')
  const [displayMatches, setDisplayMatches] = useState<WCMatch[]>([])

  useEffect(() => {
    const todayCompleted = matches.filter(m => m.date === today && m.score)
    const latestDate = matches
      .filter(m => m.score)
      .map(m => m.date)
      .sort()
      .reverse()[0] ?? ''

    const date = todayCompleted.length > 0 ? today : latestDate
    const dayMatches = matches.filter(m => m.date === date && m.score)
    setDisplayDate(date)
    setDisplayMatches(dayMatches)

    if (dayMatches.length === 0) return

    const cacheKey = `daily_bullets_${date}`
    try {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) { setBullets(JSON.parse(cached)); return }
    } catch {/* sessionStorage may be blocked */}

    setLoading(true)
    const matchContext = dayMatches.map(m => {
      const s1 = (m.goals1 || []).map(g => `${g.name} ${g.minute}'`).join(', ')
      const s2 = (m.goals2 || []).map(g => `${g.name} ${g.minute}'`).join(', ')
      const res = getMatchResult(m)
      return `${m.team1} ${res.displayScore} ${m.team2}${res.decidedBy === 'penalties' ? ` — ${res.winner} won on penalties` : ''}${s1 ? ` (${m.team1}: ${s1})` : ''}${s2 ? ` (${m.team2}: ${s2})` : ''}`
    }).join('. ')

    fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ term: 'matchday_bullets', context: matchContext }),
    })
      .then(r => r.json())
      .then(d => {
        const parsed = parseBullets(d.explanation || '')
        setBullets(parsed)
        try { sessionStorage.setItem(cacheKey, JSON.stringify(parsed)) } catch {/* ignore */}
      })
      .catch(() => setBullets([]))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (displayMatches.length === 0) return null
  const isToday = displayDate === today

  return (
    <section
      className="rounded-sm px-5 py-4"
      style={{ background: 'rgba(7,9,14,0.8)', borderLeft: '3px solid #e3c27e', border: '1px solid rgba(227,194,126,0.35)' }}
    >
      <p className="font-mono-data text-[10px] uppercase tracking-widest mb-2" style={{ color: '#e3c27e' }}>
        {isToday ? 'WHAT HAPPENED TODAY' : `LAST MATCHDAY · ${displayDate}`}
      </p>
      <div
        className="scrollbar-hide mb-3"
        style={{ display: 'flex', flexDirection: 'row', overflowX: 'auto', WebkitOverflowScrolling: 'touch', gap: 24, paddingBottom: 4 } as React.CSSProperties}
      >
        {displayMatches.map((m, i) => (
          <span key={i} className="font-body text-sm text-text-primary" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
            {getFlag(m.team1)} {m.team1}{' '}
            <span className="font-display text-base" style={{ color: '#e3c27e' }}>
              {getMatchResult(m).displayScore}
            </span>{' '}
            {m.team2} {getFlag(m.team2)}
          </span>
        ))}
      </div>
      {loading && (
        <p className="font-body text-sm text-text-muted italic">Generating summary...</p>
      )}
      {bullets.length > 0 && (
        <div
          className="space-y-1.5 overflow-y-auto"
          style={{
            maxHeight: 200,
            scrollbarWidth: 'thin',
            scrollbarColor: '#e3c27e transparent',
          } as React.CSSProperties}
        >
          {bullets.map((bullet, i) => (
            <p key={i} className="font-body text-sm text-text-primary leading-snug flex gap-2">
              <span style={{ color: '#e3c27e', flexShrink: 0 }}>•</span>
              <span>{bullet}</span>
            </p>
          ))}
        </div>
      )}
    </section>
  )
}

// ── Recent matches with recap + YouTube ───────────────────────

function RecentMatches({ matches }: { matches: WCMatch[] }) {
  const today = getPacificDateString()
  const formatted = new Date(today + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const todayMatches = matches.filter(m => m.score && m.date === today)

  const [recaps, setRecaps] = useState<Record<string, string>>({})
  const [loadingKey, setLoadingKey] = useState<string | null>(null)

  async function getRecap(m: WCMatch) {
    const key = `${m.team1}-${m.team2}-${m.date}`
    if (recaps[key] || loadingKey === key) return
    setLoadingKey(key)
    try {
      const res = await fetch('/api/recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match: m }),
      })
      const data = await res.json()
      setRecaps(r => ({ ...r, [key]: data.recap || 'Recap unavailable.' }))
    } catch {
      setRecaps(r => ({ ...r, [key]: 'Recap unavailable.' }))
    } finally {
      setLoadingKey(null)
    }
  }

  return (
    <section className="bg-card border border-border/30 rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border/30">
        <h2 className="font-display text-xl tracking-widest text-text-primary">TODAY&apos;S RESULTS</h2>
        <p className="font-mono-data text-xs text-text-muted mt-0.5">{formatted}</p>
      </div>
      {todayMatches.length === 0 ? (
        <div className="px-5 py-4">
          <p className="font-mono-data text-sm text-text-muted">No completed matches today</p>
        </div>
      ) : (
        <div className="divide-y divide-border/20">
          {todayMatches.map((m, i) => {
            const key = `${m.team1}-${m.team2}-${m.date}`
            const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${m.team1} vs ${m.team2} 2026 World Cup highlights`)}`
            return (
              <div key={i} className="px-5 py-3 space-y-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="font-body text-sm text-text-primary">
                    {getFlag(m.team1)} {m.team1}{' '}
                    <span className="font-display text-lg mx-1">{getMatchResult(m).displayScore}</span>{' '}
                    {m.team2} {getFlag(m.team2)}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <a
                      href={ytUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono-data text-xs text-text-muted hover:text-text-primary underline transition-colors inline-flex items-center min-h-[44px] px-1"
                    >
                      Watch highlights ↗
                    </a>
                    <button
                      onClick={() => getRecap(m)}
                      className="font-mono-data text-xs px-3 rounded-sm transition-colors min-h-[44px]"
                      style={{ background: '#e3c27e', color: '#F0E8D8' }}
                    >
                      {loadingKey === key ? 'Generating...' : 'Get recap ↗'}
                    </button>
                  </div>
                </div>
                {recaps[key] && (
                  <p className="font-body text-sm text-text-muted italic leading-relaxed">
                    {recaps[key]}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ── Crazy stat ────────────────────────────────────────────────

function CrazyStatOfDay({
  descriptive,
  worldcupMatches,
  teams,
}: {
  descriptive: DescriptiveData
  worldcupMatches: WCMatch[]
  teams: TeamComparison[]
}) {
  const today = getPacificDateString()

  // Only check today's completed matches
  const todayCompleted = worldcupMatches.filter(
    m => m.date === today && m.score && (m.goals1?.length || m.goals2?.length)
  )

  if (todayCompleted.length === 0) return null

  let line1: React.ReactNode = null
  let line2 = ''

  type GoalSide = [WCMatch['goals1'], string, string]

  // P1: first-half hat trick today
  outer1:
  for (const m of todayCompleted) {
    const sides: GoalSide[] = [[m.goals1, m.team1, m.team2], [m.goals2, m.team2, m.team1]]
    for (const [goals, team, opp] of sides) {
      if (!goals?.length) continue
      const byPlayer: Record<string, string[]> = {}
      for (const g of goals) { ;(byPlayer[g.name] ??= []).push(g.minute) }
      for (const [player, mins] of Object.entries(byPlayer)) {
        if (mins.length < 3) continue
        if (mins.every(min => !min.includes('+') && parseInt(min) <= 45)) {
          line1 = <>{player} scored a first-half hat trick for <strong style={{ color: '#e3c27e' }}>{team}</strong> against {opp}, all three before the break.</>
          line2 = `Minutes: ${mins.map(min => `${min}'`).join(', ')}. The cleanest kind of hat trick.`
          break outer1
        }
      }
    }
  }

  // P2: any hat trick today
  if (!line1) {
    outer2:
    for (const m of todayCompleted) {
      const sides: GoalSide[] = [[m.goals1, m.team1, m.team2], [m.goals2, m.team2, m.team1]]
      for (const [goals, team, opp] of sides) {
        if (!goals?.length) continue
        const byPlayer: Record<string, string[]> = {}
        for (const g of goals) { ;(byPlayer[g.name] ??= []).push(g.minute) }
        for (const [player, mins] of Object.entries(byPlayer)) {
          if (mins.length >= 3) {
            line1 = <>{player} scored a hat trick for <strong style={{ color: '#e3c27e' }}>{team}</strong> against {opp} ({mins.map(min => `${min}'`).join(', ')}).</>
            line2 = `Final: ${m.score!.ft[0]}–${m.score!.ft[1]}.`
            break outer2
          }
        }
      }
    }
  }

  // P3: 3+ goals in one half today
  if (!line1) {
    outer3:
    for (const m of todayCompleted) {
      if (!m.score?.ht) continue
      const [ft1, ft2] = m.score.ft
      const [ht1, ht2] = m.score.ht
      const cases: [number, string, string, string][] = [
        [ht1, m.team1, m.team2, 'first'],
        [ht2, m.team2, m.team1, 'first'],
        [ft1 - ht1, m.team1, m.team2, 'second'],
        [ft2 - ht2, m.team2, m.team1, 'second'],
      ]
      for (const [n, team, opp, half] of cases) {
        if (n >= 3) {
          line1 = <><strong style={{ color: '#e3c27e' }}>{team}</strong> scored {n} goals in the {half} half alone against {opp}.</>
          line2 = `Final score: ${ft1}–${ft2} (HT: ${ht1}–${ht2}).`
          break outer3
        }
      }
    }
  }

  // P4: stoppage-time goal today
  if (!line1) {
    outer4:
    for (const m of todayCompleted) {
      const sides: GoalSide[] = [[m.goals1, m.team1, m.team2], [m.goals2, m.team2, m.team1]]
      for (const [goals, team, opp] of sides) {
        const stGoal = goals?.find(g => g.minute.includes('+'))
        if (!stGoal) continue
        const isT1 = goals === m.goals1
        const [g1, g2] = m.score!.ft
        const tScore = isT1 ? g1 : g2
        const oScore = isT1 ? g2 : g1
        const outcome = tScore > oScore ? 'win' : tScore === oScore ? 'draw' : 'hold on'
        line1 = <>{stGoal.name} scored in stoppage time ({stGoal.minute}&apos;) to {outcome} for <strong style={{ color: '#e3c27e' }}>{team}</strong> against {opp}.</>
        line2 = `Final: ${g1}–${g2}.`
        break outer4
      }
    }
  }

  // P5: today's biggest upset (lower-Elo team won)
  if (!line1) {
    let bestUpset: { team: string; opp: string; score: string; prob: number } | null = null
    for (const m of todayCompleted) {
      const t1 = teams.find(t => t.name === m.team1)
      const t2 = teams.find(t => t.name === m.team2)
      if (!t1 || !t2) continue
      const res = getMatchResult(m)
      if (!res.winner) continue
      const winner = res.winner === m.team1 ? t1 : t2
      const loser = res.winner === m.team1 ? t2 : t1
      const eloDiff = loser.elo_rating - winner.elo_rating
      if (eloDiff > 0) {
        const prob = 1 / (1 + Math.pow(10, eloDiff / 400))
        if (!bestUpset || prob < bestUpset.prob) {
          bestUpset = { team: winner.name, opp: loser.name, score: res.displayScore, prob }
        }
      }
    }
    if (bestUpset && bestUpset.prob < 0.45) {
      line1 = <>Today&apos;s upset: <strong style={{ color: '#e3c27e' }}>{bestUpset.team}</strong> beat {bestUpset.opp}. The model gave them only{' '}<strong style={{ color: '#e3c27e' }}>{(bestUpset.prob * 100).toFixed(0)}%</strong> chance to win.</>
      line2 = `Final score: ${bestUpset.score}. Results on the pitch don't always follow the numbers.`
    }
  }

  // P6: today's biggest Elo mover
  if (!line1) {
    const todayTeams = new Set(todayCompleted.flatMap(m => [m.team1, m.team2]))
    const todayMovers = descriptive.elo_movers.filter(
      mv => mv.direction !== 'flat' &&
        /^[A-Za-zÀ-ÿ\s&'()\-.]+$/.test(mv.team) &&
        mv.team.length < 30 &&
        todayTeams.has(mv.team)
    )
    const topMover = todayMovers.find(mv => mv.direction === 'up')
    if (topMover) {
      line1 = <>{topMover.team} gained <strong style={{ color: '#e3c27e' }}>{topMover.change} Elo points</strong> from today&apos;s result, one of the biggest jumps of the tournament.</>
      line2 = `Rating went from ${topMover.pre_wc} to ${topMover.current}. Results are exceeding expectations.`
    }
  }

  if (!line1) return null

  return (
    <div
      className="rounded-sm px-5 py-4"
      style={{ background: 'rgba(7,9,14,0.8)', borderLeft: '3px solid #e3c27e', border: '1px solid rgba(227,194,126,0.2)' }}
    >
      <p className="font-mono-data text-[10px] text-accent uppercase tracking-widest mb-2">
        Crazy stat of the day
      </p>
      <p className="font-body text-base text-text-primary leading-snug mb-1">{line1}</p>
      <p className="font-mono-data text-xs text-text-muted">{line2}</p>
    </div>
  )
}

// ── Compact upcoming predictions ──────────────────────────────

function CompactUpcoming({ matches, teams }: { matches: WCMatch[]; teams: TeamComparison[] }) {
  const today = getPacificDateString()
  const in3 = getPacificDateString(3)
  const upcoming = matches.filter(m => !m.score && m.date >= today && m.date <= in3)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (upcoming.length === 0) return null

  return (
    <section className="bg-card border border-border/30 rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border/30">
        <h2 className="font-display text-xl tracking-widest text-text-primary">UPCOMING MATCHES</h2>
        <p className="font-mono-data text-xs text-text-muted mt-0.5">
          Next 3 days · win chances based on Elo ratings
        </p>
      </div>
      <div className="divide-y divide-border/20">
        {upcoming.map((m, i) => {
          const t1 = teams.find(t => t.name === m.team1)
          const t2 = teams.find(t => t.name === m.team2)
          const p1 = t1?.elo_win_prob ?? 0
          const p2 = t2?.elo_win_prob ?? 0
          const total = p1 + p2
          const n1 = total > 0 ? p1 / total : 0.5
          const n2 = total > 0 ? p2 / total : 0.5
          const fav = n1 >= n2 ? m.team1 : m.team2
          const confidence = Math.max(n1, n2) >= 0.65 ? 'high confidence' : Math.max(n1, n2) >= 0.55 ? 'slight edge' : 'coin flip'
          return (
            <div key={i} className="px-5 flex items-center gap-2 flex-wrap min-h-[44px]">
              <span className="font-body text-sm text-text-primary">
                {getFlag(m.team1)}{' '}
                {m.team1 === fav
                  ? <strong style={{ color: '#e3c27e' }}>{m.team1} ({(n1 * 100).toFixed(0)}%)</strong>
                  : <>{m.team1} ({(n1 * 100).toFixed(0)}%)</>
                }
                {' '}vs{' '}
                {m.team2 === fav
                  ? <strong style={{ color: '#e3c27e' }}>{m.team2} ({(n2 * 100).toFixed(0)}%)</strong>
                  : <>{m.team2} ({(n2 * 100).toFixed(0)}%)</>
                }
                {' '}{getFlag(m.team2)}
              </span>
              <span className="font-mono-data text-[10px] text-text-muted">· {m.date} · {confidence}</span>
            </div>
          )
        })}
      </div>
      <div className="px-5 py-2 border-t border-border/20">
        <p className="font-mono-data text-[10px] text-text-muted">
          Win chances based on Elo ratings · Bold = model favorite
        </p>
      </div>
    </section>
  )
}

// ── About This Model ──────────────────────────────────────────

function AboutThisModel() {
  return (
    <section
      className="rounded-sm px-5 py-5 space-y-4"
      style={{ background: 'rgba(7,9,14,0.8)', border: '1px solid rgba(227,194,126,0.3)' }}
    >
      <div>
        <h2 className="font-display text-2xl tracking-widest" style={{ color: '#e3c27e' }}>
          ABOUT THIS MODEL
        </h2>
        <p className="font-body text-sm text-text-muted mt-1 leading-relaxed">
          A personal project tracking the 2026 World Cup through statistical simulation. Not affiliated with FIFA or any sportsbook.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="space-y-2">
          <p className="font-mono-data text-[10px] uppercase tracking-widest" style={{ color: '#e3c27e' }}>
            Data Sources
          </p>
          <p className="font-body text-sm text-text-muted leading-relaxed">
            Match results from official FIFA records. Squad valuations from Transfermarkt. Elo ratings follow the{' '}
            <a
              href="https://en.wikipedia.org/wiki/World_Football_Elo_Ratings"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-text-primary transition-colors"
              style={{ color: '#e3c27e' }}
            >
              World Football Elo
            </a>{' '}
            methodology, updated after each match.
          </p>
        </div>
        <div className="space-y-2">
          <p className="font-mono-data text-[10px] uppercase tracking-widest" style={{ color: '#e3c27e' }}>
            Elo Ratings
          </p>
          <p className="font-body text-sm text-text-muted leading-relaxed">
            Each team has an Elo number reflecting historical strength and recent form. A 400-point gap means the stronger team wins roughly 91% of head-to-head matchups.{' '}
            <a
              href="https://en.wikipedia.org/wiki/Elo_rating_system"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-text-primary transition-colors"
              style={{ color: '#e3c27e' }}
            >
              Wikipedia ↗
            </a>
          </p>
        </div>
        <div className="space-y-2">
          <p className="font-mono-data text-[10px] uppercase tracking-widest" style={{ color: '#e3c27e' }}>
            Monte Carlo Simulation
          </p>
          <p className="font-body text-sm text-text-muted leading-relaxed">
            We simulate the entire tournament 100,000 times. Each match probability is derived from Elo ratings. The win % figures show how often each team wins the World Cup across all simulations.{' '}
            <a
              href="https://en.wikipedia.org/wiki/Monte_Carlo_method"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-text-primary transition-colors"
              style={{ color: '#e3c27e' }}
            >
              Wikipedia ↗
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}

// ── Golden Boot Leader tile ───────────────────────────────────

function GoldenBootTile({ entries }: { entries: GoldenBootEntry[] }) {
  if (!entries.length) return (
    <div className="bg-card border border-border/30 rounded-sm p-4 flex flex-col justify-center">
      <p className="font-mono-data text-[10px] text-text-muted uppercase tracking-widest">Golden Boot Leader</p>
      <p className="font-body text-sm text-text-muted mt-2">No goals yet</p>
    </div>
  )
  const topGoals = entries[0].goals
  const tied = entries.filter(e => e.goals === topGoals).sort((a, b) => a.player.localeCompare(b.player))
  const top = tied[0]
  const isTied = tied.length > 1

  return (
    <div className="bg-card border border-border/30 rounded-sm p-4 flex flex-col gap-1">
      <p className="font-mono-data text-[10px] text-text-muted uppercase tracking-widest">
        Golden Boot Leader
      </p>
      <div className="flex flex-col items-center gap-0.5 mt-1">
        <span style={{ fontSize: 24 }}>{getFlag(top.team)}</span>
        <span className="font-body font-semibold text-text-primary text-center leading-snug" style={{ fontSize: 14 }}>
          {top.player}
        </span>
        <div className="flex items-baseline gap-1">
          <span className="font-display font-bold" style={{ fontSize: 28, color: '#e3c27e', lineHeight: 1 }}>
            {top.goals}
          </span>
          {isTied && (
            <span className="font-mono-data text-text-muted" style={{ fontSize: 10 }}>T-1</span>
          )}
        </div>
        <span className="font-mono-data text-text-muted" style={{ fontSize: 11 }}>goals</span>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export default function DashboardTabs({
  teams, descriptive, worldcupMatches, squadValues,
}: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('BRACKET')

  const matchesPlayed = descriptive.goal_timing.total_goals > 0
    ? Math.round(descriptive.goal_timing.total_goals / 2.83)
    : 0

  const teamsRemaining = (() => {
    const eliminated = new Set<string>()
    for (const m of worldcupMatches) {
      if (!m.score || m.round.includes('Third')) continue
      const isKnockout = ['Round of 32', 'Round of 16', 'Quarter', 'Semi', 'Final'].some(r => m.round.includes(r))
      if (!isKnockout) continue
      const { winner } = getMatchResult(m)
      if (winner) eliminated.add(winner === m.team1 ? m.team2 : m.team1)
    }
    return 32 - eliminated.size
  })()

  return (
    <>
      <div className="space-y-0">
      {/* Tab navigation */}
      <div
        className="scrollbar-hide mb-6 flex"
        style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(12px)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.07)',
          overflowX: 'auto',
        }}
      >
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="relative flex-shrink-0 px-5 font-display text-sm tracking-widest transition-colors inline-flex items-center min-h-[44px]"
            style={{
              color: activeTab === tab ? '#f3ede0' : 'rgba(243,237,224,0.45)',
              borderBottom: activeTab === tab ? '2px solid #e3c27e' : '2px solid transparent',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="scroll-fade-right">
            <div className="stat-tiles-row">
              <StatCard label="Matches Played" value={matchesPlayed} />
              <StatCard label="Teams Remaining" value={teamsRemaining} />
              <StatCard label="Final Date" value="Jul 19" />
              <GoldenBootTile entries={descriptive.golden_boot} />
            </div>
          </div>

          <DailySummaryCard matches={worldcupMatches} />

          <CrazyStatOfDay descriptive={descriptive} worldcupMatches={worldcupMatches} teams={teams} />

          <RecentMatches matches={worldcupMatches} />

          <HeadToHead teams={teams} wcMatches={worldcupMatches} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GoldenBoot entries={descriptive.golden_boot} />
            <EloMovers movers={descriptive.elo_movers} />
          </div>

          <GoalTiming
            bins={descriptive.goal_timing.bins}
            totalGoals={descriptive.goal_timing.total_goals}
            mostProductivePeriod={descriptive.goal_timing.most_productive_period}
            goldenBoot={descriptive.golden_boot}
          />

          <BiggestUpsets upsets={descriptive.upsets} />

          <div className="pb-2" />
        </div>
      )}

      {/* MY MODEL */}
      {activeTab === 'MY MODEL' && (
        <div className="space-y-6">
          <AboutThisModel />

          <div className="doughnut-wrap">
            <WinProbDoughnut teams={teams} />
          </div>

          <CompactUpcoming matches={worldcupMatches} teams={teams} />

          <ProbabilityTable teams={teams} squadValues={squadValues} />

          <div className="pb-2" />
        </div>
      )}

      {/* GROUPS */}
      {activeTab === 'GROUPS' && (
        <GroupStandings matches={worldcupMatches} />
      )}

      {/* BRACKET */}
      {activeTab === 'BRACKET' && (
        <KnockoutBracket matches={worldcupMatches} teams={teams} />
      )}
    </div>
    <OnboardingOverlay />
    </>
  )
}
