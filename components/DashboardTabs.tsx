'use client'

import { useState } from 'react'
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
import SmallestNations from './SmallestNations'
import FunFact from './FunFact'
import GroupStandings from './GroupStandings'
import KnockoutBracket from './KnockoutBracket'
import DailyMovers from './DailyMovers'
import AccuracyTracker from './AccuracyTracker'
import MyPrediction from './MyPrediction'
import Poll from './Poll'
import HeadToHead from './HeadToHead'

// ── Time helpers ─────────────────────────────────────────────

function toPST(timeStr: string): string {
  const m = timeStr.match(/(\d+):(\d+)\s+UTC([+-]\d+)/)
  if (!m) return timeStr
  const localH = parseInt(m[1])
  const localM = parseInt(m[2])
  const offset = parseInt(m[3])
  const pstH = ((localH - offset - 7) % 24 + 24) % 24
  const h12 = pstH % 12 || 12
  const ampm = pstH < 12 ? 'am' : 'pm'
  return `${h12}:${localM.toString().padStart(2, '0')} ${ampm} PST`
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
          line1 = <>{player} scored a first-half hat trick for <strong className="text-accent">{team}</strong> against {opp} — all three before the break.</>
          line2 = `Minutes: ${mins.map(min => `${min}'`).join(', ')} — the cleanest kind of hat trick.`
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
            line1 = <>{player} scored a hat trick for <strong className="text-accent">{team}</strong> against {opp} ({mins.map(min => `${min}'`).join(', ')}).</>
            line2 = `Final: ${m.score!.ft[0]}–${m.score!.ft[1]}.`
            break outer2
          }
        }
      }
    }
  }

  // P3: path difficulty stat
  if (!line1) {
    const TOUR_AVG_ELO = 1700
    const hardFav = teams
      .filter(t => t.path_difficulty === 'hard')
      .sort((a, b) => b.elo_win_prob - a.elo_win_prob)[0]
    if (hardFav) {
      line1 = (
        <>
          <strong className="text-accent">{hardFav.name}</strong> are among the favorites but face
          the hardest bracket path — potential opponents average Elo{' '}
          <strong className="text-accent">{hardFav.avg_potential_opp_elo}</strong>. They earn it if they win.
        </>
      )
      line2 = hardFav.path_note ?? `Avg potential opp Elo: ${hardFav.avg_potential_opp_elo}.`
    } else {
      const easyUnder = teams
        .filter(
          t =>
            t.path_difficulty === 'easy' &&
            t.market_win_prob !== null &&
            t.delta !== null &&
            t.delta > 0.04
        )
        .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0]
      if (easyUnder) {
        const below = easyUnder.avg_potential_opp_elo
          ? TOUR_AVG_ELO - easyUnder.avg_potential_opp_elo
          : null
        line1 = (
          <>
            <strong className="text-accent">{easyUnder.name}</strong> have the easiest remaining bracket
            path — avg potential opponent Elo{' '}
            <strong className="text-accent">{easyUnder.avg_potential_opp_elo}</strong>
            {below && below > 0 ? `, ${below} rating points below tournament average` : ''}.
            The market may be underpricing them.
          </>
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
          line1 = <><strong className="text-accent">{team}</strong> scored {n} goals in the {half} half alone against {opp}.</>
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
        line1 = <>{stGoal.name} scored in stoppage time ({stGoal.minute}&apos;) to {outcome} for <strong className="text-accent">{team}</strong> against {opp}.</>
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
      line1 = <>Biggest shock so far: {parts[0]} beat {parts[1]} — my model gave them only{' '}<strong className="text-accent">{((1 - topUpset.t1_win_prob) * 100).toFixed(0)}%</strong> chance to win.</>
      line2 = `Final score: ${topUpset.score}. Surprise score: ${(topUpset.surprise_score * 100).toFixed(0)}/100.`
    } else if (topMover) {
      line1 = <>{topMover.team} has climbed <strong className="text-accent">{topMover.change} rating points</strong>, the biggest jump of the tournament.</>
      line2 = `Elo went from ${topMover.pre_wc} to ${topMover.current} — results are exceeding expectations.`
    }
  }

  if (!line1) return null

  return (
    <div className="bg-card border-l-4 border-accent rounded-sm px-5 py-4">
      <p className="font-mono-data text-[10px] text-accent uppercase tracking-widest mb-2">
        Crazy stat of the day
      </p>
      <p className="font-body text-base text-text-primary leading-snug mb-1">{line1}</p>
      <p className="font-mono-data text-xs text-text-muted">{line2}</p>
    </div>
  )
}

// ── Today's matches ────────────────────────────────────────────

