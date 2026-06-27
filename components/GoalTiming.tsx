'use client'

import { useState, useMemo } from 'react'
import { GoalTimingBins, GoldenBootEntry } from '@/lib/types'

interface GoalTimingProps {
  bins: GoalTimingBins
  totalGoals: number
  mostProductivePeriod: string
  goldenBoot: GoldenBootEntry[]
}

const BIN_LABELS: Array<{ key: keyof GoalTimingBins; label: string; late: boolean }> = [
  { key: '0-15', label: "0–15'", late: false },
  { key: '16-30', label: "16–30'", late: false },
  { key: '31-45', label: "31–45'", late: false },
  { key: '46-60', label: "46–60'", late: false },
  { key: '61-75', label: "61–75'", late: false },
  { key: '76-90', label: "76–90'", late: true },
  { key: '90+', label: "90+'", late: true },
]

const BIN_ORDER: Array<keyof GoalTimingBins> = ['0-15', '16-30', '31-45', '46-60', '61-75', '76-90', '90+']

function parseMinute(m: string): number {
  const plusIdx = m.indexOf('+')
  return plusIdx !== -1 ? parseInt(m.slice(0, plusIdx)) : parseInt(m)
}

function binGoals(minutes: number[]): GoalTimingBins {
  const result: GoalTimingBins = { '0-15': 0, '16-30': 0, '31-45': 0, '46-60': 0, '61-75': 0, '76-90': 0, '90+': 0 }
  for (const m of minutes) {
    if (m <= 15) result['0-15']++
    else if (m <= 30) result['16-30']++
    else if (m <= 45) result['31-45']++
    else if (m <= 60) result['46-60']++
    else if (m <= 75) result['61-75']++
    else result['76-90']++
  }
  return result
}

export default function GoalTiming({ bins, totalGoals, mostProductivePeriod, goldenBoot }: GoalTimingProps) {
  const [selectedTeam, setSelectedTeam] = useState('')

  const teams = useMemo(() => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const e of goldenBoot) {
      if (!seen.has(e.team)) { seen.add(e.team); result.push(e.team) }
    }
    return result.sort()
  }, [goldenBoot])

  const activeBins = useMemo(() => {
    if (!selectedTeam) return bins
    const teamEntries = goldenBoot.filter((e) => e.team === selectedTeam)
    const minutes = teamEntries.flatMap((e) => e.minutes.map(parseMinute))
    return binGoals(minutes)
  }, [selectedTeam, bins, goldenBoot])

  const activeTotal = useMemo(() => {
    if (!selectedTeam) return totalGoals
    return goldenBoot.filter((e) => e.team === selectedTeam).reduce((s, e) => s + e.goals, 0)
  }, [selectedTeam, totalGoals, goldenBoot])

  const activePeak = useMemo(() => {
    let max = -1
    let peak = mostProductivePeriod
    for (const key of BIN_ORDER) {
      if (activeBins[key] > max) { max = activeBins[key]; peak = key }
    }
    return peak
  }, [activeBins, mostProductivePeriod])

  const maxCount = Math.max(...Object.values(activeBins))

  return (
    <section className="bg-card border border-border rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl tracking-widest text-text-primary">
            GOAL TIMING
          </h2>
          <p className="font-mono-data text-xs text-text-muted mt-0.5">
            When goals are scored · {activeTotal} total
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-mono-data text-[10px] text-text-muted">Peak period</p>
            <p className="font-display text-lg text-accent tracking-wider">
              {activePeak}&apos;
            </p>
          </div>
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="font-mono-data text-xs text-text-primary bg-card border border-border rounded-sm px-2 py-1.5 cursor-pointer focus:outline-none focus:border-accent"
          >
            <option value="">All teams</option>
            {teams.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        {BIN_LABELS.map(({ key, label, late }) => {
          const count = activeBins[key]
          const barPct = maxCount > 0 ? (count / maxCount) * 100 : 0
          const sharePct = activeTotal > 0 ? ((count / activeTotal) * 100).toFixed(1) : '0.0'

          return (
            <div key={key} className="flex items-center gap-3">
              <span className="font-mono-data text-xs text-text-muted w-14 shrink-0">
                {label}
              </span>
              <div className="flex-1 h-5 bg-border/20 rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm transition-all duration-300"
                  style={{
                    width: `${barPct}%`,
                    backgroundColor: late ? '#D4622A' : '#1D9E75',
                  }}
                />
              </div>
              <div className="flex items-center gap-2 w-20 justify-end shrink-0">
                <span className="font-mono-data text-xs font-medium text-text-primary">
                  {count}
                </span>
                <span className="font-mono-data text-[10px] text-text-muted">
                  {sharePct}%
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="px-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-teal" />
            <span className="font-mono-data text-[10px] text-text-muted">Early / mid</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-accent" />
            <span className="font-mono-data text-[10px] text-text-muted">Late game (76+)</span>
          </div>
        </div>
        <span className="font-mono-data text-[10px] text-text-muted italic">
          showing goals scored, not conceded
        </span>
      </div>
    </section>
  )
}
