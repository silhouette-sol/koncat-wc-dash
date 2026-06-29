'use client'

import React, { useEffect, useState } from 'react'
import {
  TeamComparison, DescriptiveData, FunFactsData, WCMatch,
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
import AccuracyTracker from './AccuracyTracker'
import HeadToHead from './HeadToHead'
import BuildingTab from './BuildingTab'

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

const TABS = ['OVERVIEW', 'PREDICTIONS', 'BUILDING', 'GROUPS', 'BRACKET'] as const
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
  const today = new Date().toISOString().slice(0, 10)
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
      return `${m.team1} ${m.score!.ft[0]}-${m.score!.ft[1]} ${m.team2}${s1 ? ` (${m.team1}: ${s1})` : ''}${s2 ? ` (${m.team2}: ${s2})` : ''}`
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

  // Compute top 3 teams by points across all completed matches
  const standingsMap: Record<string, { pts: number; gd: number; gf: number }> = {}
  for (const m of matches) {
    if (!m.score) continue
    const [g1, g2] = m.score.ft
    if (!standingsMap[m.team1]) standingsMap[m.team1] = { pts: 0, gd: 0, gf: 0 }
    if (!standingsMap[m.team2]) standingsMap[m.team2] = { pts: 0, gd: 0, gf: 0 }
    standingsMap[m.team1].gf += g1
    standingsMap[m.team1].gd += g1 - g2
    standingsMap[m.team2].gf += g2
    standingsMap[m.team2].gd += g2 - g1
    if (g1 > g2) { standingsMap[m.team1].pts += 3 }
    else if (g2 > g1) { standingsMap[m.team2].pts += 3 }
    else { standingsMap[m.team1].pts += 1; standingsMap[m.team2].pts += 1 }
  }
  const top3 = Object.entries(standingsMap)
    .sort(([, a], [, b]) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
    .slice(0, 3)

  const CARD_FLAGS: Record<string, string> = {
    France: '🇫🇷', Brazil: '🇧🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Spain: '🇪🇸',
    Argentina: '🇦🇷', Germany: '🇩🇪', Morocco: '🇲🇦', USA: '🇺🇸',
    Norway: '🇳🇴', Japan: '🇯🇵', Portugal: '🇵🇹', Netherlands: '🇳🇱',
    Mexico: '🇲🇽', Colombia: '🇨🇴', Uruguay: '🇺🇾', Belgium: '🇧🇪',
    Croatia: '🇭🇷', Switzerland: '🇨🇭', Australia: '🇦🇺', Ecuador: '🇪🇨',
    Senegal: '🇸🇳', Ghana: '🇬🇭', 'South Korea': '🇰🇷', Canada: '🇨🇦',
    Algeria: '🇩🇿', Egypt: '🇪🇬', Paraguay: '🇵🇾', Austria: '🇦🇹',
    Sweden: '🇸🇪', 'Cape Verde': '🇨🇻', 'Bosnia & Herzegovina': '🇧🇦',
    'DR Congo': '🇨🇩', 'South Africa': '🇿🇦', 'Ivory Coast': '🇨🇮',
  }

  return (
    <section
      className="rounded-sm px-5 py-4"
      style={{ background: 'rgba(11,29,58,0.8)', borderLeft: '3px solid #C9A027', border: '1px solid rgba(201,160,39,0.35)' }}
    >
      <p className="font-mono-data text-[10px] uppercase tracking-widest mb-2" style={{ color: '#C9A027' }}>
        {isToday ? 'WHAT HAPPENED TODAY' : `LAST MATCHDAY · ${displayDate}`}
      </p>
      <div className="flex flex-wrap gap-x-6 gap-y-1 mb-3">
        {displayMatches.map((m, i) => (
          <p key={i} className="font-body text-sm text-text-primary">
            {m.team1}{' '}
            <span className="font-display text-base" style={{ color: '#C9A027' }}>
              {m.score!.ft[0]}–{m.score!.ft[1]}
            </span>{' '}
            {m.team2}
          </p>
        ))}
      </div>
      {loading && (
        <p className="font-body text-sm text-text-muted italic">Generating summary...</p>
      )}
      {bullets.length > 0 && (
        <div className="space-y-1.5 max-h-28 overflow-hidden">
          {bullets.map((bullet, i) => (
            <p key={i} className="font-body text-sm text-text-primary leading-snug flex gap-2">
              <span style={{ color: '#C9A027', flexShrink: 0 }}>•</span>
              <span>{bullet}</span>
            </p>
          ))}
        </div>
      )}
      {top3.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(201,160,39,0.3)' }}>
          <p className="font-mono-data text-[10px] uppercase tracking-widest mb-2" style={{ color: '#C9A027' }}>
            Leading the tournament
          </p>
          <div className="flex items-center gap-5 flex-wrap">
            {top3.map(([team, { pts }]) => (
              <div key={team} className="flex items-center gap-1.5">
                <span style={{ fontSize: 18 }}>{CARD_FLAGS[team] ?? ''}</span>
                <span className="font-body text-[13px] font-semibold text-text-primary">{team}</span>
                <span className="font-mono-data text-[13px]" style={{ color: '#C9A027' }}>{pts}pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

// ── Recent matches with recap + YouTube ───────────────────────

function RecentMatches({ matches }: { matches: WCMatch[] }) {
  const today = new Date().toISOString().split('T')[0]
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
                    {m.team1}{' '}
                    <span className="font-display text-lg mx-1">{m.score!.ft[0]}–{m.score!.ft[1]}</span>{' '}
                    {m.team2}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <a
                      href={ytUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono-data text-xs text-text-muted hover:text-text-primary underline transition-colors"
                    >
                      Watch highlights ↗
                    </a>
                    <button
                      onClick={() => getRecap(m)}
                      className="font-mono-data text-xs px-2.5 py-1 rounded-sm transition-colors"
                      style={{ background: '#D4622A', color: '#F0E8D8' }}
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
  const today = new Date().toISOString().split('T')[0]

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
          line1 = <>{player} scored a first-half hat trick for <strong style={{ color: '#C9A027' }}>{team}</strong> against {opp}, all three before the break.</>
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
            line1 = <>{player} scored a hat trick for <strong style={{ color: '#C9A027' }}>{team}</strong> against {opp} ({mins.map(min => `${min}'`).join(', ')}).</>
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
          line1 = <><strong style={{ color: '#C9A027' }}>{team}</strong> scored {n} goals in the {half} half alone against {opp}.</>
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
        line1 = <>{stGoal.name} scored in stoppage time ({stGoal.minute}&apos;) to {outcome} for <strong style={{ color: '#C9A027' }}>{team}</strong> against {opp}.</>
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
      const [g1, g2] = m.score!.ft
      if (g1 === g2) continue
      const winnerIsT1 = g1 > g2
      const winner = winnerIsT1 ? t1 : t2
      const loser = winnerIsT1 ? t2 : t1
      const eloDiff = loser.elo_rating - winner.elo_rating
      if (eloDiff > 0) {
        const prob = 1 / (1 + Math.pow(10, eloDiff / 400))
        if (!bestUpset || prob < bestUpset.prob) {
          bestUpset = { team: winner.name, opp: loser.name, score: `${g1}–${g2}`, prob }
        }
      }
    }
    if (bestUpset && bestUpset.prob < 0.45) {
      line1 = <>Today&apos;s upset: <strong style={{ color: '#C9A027' }}>{bestUpset.team}</strong> beat {bestUpset.opp}. The model gave them only{' '}<strong style={{ color: '#C9A027' }}>{(bestUpset.prob * 100).toFixed(0)}%</strong> chance to win.</>
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
      line1 = <>{topMover.team} gained <strong style={{ color: '#C9A027' }}>{topMover.change} Elo points</strong> from today&apos;s result, one of the biggest jumps of the tournament.</>
      line2 = `Rating went from ${topMover.pre_wc} to ${topMover.current}. Results are exceeding expectations.`
    }
  }

  if (!line1) return null

  return (
    <div
      className="rounded-sm px-5 py-4"
      style={{ background: 'rgba(11,29,58,0.8)', borderLeft: '3px solid #D4622A', border: '1px solid rgba(212,98,42,0.3)' }}
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
  const today = new Date().toISOString().slice(0, 10)
  const in3 = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
  const upcoming = matches.filter(m => !m.score && m.date >= today && m.date <= in3)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (upcoming.length === 0) return null

  const FLAGS: Record<string, string> = {
    France: '🇫🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Spain: '🇪🇸', Argentina: '🇦🇷',
    Brazil: '🇧🇷', Germany: '🇩🇪', Portugal: '🇵🇹', Netherlands: '🇳🇱',
    USA: '🇺🇸', Norway: '🇳🇴', Morocco: '🇲🇦', Japan: '🇯🇵',
    Mexico: '🇲🇽', Colombia: '🇨🇴', Uruguay: '🇺🇾', Belgium: '🇧🇪',
  }

  return (
    <section className="bg-card border border-border/30 rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border/30">
        <h2 className="font-display text-xl tracking-widest text-text-primary">UPCOMING PREDICTIONS</h2>
        <p className="font-mono-data text-xs text-text-muted mt-0.5">
          Next 3 days · predictions based on Elo model
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
            <div key={i} className="px-5 py-2.5 flex items-center gap-2 flex-wrap">
              <span className="font-body text-sm text-text-primary">
                {FLAGS[m.team1] ?? ''}{' '}
                {m.team1 === fav
                  ? <strong style={{ color: '#C9A027' }}>{m.team1} ({(n1 * 100).toFixed(0)}%)</strong>
                  : <>{m.team1} ({(n1 * 100).toFixed(0)}%)</>
                }
                {' '}vs{' '}
                {m.team2 === fav
                  ? <strong style={{ color: '#C9A027' }}>{m.team2} ({(n2 * 100).toFixed(0)}%)</strong>
                  : <>{m.team2} ({(n2 * 100).toFixed(0)}%)</>
                }
                {' '}{FLAGS[m.team2] ?? ''}
              </span>
              <span className="font-mono-data text-[10px] text-text-muted">· {m.date} · {confidence}</span>
            </div>
          )
        })}
      </div>
      <div className="px-5 py-2 border-t border-border/20">
        <p className="font-mono-data text-[10px] text-text-muted">
          Predictions based on Elo model · Bold = model favorite
        </p>
      </div>
    </section>
  )
}

// ── Main component ────────────────────────────────────────────

export default function DashboardTabs({
  teams, descriptive, worldcupMatches, squadValues,
}: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW')

  const matchesPlayed = descriptive.goal_timing.total_goals > 0
    ? Math.round(descriptive.goal_timing.total_goals / 2.83)
    : 0

  return (
    <div className="space-y-0">
      {/* Tab navigation */}
      <div className="rounded-sm overflow-hidden flex mb-6" style={{ background: '#5C3D2E' }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="relative px-5 py-3 font-display text-sm tracking-widest transition-colors"
            style={{
              color: activeTab === tab ? '#F0E8D8' : '#C4A882',
              borderBottom: activeTab === tab ? '2px solid #C9A027' : '2px solid transparent',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Matches Played" value={matchesPlayed} />
            <StatCard label="Teams Remaining" value={32} />
            <StatCard label="Final Date" value="Jul 19" />
            <StatCard label="Simulations" value="10k" />
          </div>

          <DailySummaryCard matches={worldcupMatches} />

          <CrazyStatOfDay descriptive={descriptive} worldcupMatches={worldcupMatches} teams={teams} />

          <RecentMatches matches={worldcupMatches} />

          <AccuracyTracker />

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

      {/* PREDICTIONS */}
      {activeTab === 'PREDICTIONS' && (
        <div className="space-y-6">
          <HeadToHead teams={teams} />

          <WinProbDoughnut teams={teams} />

          <AccuracyTracker showFullExplanation />

          <CompactUpcoming matches={worldcupMatches} teams={teams} />

          <ProbabilityTable teams={teams} squadValues={squadValues} />

          <div className="pb-2" />
        </div>
      )}

      {/* BUILDING */}
      {activeTab === 'BUILDING' && (
        <BuildingTab descriptive={descriptive} worldcupMatches={worldcupMatches} />
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
  )
}