function TodayMatches({ matches }: { matches: WCMatch[] }) {
  const today = new Date().toISOString().slice(0, 10)
  const todayMatches = matches.filter(m => m.date === today)
  const upcoming = matches
    .filter(m => m.date > today && !m.score)
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <section className="bg-card border border-border rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <h2 className="font-display text-xl tracking-widest text-text-primary">TODAY&apos;S MATCHES</h2>
        <span className="font-mono-data text-xs text-text-muted">{today}</span>
      </div>
      {todayMatches.length === 0 ? (
        <div className="px-5 py-4">
          <p className="font-body text-sm text-text-muted">No matches today.</p>
          {upcoming[0] && (
            <p className="font-mono-data text-xs text-text-muted mt-1">
              Next up: {upcoming[0].date} — {upcoming[0].team1} vs {upcoming[0].team2}
            </p>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {todayMatches.map((m, i) => {
            const played = !!m.score
            const pst = m.time ? toPST(m.time) : null
            return (
              <div key={i} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {m.group && (
                    <span className="font-mono-data text-[10px] text-accent border border-accent/50 px-1.5 py-0.5 rounded-sm shrink-0">
                      {m.group}
                    </span>
                  )}
                  <span className="font-body text-sm font-medium text-text-primary truncate">
                    {m.team1} <span className="text-text-muted font-normal">vs</span> {m.team2}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  {played ? (
                    <span className="font-display text-lg text-text-primary tracking-wide">
                      {m.score!.ft[0]}–{m.score!.ft[1]}
                    </span>
                  ) : (
                    <span className="font-mono-data text-xs text-teal">{pst}</span>
                  )}
                  {m.ground && (
                    <p className="font-mono-data text-[10px] text-text-muted mt-0.5">
                      {m.ground.split(' (')[0]}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ── Upcoming predictions ───────────────────────────────────────

function UpcomingPredictions({
  matches,
  teams,
}: {
  matches: WCMatch[]
  teams: TeamComparison[]
}) {
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const upcoming = matches.filter(m => !m.score && (m.date === today || m.date === tomorrow))
  const [explains, setExplains] = useState<Record<string, string>>({})
  const [explainOpen, setExplainOpen] = useState<Record<string, boolean>>({})
  const [loadingExplain, setLoadingExplain] = useState<Record<string, boolean>>({})

  if (upcoming.length === 0) return null

  async function getExplain(m: WCMatch) {
    const key = `${m.team1}-${m.team2}`
    if (explains[key]) {
      setExplainOpen(o => ({ ...o, [key]: !o[key] }))
      return
    }
    setLoadingExplain(l => ({ ...l, [key]: true }))
    setExplainOpen(o => ({ ...o, [key]: true }))
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term: 'match significance',
          context: `${m.team1} vs ${m.team2} in ${m.round || 'the World Cup'}`,
        }),
      })
      const data = await res.json()
      setExplains(e => ({ ...e, [key]: data.explanation || '' }))
    } catch {
      setExplains(e => ({ ...e, [key]: 'Context unavailable.' }))
    } finally {
      setLoadingExplain(l => ({ ...l, [key]: false }))
    }
  }

  return (
    <div className="space-y-3">
      <p className="font-mono-data text-[10px] text-text-muted uppercase tracking-widest">
        Upcoming Predictions
      </p>
      {upcoming.map((m, i) => {
        const t1 = teams.find(t => t.name === m.team1)
        const t2 = teams.find(t => t.name === m.team2)
        const p1 = t1?.elo_win_prob ?? 0
        const p2 = t2?.elo_win_prob ?? 0
        const total = p1 + p2
        const norm1 = total > 0 ? p1 / total : 0.5
        const norm2 = total > 0 ? p2 / total : 0.5
        const fav = norm1 >= norm2 ? m.team1 : m.team2
        const favPct = Math.max(norm1, norm2) * 100
        const confidence = favPct >= 65 ? 'high confidence' : favPct >= 55 ? 'slight edge' : 'coin flip'
        const key = `${m.team1}-${m.team2}`
        const isOpen = explainOpen[key]
        return (
          <div
            key={i}
            className="bg-card border border-border rounded-sm overflow-hidden"
            style={{ borderLeft: '3px solid #D4622A' }}
          >
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-body text-sm text-text-primary">
                  {m.team1} vs {m.team2}
                </span>
                <span className="font-mono-data text-[10px] text-text-muted">{m.date}</span>
              </div>
              {total > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="font-mono-data text-xs text-text-muted">
                    Model: <span className="text-teal">{fav}</span> to win ·{' '}
                    <span className="text-accent">{confidence}</span>
                  </p>
                  <div className="flex justify-between font-mono-data text-[10px] text-text-muted">
                    <span>{(norm1 * 100).toFixed(0)}%</span>
                    <span>{(norm2 * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 flex rounded-sm overflow-hidden">
                    <div style={{ width: `${norm1 * 100}%`, backgroundColor: '#1D9E75' }} />
                    <div style={{ flex: 1, backgroundColor: '#5C3D2E' }} />
                  </div>
                </div>
              )}
              <button
                onClick={() => getExplain(m)}
                className="mt-2 font-mono-data text-[10px] text-text-muted hover:text-text-primary transition-colors"
              >
                {isOpen ? 'Show less ↑' : 'Why this matters ↓'}
              </button>
              {isOpen && (
                <p className="mt-1 font-body text-xs text-text-muted italic">
                  {loadingExplain[key] ? 'Loading...' : explains[key] || ''}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Yesterday's matches ────────────────────────────────────────

function YesterdayMatches({ matches }: { matches: WCMatch[] }) {
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const dayBefore = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)
  const recent = matches.filter(
    m => m.score && (m.date === yesterday || m.date === dayBefore)
  )
  const [recaps, setRecaps] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  if (recent.length === 0) return null

  async function getRecap(m: WCMatch) {
    const key = `${m.team1}-${m.team2}-${m.date}`
    if (recaps[key] || loading[key]) return
    setLoading(l => ({ ...l, [key]: true }))
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
      setLoading(l => ({ ...l, [key]: false }))
    }
  }

  return (
    <section className="bg-card border border-border rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h2 className="font-display text-xl tracking-widest text-text-primary">
          YESTERDAY&apos;S MATCHES
        </h2>
      </div>
      <div className="divide-y divide-border/40">
        {recent.map((m, i) => {
          const key = `${m.team1}-${m.team2}-${m.date}`
          return (
            <div key={i} className="px-5 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-body text-sm text-text-primary">
                  {m.team1}{' '}
                  <span className="font-display text-lg mx-2">
                    {m.score!.ft[0]}–{m.score!.ft[1]}
                  </span>{' '}
                  {m.team2}
                </span>
                <button
                  onClick={() => getRecap(m)}
                  className="font-mono-data text-xs px-2 py-1 rounded-sm transition-colors"
                  style={{ background: '#D4622A', color: '#F0E8D8' }}
                >
                  {loading[key] ? 'Generating...' : 'Get recap ↗'}
                </button>
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

// ── Main DashboardTabs ────────────────────────────────────────

interface DashboardTabsProps {
  teams: TeamComparison[]
  descriptive: DescriptiveData
  funFacts: FunFactsData
  worldcupMatches: WCMatch[]
  squadValues: Record<string, number>
  marketSource: string
  generatedAt: string
}

const TABS = ['TODAY', 'GROUPS', 'BRACKET'] as const
type Tab = typeof TABS[number]

export default function DashboardTabs({
  teams, descriptive, funFacts, worldcupMatches, squadValues, marketSource,
}: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('TODAY')

  const matchesPlayed = descriptive.goal_timing.total_goals > 0
    ? Math.round(descriptive.goal_timing.total_goals / 2.83)
    : 0

  return (
    <div className="space-y-0">
      {/* Tab navigation */}
      <div className="bg-card rounded-sm overflow-hidden flex mb-6">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="relative px-6 py-3 font-display text-sm tracking-widest transition-colors"
            style={{
              color: activeTab === tab ? '#F0E8D8' : '#C4A882',
              borderBottom: activeTab === tab ? '2px solid #D4622A' : '2px solid transparent',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TODAY */}
      {activeTab === 'TODAY' && (
        <div className="space-y-6">
          {/* 1. Daily movers */}
          <DailyMovers />

          {/* 2. Accuracy tracker */}
          <AccuracyTracker />

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Matches Played" value={matchesPlayed} sub="Group stage" />
            <StatCard label="Teams Remaining" value={32} sub="≥ 0.5% win prob" />
            <StatCard label="Final Date" value="Jul 19" sub="MetLife Stadium, NJ" />
            <StatCard label="Simulations" value="10k" sub={`via ${marketSource.replace(/_/g, ' ')}`} />
          </div>

          {/* 3. My prediction */}
          <MyPrediction />

          {/* 4. Crazy stat */}
          <CrazyStatOfDay descriptive={descriptive} worldcupMatches={worldcupMatches} teams={teams} />

          {/* 5. Today's matches + upcoming predictions */}
          <TodayMatches matches={worldcupMatches} />
          <UpcomingPredictions matches={worldcupMatches} teams={teams} />

          {/* 6. Yesterday's matches */}
          <YesterdayMatches matches={worldcupMatches} />

          {/* 7. Head to head */}
          <HeadToHead teams={teams} />

          {/* 8. Poll */}
          <Poll />

          {/* 9. Win probability doughnut */}
          <WinProbDoughnut teams={teams} />

          {/* 10. Win probability table */}
          <ProbabilityTable teams={teams} squadValues={squadValues} />

          {/* 11. Hot & Cold */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GoldenBoot entries={descriptive.golden_boot} />
            <EloMovers movers={descriptive.elo_movers} />
          </div>

          {/* 12. Goal timing */}
          <GoalTiming
            bins={descriptive.goal_timing.bins}
            totalGoals={descriptive.goal_timing.total_goals}
            mostProductivePeriod={descriptive.goal_timing.most_productive_period}
            goldenBoot={descriptive.golden_boot}
          />

          {/* 13. Biggest upsets */}
          <BiggestUpsets upsets={descriptive.upsets} />

          {/* 14. Opponent strength */}
          <OpponentStrength oppStrength={descriptive.opp_strength} />

          {/* 15. Smallest nations */}
          <SmallestNations nations={funFacts.quirky_angles.smallest_nations} />

          {/* 16. Fun facts */}
          <FunFact patterns={funFacts.historical_patterns} />

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
