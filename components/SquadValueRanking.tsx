'use client'

import { useMemo, useState } from 'react'
import { WCMatch } from '@/lib/types'
import { getFlag } from '@/lib/flags'

interface SquadValueRankingProps {
  worldcupMatches: WCMatch[]
  squadValues: Record<string, number>
}

const DEFAULT_VISIBLE = 8

// Names that differ between worldcup.json and squad_values.json
const NAME_ALIASES: Record<string, string> = {
  'Ivory Coast': "Cote d'Ivoire",
  "Côte d'Ivoire": "Cote d'Ivoire",
}

function lookupSquadValue(squadValues: Record<string, number>, name: string): number | null {
  if (squadValues[name] !== undefined) return squadValues[name]
  const alias = NAME_ALIASES[name]
  if (alias && squadValues[alias] !== undefined) return squadValues[alias]
  if (name.includes(' & ')) {
    const alt = name.replace(' & ', ' and ')
    if (squadValues[alt] !== undefined) return squadValues[alt]
  } else if (name.includes(' and ')) {
    const alt = name.replace(' and ', ' & ')
    if (squadValues[alt] !== undefined) return squadValues[alt]
  }
  return null
}

function formatSquadValue(val: number): string {
  const m = val / 1_000_000
  if (m >= 1000) return `€${(m / 1000).toFixed(1).replace(/\.0$/, '')}B`
  return `€${Math.round(m)}M`
}

export default function SquadValueRanking({ worldcupMatches, squadValues }: SquadValueRankingProps) {
  const [expanded, setExpanded] = useState(false)

  const ranked = useMemo(() => {
    const r32Teams = new Set<string>()
    for (const m of worldcupMatches) {
      if (m.round !== 'Round of 32') continue
      r32Teams.add(m.team1)
      r32Teams.add(m.team2)
    }
    return Array.from(r32Teams)
      .map(name => ({ name, value: lookupSquadValue(squadValues, name) ?? 0 }))
      .sort((a, b) => b.value - a.value)
  }, [worldcupMatches, squadValues])

  if (ranked.length === 0) return null

  const maxValue = ranked[0].value
  const visible = expanded ? ranked : ranked.slice(0, DEFAULT_VISIBLE)

  return (
    <section
      className="rounded-sm px-5 py-4"
      style={{ background: 'rgba(7,9,14,0.8)', border: '1px solid rgba(227,194,126,0.3)' }}
    >
      <h2 className="font-display text-xl tracking-widest text-text-primary">SQUAD VALUE RANKING</h2>
      <p className="font-mono-data text-xs text-text-muted mt-0.5">
        Total market value of each Round of 32 squad · Transfermarkt
      </p>
      <p className="font-body text-sm text-text-muted mt-2 leading-relaxed">
        Squad value measures the combined transfer market worth of each squad — a proxy for talent and depth.
        It seeds each team&apos;s starting Elo rating before match history adjusts it.
      </p>

      <div className="mt-4 space-y-2.5">
        {visible.map((team, i) => (
          <div key={team.name}>
            <div className="flex items-center gap-3">
              <span className="font-mono-data text-text-muted" style={{ fontSize: 12, width: 20, flexShrink: 0 }}>
                {i + 1}
              </span>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{getFlag(team.name)}</span>
              <span className="font-body text-text-primary flex-1 truncate" style={{ fontSize: 14 }}>
                {team.name}
              </span>
              <span className="font-mono-data font-medium" style={{ fontSize: 14, color: '#e3c27e', flexShrink: 0 }}>
                {formatSquadValue(team.value)}
              </span>
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 4 }}>
              <div
                style={{
                  height: 3,
                  width: `${maxValue > 0 ? (team.value / maxValue) * 100 : 0}%`,
                  background: '#e3c27e',
                  opacity: 0.4,
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {ranked.length > DEFAULT_VISIBLE && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="font-mono-data text-[11px] mt-4 hover:opacity-80 transition-opacity"
          style={{ color: '#e3c27e' }}
        >
          {expanded ? 'Show less ↑' : `Show all ${ranked.length} teams ↓`}
        </button>
      )}
    </section>
  )
}
