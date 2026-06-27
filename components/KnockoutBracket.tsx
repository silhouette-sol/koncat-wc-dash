import { WCMatch } from '@/lib/types'

const FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Spain: '🇪🇸', Argentina: '🇦🇷',
  Germany: '🇩🇪', Morocco: '🇲🇦', USA: '🇺🇸', Norway: '🇳🇴', Japan: '🇯🇵',
  Portugal: '🇵🇹', Netherlands: '🇳🇱', Mexico: '🇲🇽', Colombia: '🇨🇴', Uruguay: '🇺🇾',
  Belgium: '🇧🇪', Croatia: '🇭🇷', Switzerland: '🇨🇭', Australia: '🇦🇺', Ecuador: '🇪🇨',
  Senegal: '🇸🇳', Ghana: '🇬🇭', 'South Korea': '🇰🇷', Canada: '🇨🇦', Turkey: '🇹🇷',
  Algeria: '🇩🇿', Egypt: '🇪🇬', Iran: '🇮🇷', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', Paraguay: '🇵🇾',
  Austria: '🇦🇹', Sweden: '🇸🇪', 'Saudi Arabia': '🇸🇦', 'Cape Verde': '🇨🇻',
  'Bosnia and Herzegovina': '🇧🇦', 'Bosnia & Herzegovina': '🇧🇦',
  'New Zealand': '🇳🇿', 'DR Congo': '🇨🇩', Iraq: '🇮🇶', Jordan: '🇯🇴',
  Haiti: '🇭🇹', Panama: '🇵🇦', 'South Africa': '🇿🇦', 'Czech Republic': '🇨🇿',
  Qatar: '🇶🇦', Curacao: '🇨🇼', Uzbekistan: '🇺🇿', 'Ivory Coast': '🇨🇮',
}

// Layout constants
const SW = 160   // slot width
const SH = 70    // slot height
const CW = 28    // connector space between columns
const UNIT = 80  // SH + 10px gap
const HH = 36    // header height for round labels
const TOTAL_W = 9 * SW + 8 * CW       // 1664
const TOTAL_H = HH + 8 * UNIT - (UNIT - SH)  // 666

const COL_LABELS = ['R32', 'R16', 'QF', 'SF', 'FINAL', 'SF', 'QF', 'R16', 'R32']

// Left edge x of column c (0=R32_L … 4=FINAL … 8=R32_R)
function cx(c: number) { return c * (SW + CW) }

// Top of match slot: roundIdx r (0=R32…3=SF), match index i within that side
function st(r: number, i: number) {
  const step = UNIT * (1 << r)
  return HH + (step - UNIT) / 2 + i * step
}

// Center Y of slot
function cy(r: number, i: number) { return st(r, i) + SH / 2 }

function isTBD(name: string) {
  return /^[0-9WL]/.test(name) || name.includes('/') || name === 'TBD'
}

function getWinner(m: WCMatch): string | null {
  if (!m.score) return null
  const [g1, g2] = m.score.ft
  return g1 > g2 ? m.team1 : g2 > g1 ? m.team2 : null
}

interface CardProps { match: WCMatch; x: number; y: number; relative?: boolean }

function MatchCard({ match, x, y, relative }: CardProps) {
  const winner = getWinner(match)
  const allTbd = isTBD(match.team1) && isTBD(match.team2)
  const played = !!match.score
  const border = allTbd ? '1px dashed #D4B896' : played ? '1px solid #D4B896' : '1px solid #7A5C45'

  const teamRow = (team: string, goals: number | null, isWin: boolean) => {
    const tbd = isTBD(team)
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 26, padding: '0 6px',
        borderLeft: isWin ? '3px solid #1D9E75' : '3px solid transparent',
        opacity: played && !isWin && winner !== null ? 0.4 : 1,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, overflow: 'hidden' }}>
          {!tbd && <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0 }}>{FLAGS[team] ?? ''}</span>}
          <span style={{
            fontSize: 11, color: tbd ? '#C4A882' : '#F0E8D8',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {tbd ? 'TBD' : team}
          </span>
        </span>
        {goals !== null && (
          <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, flexShrink: 0, marginLeft: 4,
            color: isWin ? '#1D9E75' : '#C4A882' }}>
            {goals}
          </span>
        )}
      </div>
    )
  }

  const g1 = match.score?.ft[0] ?? null
  const g2 = match.score?.ft[1] ?? null

  return (
    <div style={{
      position: relative ? 'relative' : 'absolute',
      left: relative ? undefined : x,
      top: relative ? undefined : y,
      width: SW, height: SH,
      background: '#5C3D2E', border, borderRadius: 3, overflow: 'hidden',
    }}>
      <div style={{
        height: 18, display: 'flex', alignItems: 'center',
        padding: '0 6px', borderBottom: '1px solid rgba(212,184,150,0.25)',
        fontSize: 8, fontFamily: 'monospace', color: '#C4A882',
        overflow: 'hidden', whiteSpace: 'nowrap',
      }}>
        {match.date}{match.ground ? ` · ${match.ground.split(' (')[0].substring(0, 22)}` : ''}
      </div>
      {teamRow(match.team1, g1, winner === match.team1)}
      <div style={{ height: 1, background: 'rgba(212,184,150,0.2)' }} />
      {teamRow(match.team2, g2, winner === match.team2)}
    </div>
  )
}

interface Line { x1: number; y1: number; x2: number; y2: number }

