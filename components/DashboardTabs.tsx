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
import OpponentStrength from './OpponentStrength'
import GroupStandings from './GroupStandings'
import KnockoutBracket from './KnockoutBracket'
import AccuracyTracker from './AccuracyTracker'
import MyPrediction from './MyPrediction'
import HeadToHead from './HeadToHead'

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

const TABS = ['OVERVIEW', 'PREDICTIONS', 'GROUPS', 'BRACKET'] as const
type Tab = typeof TABS[number]

// ── Daily summary ─────────────────────────────────────────────

function DailySummaryCard({ matches }: { matches: WCMatch[] }) {
  const today = new Date().toISOString().slice(0, 10)
  const [summary, setSummary] = useState<string | null>(null)
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

    const cacheKey = `daily_summary_${date}`
    try {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) { setSummary(cached); return }
    } catch {/* sessionStorage may be blocked */}

    setLoading(true)
    const matchContext = dayMatches.map(m => {
      const s1 = (m.goals1 || []).map(g => `${g.name} ${g.minute}'`).join(', ')
      const s2 = (m.goals2 || []).map(g => `${g.name} ${g.minute}'`).join(', ')
      return `${m.team1} ${m.score!.ft[0]}-${m.score!.ft[1]} ${m.team2}${s1 ? ` (${m.team1} scorers: ${s1})` : ''}${s2 ? ` (${m.team2} scorers: ${s2})` : ''}`
    }).join('. ')

    fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ term: "today's matches summary", context: matchContext }),
    })
      .then(r => r.json())
      .then(d => {
        const text = d.explanation || ''
        setSummary(text)
        try { sessionStorage.setItem(cacheKey, text) } catch {/* ignore */}
      })
      .catch(() => setSummary(null))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (displayMatches.length === 0) return null
  const isToday = displayDate === today

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
      {summary && (
        <p className="font-body text-sm text-text-primary leading-relaxed">{summary}</p>
      )}
    </section>
  )
}

// ── Recent matches with recap + YouTube ───────────────────────

function RecentMatches({ matches }: { matches: WCMatch[] }) {
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const dayBefore = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)
  const recent = matches.filter(
    m => m.score && (m.date === yesterday || m.date === dayBefore || m.date === today)
  ).slice(0, 8)

  const [recaps, setRecaps] = useState<Record<string, string>>({})
  const [loadingKey, setLoadingKey] = useState<string | null>(null)

  if (recent.length === 0) return null

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
        <h2 className="font-display text-xl tracking-widest text-text-primary">RECENT MATCHES</h2>
        <p className="font-mono-data text-xs text-text-muted mt-0.5">
          Results from the past 48 hours
        </p>
      </div>
      <div className="divide-y divide-border/20">
        {recent.map((m, i) => {
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
  let line1: React.ReactNode = null
  let line2 = ''

  const completed = worldcupMatches.filter(
    m => m.score && (m.goals1?.length || m.goals2?.length)
  )

  type GoalSide = [WCMatch['goals1'], string, string]

  // P1: first-half hat trick
  outer1:
  for (const m of completed) {
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

  // P2: any hat trick
  if (!line1) {
    outer2:
    for (const m of completed) {
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

  // P3: path difficulty
  if (!line1) {
    const TOUR_AVG_ELO = 1700
    const hardFav = teams
      .filter(t => t.path_difficulty === 'hard')
      .sort((a, b) => b.elo_win_prob - a.elo_win_prob)[0]
    if (hardFav) {
      line1 = (
        <><strong style={{ color: '#C9A027' }}>{hardFav.name}</strong> are among the favorites but face the hardest bracket path. Potential opponents average Elo <strong style={{ color: '#C9A027' }}>{hardFav.avg_potential_opp_elo}</strong>. They earn it if they win.</>
      )
      line2 = hardFav.path_note ?? `Avg potential opp Elo: ${hardFav.avg_potential_opp_elo}.`
    } else {
      const easyUnder = teams
        .filter(t => t.path_difficulty === 'easy' && t.market_win_prob !== null && t.delta !== null && t.delta > 0.04)
        .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0]
      if (easyUnder) {
        const below = easyUnder.avg_potential_opp_elo ? TOUR_AVG_ELO - easyUnder.avg_potential_opp_elo : null
        line1 = (
          <><strong style={{ color: '#C9A027' }}>{easyUnder.name}</strong> have the easiest remaining bracket path. Avg potential opponent Elo <strong style={{ color: '#C9A027' }}>{easyUnder.avg_potential_opp_elo}</strong>{below && below > 0 ? `, ${below} points below tournament average` : ''}. The market may be underpricing them.</>
        )
        line2 = easyUnder.path_note ?? `Model: ${(easyUnder.elo_win_prob * 100).toFixed(1)}% vs Market: ${((easyUnder.market_win_prob ?? 0) * 100).toFixed(1)}%.`
      }
    }
  }

  // P4: 3+ goals in one half
  if (!line1) {
    outer3:
    for (const m of completed) {
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

  // P5: stoppage-time goal
  if (!line1) {
    outer4:
    for (const m of [...completed].reverse()) {
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

  // P6: biggest upset fallback
  if (!line1) {
    const topUpset = descriptive.upsets[0]
    const realMovers = descriptive.elo_movers.filter(
      mv => mv.direction !== 'flat' && /^[A-Za-zÀ-ÿ\s&'()\-.]+$/.test(mv.team) && mv.team.length < 30
    )
    const topMover = realMovers.find(mv => mv.direction === 'up')
    if (topUpset && topUpset.surprise_score > 0.65) {
      const parts = topUpset.match.split(' vs ')
      line1 = <>Biggest shock so far: {parts[0]} beat {parts[1]}. The model gave them only{' '}<strong style={{ color: '#C9A027' }}>{((1 - topUpset.t1_win_prob) * 100).toFixed(0)}%</strong> chance to win.</>
      line2 = `Final score: ${topUpset.score}. Surprise score: ${(topUpset.surprise_score * 100).toFixed(0)}/100.`
    } else if (topMover) {
      line1 = <>{topMover.team} has climbed <strong style={{ color: '#C9A027' }}>{topMover.change} rating points</strong>, the biggest jump of the tournament.</>
      line2 = `Elo went from ${topMover.pre_wc} to ${topMover.current}. Results are exceeding expectations.`
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
  teams, descriptive, worldcupMatches, squadValues, marketSource,
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
            <StatCard label="Matches Played" value={matchesPlayed} sub="Group stage" />
            <StatCard label="Teams Remaining" value={32} sub="at least 0.5% chance" />
            <StatCard label="Final Date" value="Jul 19" sub="MetLife Stadium, NJ" />
            <StatCard label="Simulations" value="10k" sub={`via ${marketSource.replace(/_/g, ' ')}`} />
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

          <OpponentStrength oppStrength={descriptive.opp_strength} />

          <div className="pb-2" />
        </div>
      )}

      {/* PREDICTIONS */}
      {activeTab === 'PREDICTIONS' && (
        <div className="space-y-6">
          <MyPrediction />

          <HeadToHead teams={teams} />

          <WinProbDoughnut teams={teams} />

          <AccuracyTracker showFullExplanation />

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
        <KnockoutBracket matches={worldcupMatches} />
      )}
    </div>
  )
}
