import { WCMatch } from '@/lib/types'

const FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Spain: '🇪🇸', Argentina: '🇦🇷',
  Germany: '🇩🇪', Morocco: '🇲🇦', USA: '🇺🇸', Norway: '🇳🇴', Japan: '🇯🇵',
  Portugal: '🇵🇹', Netherlands: '🇳🇱', Mexico: '🇲🇽', Colombia: '🇨🇴', Uruguay: '🇺🇾',
  Belgium: '🇧🇪', Croatia: '🇭🇷', Switzerland: '🇨🇭', Australia: '🇦🇺', Ecuador: '🇪🇨',
  Senegal: '🇸🇳', Ghana: '🇬🇭', 'South Korea': '🇰🇷', Canada: '🇨🇦', Turkey: '🇹🇷',
  Algeria: '🇩🇿', Egypt: '🇪🇬', Iran: '🇮🇷', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', Paraguay: '🇵🇾',
  Austria: '🇦🇹', Sweden: '🇸🇪', 'Saudi Arabia': '🇸🇦', 'Cape Verde': '🇨🇻', 'Cabo Verde': '🇨🇻',
  'Bosnia and Herzegovina': '🇧🇦', 'Bosnia & Herzegovina': '🇧🇦',
  'New Zealand': '🇳🇿', 'DR Congo': '🇨🇩', Iraq: '🇮🇶', Jordan: '🇯🇴',
  Haiti: '🇭🇹', Panama: '🇵🇦', 'South Africa': '🇿🇦', 'Czech Republic': '🇨🇿',
  Qatar: '🇶🇦', Curacao: '🇨🇼', Uzbekistan: '🇺🇿', 'Ivory Coast': '🇨🇮',
  Tunisia: '🇹🇳',
}

interface StandingEntry {
  team: string
  P: number; W: number; D: number; L: number
  GF: number; GA: number; GD: number; Pts: number
}

function computeStandings(matches: WCMatch[]): Record<string, StandingEntry[]> {
  const raw: Record<string, Record<string, StandingEntry>> = {}

  for (const m of matches) {
    if (!m.group) continue
    if (!raw[m.group]) raw[m.group] = {}
    for (const team of [m.team1, m.team2]) {
      if (!raw[m.group][team]) {
        raw[m.group][team] = { team, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 }
      }
    }
    if (!m.score) continue
    const [g1, g2] = m.score.ft
    const t1 = raw[m.group][m.team1]
    const t2 = raw[m.group][m.team2]
    t1.P++; t2.P++
    t1.GF += g1; t1.GA += g2; t1.GD = t1.GF - t1.GA
    t2.GF += g2; t2.GA += g1; t2.GD = t2.GF - t2.GA
    if (g1 > g2) { t1.W++; t1.Pts += 3; t2.L++ }
    else if (g1 < g2) { t2.W++; t2.Pts += 3; t1.L++ }
    else { t1.D++; t1.Pts++; t2.D++; t2.Pts++ }
  }

  const result: Record<string, StandingEntry[]> = {}
  for (const [group, teams] of Object.entries(raw)) {
    result[group] = Object.values(teams).sort(
      (a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF || a.team.localeCompare(b.team)
    )
  }
  return result
}

interface GroupStandingsProps {
  matches: WCMatch[]
}

export default function GroupStandings({ matches }: GroupStandingsProps) {
  const standings = computeStandings(matches)
  const groups = Object.keys(standings).sort()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl tracking-widest text-ink">GROUP STAGE STANDINGS</h2>
        <p className="font-mono-data text-xs text-ink-muted mt-1">Live standings computed from match results</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map((group) => {
          const rows = standings[group]
          const allPlayed3 = rows.every((r) => r.P === 3)

          return (
            <div key={group} className="bg-card border border-border rounded-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border">
                <h3 className="font-display text-base tracking-widest text-text-primary">{group}</h3>
              </div>
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
              <table style={{ minWidth: 420, width: '100%' }}>
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="text-left py-1.5 px-3 font-mono-data text-[9px] text-text-muted uppercase w-28">Team</th>
                    <th className="text-center py-1.5 px-1 font-mono-data text-[9px] text-text-muted uppercase w-6">P</th>
                    <th className="text-center py-1.5 px-1 font-mono-data text-[9px] text-text-muted uppercase w-6">W</th>
                    <th className="text-center py-1.5 px-1 font-mono-data text-[9px] text-text-muted uppercase w-6">D</th>
                    <th className="text-center py-1.5 px-1 font-mono-data text-[9px] text-text-muted uppercase w-6">L</th>
                    <th className="text-center py-1.5 px-1 font-mono-data text-[9px] text-text-muted uppercase w-8">GF</th>
                    <th className="text-center py-1.5 px-1 font-mono-data text-[9px] text-text-muted uppercase w-8">GA</th>
                    <th className="text-center py-1.5 px-1 font-mono-data text-[9px] text-text-muted uppercase w-8">GD</th>
                    <th className="text-center py-1.5 px-3 font-mono-data text-[9px] text-text-muted uppercase w-8">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const isThrough = idx < 2
                    const isEliminated = allPlayed3 && idx === 3 && row.Pts === 0
                    return (
                      <tr
                        key={row.team}
                        className="border-b border-border/20"
                        style={{
                          borderLeft: isThrough ? '3px solid #1D9E75' : '3px solid transparent',
                          opacity: isEliminated ? 0.45 : 1,
                        }}
                      >
                        <td className="py-1.5 px-3 font-body text-xs text-text-primary max-w-0 truncate">
                          <span className="mr-1.5 leading-none">{FLAGS[row.team] ?? '⚽'}</span>
                          {row.team}
                        </td>
                        <td className="py-1.5 px-1 text-center font-mono-data text-xs text-text-muted">{row.P}</td>
                        <td className="py-1.5 px-1 text-center font-mono-data text-xs text-text-primary">{row.W}</td>
                        <td className="py-1.5 px-1 text-center font-mono-data text-xs text-text-muted">{row.D}</td>
                        <td className="py-1.5 px-1 text-center font-mono-data text-xs text-text-muted">{row.L}</td>
                        <td className="py-1.5 px-1 text-center font-mono-data text-xs text-text-muted">{row.GF}</td>
                        <td className="py-1.5 px-1 text-center font-mono-data text-xs text-text-muted">{row.GA}</td>
                        <td className="py-1.5 px-1 text-center font-mono-data text-xs text-text-muted">
                          {row.GD > 0 ? `+${row.GD}` : row.GD}
                        </td>
                        <td className="py-1.5 px-3 text-center font-mono-data text-sm font-medium text-text-primary">{row.Pts}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )
        })}
      </div>

      <p className="font-mono-data text-xs text-ink-muted text-center pb-4">
        Top 2 per group + 8 best 3rd-place teams advance to the Round of 32
      </p>
    </div>
  )
}