function buildLines(): Line[] {
  const lines: Line[] = []
  const add = (x1: number, y1: number, x2: number, y2: number) => lines.push({ x1, y1, x2, y2 })

  // Left side: cols 0→1→2→3→4
  const leftPairs = [4, 2, 1]  // pairs per connection step
  for (let step = 0; step < 3; step++) {
    const c = step
    const midX = cx(c) + SW + CW / 2
    for (let i = 0; i < leftPairs[step]; i++) {
      const yTop = cy(c, 2 * i)
      const yBot = cy(c, 2 * i + 1)
      const yMid = cy(c + 1, i)
      add(cx(c) + SW, yTop, midX, yTop)
      add(cx(c) + SW, yBot, midX, yBot)
      add(midX, yTop, midX, yBot)
      add(midX, yMid, cx(c + 1), yMid)
    }
  }
  // SF_L → Final
  add(cx(3) + SW, cy(3, 0), cx(4), cy(3, 0))

  // Right side: cols 8→7→6→5→4
  const rightPairs = [4, 2, 1]
  for (let step = 0; step < 3; step++) {
    const c = 8 - step
    const rIdx = step       // round index on the right side
    const midX = cx(c) - CW / 2
    for (let i = 0; i < rightPairs[step]; i++) {
      const yTop = cy(rIdx, 2 * i)
      const yBot = cy(rIdx, 2 * i + 1)
      const yMid = cy(rIdx + 1, i)
      add(cx(c), yTop, midX, yTop)
      add(cx(c), yBot, midX, yBot)
      add(midX, yTop, midX, yBot)
      add(midX, yMid, cx(c - 1) + SW, yMid)
    }
  }
  // SF_R → Final
  add(cx(5), cy(3, 0), cx(4) + SW, cy(3, 0))

  return lines
}

const LINES = buildLines()

export default function KnockoutBracket({ matches }: { matches: WCMatch[] }) {
  const byDate = (a: WCMatch, b: WCMatch) =>
    a.date.localeCompare(b.date) || (a.num ?? 0) - (b.num ?? 0)

  function split(round: string, nLeft: number) {
    const ms = matches.filter((m) => m.round === round).sort(byDate)
    return { left: ms.slice(0, nLeft), right: ms.slice(nLeft) }
  }

  const r32 = split('Round of 32', 8)
  const r16 = split('Round of 16', 4)
  const qf  = split('Quarter-final', 2)
  const sf  = split('Semi-final', 1)
  const fin = matches.find((m) => m.round === 'Final')
  const bronze = matches.find((m) => m.round === 'Match for third place')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl tracking-widest text-ink">KNOCKOUT BRACKET</h2>
        <p className="font-mono-data text-xs text-ink-muted mt-1">
          Teams advance inward from R32 to the Final at center · teal border = winner · dashed = TBD
        </p>
      </div>

      <div className="overflow-x-auto pb-4">
        <div style={{ position: 'relative', width: TOTAL_W, height: TOTAL_H, minWidth: 900 }}>

          {/* SVG layer: round labels + connector lines */}
          <svg
            width={TOTAL_W}
            height={TOTAL_H}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          >
            {/* Round labels */}
            {COL_LABELS.map((label, c) => (
              <text
                key={c}
                x={cx(c) + SW / 2}
                y={HH / 2 + 5}
                textAnchor="middle"
                style={{ fill: '#C4A882', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2 }}
              >
                {label}
              </text>
            ))}
            {/* Divider under labels */}
            <line x1={0} y1={HH - 1} x2={TOTAL_W} y2={HH - 1} stroke="#D4B896" strokeWidth={0.5} opacity={0.4} />
            {/* Connector lines */}
            {LINES.map((l, i) => (
              <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#C4A882" strokeWidth={1} />
            ))}
          </svg>

          {/* Left R32 */}
          {r32.left.map((m, i) => <MatchCard key={`r32l${i}`} match={m} x={cx(0)} y={st(0, i)} />)}
          {/* Left R16 */}
          {r16.left.map((m, i) => <MatchCard key={`r16l${i}`} match={m} x={cx(1)} y={st(1, i)} />)}
          {/* Left QF */}
          {qf.left.map((m, i)  => <MatchCard key={`qfl${i}`}  match={m} x={cx(2)} y={st(2, i)} />)}
          {/* Left SF */}
          {sf.left.map((m, i)  => <MatchCard key={`sfl${i}`}  match={m} x={cx(3)} y={st(3, i)} />)}
          {/* Final */}
          {fin && <MatchCard match={fin} x={cx(4)} y={st(3, 0)} />}
          {/* Right SF */}
          {sf.right.map((m, i) => <MatchCard key={`sfr${i}`}  match={m} x={cx(5)} y={st(3, i)} />)}
          {/* Right QF */}
          {qf.right.map((m, i) => <MatchCard key={`qfr${i}`}  match={m} x={cx(6)} y={st(2, i)} />)}
          {/* Right R16 */}
          {r16.right.map((m, i) => <MatchCard key={`r16r${i}`} match={m} x={cx(7)} y={st(1, i)} />)}
          {/* Right R32 */}
          {r32.right.map((m, i) => <MatchCard key={`r32r${i}`} match={m} x={cx(8)} y={st(0, i)} />)}
        </div>
      </div>

      {/* Bronze match */}
      {bronze && (
        <div>
          <div className="font-display text-sm tracking-widest text-ink mb-2 pb-1 border-b border-border">
            3RD PLACE
          </div>
          <MatchCard match={bronze} x={0} y={0} relative />
        </div>
      )}
    </div>
  )
}
