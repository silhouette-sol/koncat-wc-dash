'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { TeamComparison, WCMatch } from '@/lib/types'
import { getMatchResult } from '@/lib/matchResult'

// ── Constants ──────────────────────────────────────────────────

const FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain: '🇪🇸', Argentina: '🇦🇷', Germany: '🇩🇪',
  Morocco: '🇲🇦', USA: '🇺🇸', Norway: '🇳🇴',
  Japan: '🇯🇵', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  Mexico: '🇲🇽', Colombia: '🇨🇴', Uruguay: '🇺🇾',
  Belgium: '🇧🇪', Croatia: '🇭🇷', Switzerland: '🇨🇭',
  Australia: '🇦🇺', Ecuador: '🇪🇨', Senegal: '🇸🇳',
  Ghana: '🇬🇭', 'South Korea': '🇰🇷', Canada: '🇨🇦',
  Turkey: '🇹🇷', Algeria: '🇩🇿', Egypt: '🇪🇬',
  Iran: '🇮🇷', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', Paraguay: '🇵🇾',
  Austria: '🇦🇹', Sweden: '🇸🇪', 'Saudi Arabia': '🇸🇦',
  'Cape Verde': '🇨🇻', 'Cabo Verde': '🇨🇻',
  'Bosnia and Herzegovina': '🇧🇦', 'Bosnia & Herzegovina': '🇧🇦',
  'New Zealand': '🇳🇿', 'DR Congo': '🇨🇩', Iraq: '🇮🇶',
  Jordan: '🇯🇴', Haiti: '🇭🇹', Panama: '🇵🇦',
  'South Africa': '🇿🇦', 'Czech Republic': '🇨🇿', Qatar: '🇶🇦',
  Curacao: '🇨🇼', 'Curaçao': '🇨🇼', Uzbekistan: '🇺🇿',
  'Ivory Coast': '🇨🇮', Tunisia: '🇹🇳',
}

const CX = 450
const CY = 450
const CR = 30

const RADIUS = { r32: 400, r16: 300, qf: 220, sf: 150, final: 85 }
const NODE_R = { r32r16: 350, r16qf: 260, qfsf: 185, sffinal: 118 }
const TROPHY_R = 40

const EMOJI_FONT = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"
const MONO_FONT = "'DM Mono',monospace"

// ── Math helpers ───────────────────────────────────────────────

function svgPos(angle: number, r: number): [number, number] {
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)]
}

function r32Angle(i: number) {
  return (i / 32) * 2 * Math.PI - Math.PI / 2
}

function bracketAngle(i: number, round: number) {
  const step = Math.pow(2, round)
  return ((i * step + step / 2 - 0.5) / 32) * 2 * Math.PI - Math.PI / 2
}

function edgePt(from: [number, number], to: [number, number], r: number): [number, number] {
  const dx = to[0] - from[0], dy = to[1] - from[1]
  const d = Math.sqrt(dx * dx + dy * dy)
  if (d < 1) return from
  return [from[0] + (dx / d) * r, from[1] + (dy / d) * r]
}

function isPlaceholder(name: string) { return /^W\d+$/.test(name) }
function resolveTeam(name: string) { return isPlaceholder(name) ? 'TBD' : name }

function eloMatchProbs(eloA: number, eloB: number): [number, number] {
  const pA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400))
  return [pA, 1 - pA]
}

// ── Types ──────────────────────────────────────────────────────

type SlotStatus = 'upcoming' | 'winner' | 'loser' | 'tbd'

interface HoverInfo {
  team: string
  svgX: number
  svgY: number
  opponent?: string
  score?: string
  matchProbSelf?: number
  matchProbOpp?: number
  status: SlotStatus
}

// ── TeamCircle ─────────────────────────────────────────────────

interface TeamCircleProps {
  circleKey: string
  index: number
  teamName: string
  cx: number
  cy: number
  state: SlotStatus
  isActive: boolean
  opponent?: string
  score?: string
  date?: string
  matchProbSelf?: number
  matchProbOpp?: number
  onHover: (key: string, info: HoverInfo) => void
  onLeave: () => void
  revealStage: number
  myStage: number
  staggerMs: number
  matchIdx: number
  isPulsing?: boolean
  arrivedByTravel?: boolean
}

function TeamCircle({
  circleKey, index, teamName, cx, cy, state, isActive,
  opponent, score, matchProbSelf, matchProbOpp,
  onHover, onLeave, revealStage, myStage, staggerMs, matchIdx,
  isPulsing, arrivedByTravel,
}: TeamCircleProps) {
  const isTbd = state === 'tbd'
  const flag = isTbd ? '?' : (FLAGS[teamName] ?? teamName.slice(0, 2))

  const stroke = isActive || state === 'winner' ? '#C9A027'
    : state === 'loser' ? '#444'
    : isTbd             ? '#C4A882'
    : '#F0E8D8'
  const strokeW = (isActive || state === 'winner') ? 2.5 : 1.5
  const dash    = isTbd ? '4,3' : undefined
  const fill    = isActive ? '#6B4A38' : '#5C3D2E'

  // R32 losers start full-opacity and fade to 0.25 only when R16 slots pop in (stage 2),
  // staggered per match so the loser fade syncs with the winner appearing in the R16 slot
  const isR32Loser = myStage === 1 && state === 'loser'
  const opacity = isR32Loser && revealStage < 2 ? 1 : (state === 'loser' ? 0.25 : isTbd ? 0.6 : 1)

  const animName     = isTbd ? 'idleFloatTbd' : 'idleFloat'
  const animDuration = isTbd ? '6s' : '3.8s'
  const animDelay    = `${((index * 0.37) % (isTbd ? 6 : 3.8)).toFixed(2)}s`

  const handleEnter = useCallback(() => {
    onHover(circleKey, {
      team: teamName, svgX: cx, svgY: cy,
      opponent, score, matchProbSelf, matchProbOpp, status: state,
    })
  }, [circleKey, teamName, cx, cy, opponent, score, matchProbSelf, matchProbOpp, state, onHover])

  const tBox = 'fill-box' as React.CSSProperties['transformBox']
  // myStage=0  → always visible (TBD inner slots — bracket skeleton visible from start)
  // arrivedByTravel → revealed when travel animation delivers the winner
  // otherwise → revealed when revealStage >= myStage
  const isRevealed = myStage === 0 || arrivedByTravel || revealStage >= myStage

  const revealStyle: React.CSSProperties = myStage === 0
    ? {}
    : arrivedByTravel
      ? { animation: 'bracketLanding 0.2s ease-out both', transformOrigin: 'center', transformBox: tBox }
      : !isRevealed
        ? {}
        : myStage === 1
          ? { animation: 'bracketFadeIn 0.4s ease forwards' }
          : {
              animation: `bracketPopIn 0.3s ease ${staggerMs}ms both`,
              transformOrigin: 'center',
              transformBox: tBox,
            }

  // Pulse animation on R32 winner circles just before they travel inward
  const pulseStyle: React.CSSProperties = isPulsing
    ? { animation: `bracketPulse 0.25s ease-in-out ${matchIdx * 150}ms 1`, transformOrigin: 'center', transformBox: tBox }
    : {}

  return (
    <g style={{ pointerEvents: isRevealed ? undefined : 'none' }}>
      {isRevealed && (
        <g style={revealStyle}>
          <g style={pulseStyle}>
          <g
            onMouseEnter={handleEnter}
            onMouseLeave={onLeave}
            opacity={opacity}
            style={{
              cursor: isTbd ? 'default' : 'pointer',
              transform: isActive ? 'scale(1.35)' : 'scale(1)',
              transition: isR32Loser
                ? `transform 0.15s ease-out, opacity 0.5s ${matchIdx * 150}ms ease`
                : 'transform 0.15s ease-out',
              transformOrigin: 'center',
              transformBox: tBox,
              willChange: 'transform',
            }}
          >
            <g
              style={{
                animation: `${animName} ${animDuration} ease-in-out infinite`,
                animationDelay: animDelay,
                animationPlayState: isActive ? 'paused' : 'running',
                transformOrigin: 'center',
                transformBox: tBox,
                willChange: 'transform',
              }}
            >
              <circle cx={cx} cy={cy} r={CR}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeW}
                strokeDasharray={dash}
              />
              <text x={cx} y={cy}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={isTbd ? 17 : 20}
                fontFamily={EMOJI_FONT}
                fill={state === 'loser' ? '#888' : '#F0E8D8'}
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >
                {flag}
              </text>
            </g>
          </g>
          </g>
        </g>
      )}
    </g>
  )
}

// ── Tooltip ────────────────────────────────────────────────────

function Tooltip({ info }: { info: HoverInfo }) {
  const { team, svgX, svgY, opponent, score, matchProbSelf, matchProbOpp, status } = info

  // Each entry: text, fontSize, color, fontWeight
  type Line = { text: string; size: number; color: string; weight: number }
  const lines: Line[] = []

  if (status === 'tbd' || team === 'TBD') {
    lines.push({ text: 'TBD', size: 12, color: '#C4A882', weight: 400 })
  } else if (status === 'upcoming') {
    const flag = FLAGS[team] ?? ''
    lines.push({ text: `${flag}  ${team}`, size: 13, color: '#F0E8D8', weight: 700 })
    if (matchProbSelf !== undefined && matchProbOpp !== undefined && opponent && opponent !== 'TBD') {
      lines.push({ text: `${team}: ${(matchProbSelf * 100).toFixed(0)}% of winning`, size: 12, color: '#C9A027', weight: 400 })
      lines.push({ text: `${opponent}: ${(matchProbOpp * 100).toFixed(0)}% of winning`, size: 12, color: '#C9A027', weight: 400 })
    }
  } else {
    // winner or loser — completed match
    const flagA = FLAGS[team] ?? ''
    const flagB = opponent ? (FLAGS[opponent] ?? '') : ''
    const winner = status === 'winner' ? team : (opponent ?? '?')
    const winnerFlag = FLAGS[winner] ?? ''
    lines.push({ text: `${flagA} ${team} ${score ?? ''} ${opponent ?? ''} ${flagB}`, size: 13, color: '#F0E8D8', weight: 700 })
    lines.push({
      text: `${winnerFlag} ${winner}: won`,
      size: 12,
      color: status === 'winner' ? '#1D9E75' : '#D85A30',
      weight: 400,
    })
    if (matchProbSelf !== undefined && opponent) {
      lines.push({ text: `${team}: had ${(matchProbSelf * 100).toFixed(0)}% chance`, size: 12, color: '#C4A882', weight: 400 })
    }
    if (matchProbOpp !== undefined && opponent) {
      lines.push({ text: `${opponent}: had ${(matchProbOpp * 100).toFixed(0)}% chance`, size: 12, color: '#C4A882', weight: 400 })
    }
  }

  const padX = 14, padY = 10
  const lineH = 17
  const w = 250
  const h = lines.length * lineH + padY * 2

  const isRight = svgX > CX
  const isBottom = svgY > CY

  let tx = isRight ? svgX - w - CR - 6 : svgX + CR + 6
  let ty = isBottom ? svgY - h - 6 : svgY + 6

  tx = Math.max(4, Math.min(900 - w - 4, tx))
  ty = Math.max(4, Math.min(900 - h - 4, ty))

  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={tx} y={ty} width={w} height={h} rx={8}
        fill="#0B1D3A" stroke="#C9A027" strokeWidth={1} opacity={0.97}
      />
      {lines.map((line, i) => (
        <text key={i}
          x={tx + padX}
          y={ty + padY + i * lineH + line.size - 1}
          fontSize={line.size}
          fill={line.color}
          fontWeight={line.weight}
          fontFamily={MONO_FONT}
        >
          {line.text}
        </text>
      ))}
    </g>
  )
}

// ── Line style ─────────────────────────────────────────────────

const UL = { stroke: '#C4A882', strokeWidth: 1, strokeDasharray: '4,3', opacity: 0.45 } as const

// ── Main component ─────────────────────────────────────────────

interface KnockoutBracketProps {
  matches: WCMatch[]
  teams: TeamComparison[]
}

export default function KnockoutBracket({ matches, teams }: KnockoutBracketProps) {
  const [hovered, setHovered]       = useState<HoverInfo | null>(null)
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [trophyHovered, setTrophyHovered] = useState(false)
  const [revealStage, setRevealStage] = useState(0)
  const [replayKey, setReplayKey]   = useState(0)

  // Travel animation state
  const [arrivedSlots, setArrivedSlots]       = useState<Set<string>>(new Set())
  const [travelPositions, setTravelPositions] = useState<{ id: string; flag: string; cx: number; cy: number }[]>([])
  const [pulsingSlots, setPulsingSlots]       = useState<Set<string>>(new Set())
  const travelRafRef = useRef<number | null>(null)

  interface TravelRoute {
    id: string; srcKey: string; flag: string
    srcX: number; srcY: number; nX: number; nY: number; dstX: number; dstY: number
    delay: number; startTime: number | null
  }
  const activeRoutesRef = useRef<TravelRoute[]>([])

  const onHover = useCallback((key: string, info: HoverInfo) => {
    setHovered(info)
    setHoveredKey(key)
  }, [])

  const onLeave = useCallback(() => {
    setHovered(null)
    setHoveredKey(null)
  }, [])

  // ── Parse rounds ──────────────────────────────────────────────
  const r32m = matches.filter(m => m.round.includes('Round of 32'))
  const r16m = matches.filter(m => m.round.includes('Round of 16'))
  const qfm  = matches.filter(m => m.round.includes('Quarter'))
  const sfm  = matches.filter(m => m.round.includes('Semi'))
  const finm = matches.find(m =>
    m.round.includes('Final') && !m.round.includes('Semi') && !m.round.includes('Third')
  )

  const r32Teams = r32m.flatMap(m => [m.team1, m.team2])

  function getElo(name: string): number {
    return teams.find(t => t.name === name)?.elo_rating ?? 1500
  }

  function matchOdds(a: string, b: string): [number, number] | [undefined, undefined] {
    if (a === 'TBD' || b === 'TBD' || !b) return [undefined, undefined]
    return eloMatchProbs(getElo(a), getElo(b))
  }

  function r32State(name: string): SlotStatus {
    const m = r32m.find(x => x.team1 === name || x.team2 === name)
    if (!m) return 'upcoming'
    const { winner } = getMatchResult(m)
    if (!winner) return m.score ? 'upcoming' : 'upcoming'
    return winner === name ? 'winner' : 'loser'
  }

  // ── W-number resolution ───────────────────────────────────────
  const r32BaseIdx = matches.findIndex(m => m.round.includes('Round of 32'))

  function findR16ForR32(i: number): WCMatch | undefined {
    const r32Match = r32m[i]
    const wNum = `W${r32BaseIdx + i}`
    const winner = getMatchResult(r32Match).winner
    return r16m.find(m =>
      m.team1 === wNum || m.team2 === wNum ||
      (winner !== null && (m.team1 === winner || m.team2 === winner))
    )
  }

  // ── Slots ─────────────────────────────────────────────────────
  interface Slot { team: string; opponent: string; score?: string; date?: string }

  function buildSlots(roundMatches: WCMatch[], count: number): Slot[] {
    const slots: Slot[] = []
    for (const m of roundMatches) {
      const t1 = resolveTeam(m.team1), t2 = resolveTeam(m.team2)
      const s = m.score ? getMatchResult(m).displayScore : undefined
      slots.push({ team: t1, opponent: t2, score: s, date: m.date })
      slots.push({ team: t2, opponent: t1, score: s, date: m.date })
    }
    while (slots.length < count) slots.push({ team: 'TBD', opponent: 'TBD' })
    return slots.slice(0, count)
  }

  // ── R16 visual slots (one per R32 match, at the correct geometric midpoint)
  interface R16VisualSlot { team: string; opponent: string; score?: string; date?: string; r16Match?: WCMatch }

  const r16VisualSlots: R16VisualSlot[] = r32m.map((r32Match, i) => {
    const winner = getMatchResult(r32Match).winner
    const team = winner ?? 'TBD'
    const r16Match = findR16ForR32(i)
    if (!r16Match) return { team, opponent: 'TBD' }
    const wNum = `W${r32BaseIdx + i}`
    const isTeam1 = r16Match.team1 === wNum || (winner !== null && r16Match.team1 === winner)
    const rawOpp = isTeam1 ? r16Match.team2 : r16Match.team1
    const score = r16Match.score ? getMatchResult(r16Match).displayScore : undefined
    return { team, opponent: resolveTeam(rawOpp), score, date: r16Match.date, r16Match }
  })

  function r16VisualState(slot: R16VisualSlot): SlotStatus {
    if (slot.team === 'TBD') return 'tbd'
    if (!slot.r16Match?.score) return 'upcoming'
    return getMatchResult(slot.r16Match).winner === slot.team ? 'winner' : 'loser'
  }

  const qfSlots  = buildSlots(qfm, 8)
  const sfSlots  = buildSlots(sfm, 4)
  const finalSlots: Slot[] = finm
    ? [
        { team: resolveTeam(finm.team1), opponent: resolveTeam(finm.team2), score: finm.score ? getMatchResult(finm).displayScore : undefined },
        { team: resolveTeam(finm.team2), opponent: resolveTeam(finm.team1), score: finm.score ? getMatchResult(finm).displayScore : undefined },
      ]
    : [{ team: 'TBD', opponent: 'TBD' }, { team: 'TBD', opponent: 'TBD' }]

  const champion = finm?.score ? getMatchResult(finm).winner : null

  function slotState(slot: Slot, roundMatches: WCMatch[]): SlotStatus {
    if (slot.team === 'TBD') return 'tbd'
    const m = roundMatches.find(x =>
      resolveTeam(x.team1) === slot.team || resolveTeam(x.team2) === slot.team
    )
    if (!m?.score) return 'upcoming'
    return getMatchResult(m).winner === slot.team ? 'winner' : 'loser'
  }

  // ── Travel animation helpers ───────────────────────────────────

  function computeR32Routes(): TravelRoute[] {
    const routes: TravelRoute[] = []
    for (let i = 0; i < r32m.length; i++) {
      const result = getMatchResult(r32m[i])
      if (!result.winner) continue
      const winnerIsTeam1 = result.winner === r32m[i].team1
      const winnerR32Idx = i * 2 + (winnerIsTeam1 ? 0 : 1)
      const [srcX, srcY] = svgPos(r32Angle(winnerR32Idx), RADIUS.r32)
      const dstAngle = bracketAngle(i, 1)
      const [nX, nY]   = svgPos(dstAngle, NODE_R.r32r16)
      const [dstX, dstY] = svgPos(dstAngle, RADIUS.r16)
      const flag = FLAGS[result.winner] ?? result.winner.slice(0, 2)
      routes.push({
        id: `r16-${i}`, srcKey: `r32-${winnerR32Idx}`,
        flag, srcX, srcY, nX, nY, dstX, dstY,
        delay: i * 150, startTime: null,
      })
    }
    return routes
  }

  function startR32Travel(routes: TravelRoute[]) {
    if (!routes.length) return
    activeRoutesRef.current = routes.map(r => ({ ...r, startTime: null }))
    setPulsingSlots(new Set(routes.map(r => r.srcKey)))

    const loop = (now: number) => {
      const positions: { id: string; flag: string; cx: number; cy: number }[] = []
      const arrived: string[] = []
      let anyActive = false

      for (const route of activeRoutesRef.current) {
        if (route.startTime === null) route.startTime = now
        const elapsed = now - route.startTime - route.delay
        if (elapsed < 0) { anyActive = true; continue }
        const progress = Math.min(elapsed / 500, 1)
        let cx, cy
        if (progress <= 0.5) {
          const ep = 0.5 - Math.cos(progress * 2 * Math.PI) / 2
          cx = route.srcX + (route.nX - route.srcX) * ep
          cy = route.srcY + (route.nY - route.srcY) * ep
        } else {
          const ep = 0.5 - Math.cos((progress - 0.5) * 2 * Math.PI) / 2
          cx = route.nX + (route.dstX - route.nX) * ep
          cy = route.nY + (route.dstY - route.nY) * ep
        }
        if (progress < 1) { anyActive = true; positions.push({ id: route.id, flag: route.flag, cx, cy }) }
        else arrived.push(route.id)
      }

      setTravelPositions(positions)
      if (arrived.length > 0) {
        setArrivedSlots(prev => { const n = new Set(prev); arrived.forEach(id => n.add(id)); return n })
        activeRoutesRef.current = activeRoutesRef.current.filter(r => !arrived.includes(r.id))
      }
      if (anyActive) travelRafRef.current = requestAnimationFrame(loop)
      else setPulsingSlots(new Set())
    }
    travelRafRef.current = requestAnimationFrame(loop)
  }

  // Bracket reveal + travel animation sequence
  useEffect(() => {
    setRevealStage(0)
    setArrivedSlots(new Set())
    setTravelPositions([])
    setPulsingSlots(new Set())
    activeRoutesRef.current = []
    if (travelRafRef.current) cancelAnimationFrame(travelRafRef.current)

    const r32Routes = computeR32Routes()
    const travelDuration = r32Routes.length > 0 ? (r32Routes.length - 1) * 150 + 500 : 0
    const travelStart = 800
    const afterTravel = travelStart + travelDuration + 300

    const timers = [
      setTimeout(() => setRevealStage(1), 100),
      setTimeout(() => startR32Travel(r32Routes), travelStart),
      setTimeout(() => setRevealStage(3), afterTravel),
      setTimeout(() => setRevealStage(4), afterTravel + 860),
      setTimeout(() => setRevealStage(5), afterTravel + 1400),
      setTimeout(() => setRevealStage(6), afterTravel + 1780),
    ]
    return () => {
      timers.forEach(clearTimeout)
      if (travelRafRef.current) cancelAnimationFrame(travelRafRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayKey])

  // ── Connecting lines ───────────────────────────────────────────

  function pairLines(
    count: number,
    getFromAngle: (i: number) => number,
    fromR: number,
    nodeR: number,
    toPair: (pair: number) => number,
    toR: number,
  ): JSX.Element[] {
    return Array.from({ length: count / 2 }, (_, pair) => {
      const i0 = 2 * pair, i1 = 2 * pair + 1
      const a0 = getFromAngle(i0), a1 = getFromAngle(i1)
      const na = toPair(pair)
      const [x0, y0] = svgPos(a0, fromR)
      const [x1, y1] = svgPos(a1, fromR)
      const [nx, ny] = svgPos(na, nodeR)
      const [tx, ty] = svgPos(na, toR)
      const [e0x, e0y] = edgePt([x0, y0], [nx, ny], CR)
      const [e1x, e1y] = edgePt([x1, y1], [nx, ny], CR)
      const [tex, tey] = edgePt([tx, ty], [nx, ny], CR)
      return (
        <g key={pair} {...UL}>
          <line x1={e0x} y1={e0y} x2={nx} y2={ny} />
          <line x1={e1x} y1={e1y} x2={nx} y2={ny} />
          <line x1={nx} y1={ny} x2={tex} y2={tey} />
        </g>
      )
    })
  }

  const finalToTrophy = [0, 1].map(i => {
    const a = bracketAngle(i, 4)
    const [fx, fy] = svgPos(a, RADIUS.final)
    const [ex, ey] = edgePt([fx, fy], [CX, CY], CR)
    const [tx2, ty2] = edgePt([CX, CY], [fx, fy], TROPHY_R)
    return <line key={i} x1={ex} y1={ey} x2={tx2} y2={ty2} {...UL} />
  })

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-4xl tracking-widest" style={{ color: '#C9A027' }}>
          KNOCKOUT BRACKET
        </h2>
        <p className="font-mono-data text-sm text-text-muted">
          Round of 32 through to the Final · Jul 19 MetLife Stadium
        </p>
      </div>

      <p className="font-mono-data text-xs text-text-muted text-center">
        Hover over any team to see match odds
      </p>

      <div style={{ overflowX: 'auto' }}>
        <svg
          viewBox="0 0 900 900"
          width="100%"
          height="auto"
          style={{ display: 'block', maxWidth: 900, margin: '0 auto' }}
        >
          {/* Round labels */}
          {[
            { y: CY - 438, label: 'ROUND OF 32' },
            { y: CY - 350, label: 'ROUND OF 16' },
            { y: CY - 260, label: 'QUARTER' },
            { y: CY - 185, label: 'SEMI' },
            { y: CY - 118, label: 'FINAL' },
          ].map(({ y, label }) => (
            <text key={label} x={CX} y={y}
              textAnchor="middle" fontSize={9}
              fill="#C9A027" opacity={0.55}
              fontFamily={MONO_FONT} letterSpacing={1}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {label}
            </text>
          ))}

          {/* Connecting lines */}
          {pairLines(32, r32Angle,                RADIUS.r32,  NODE_R.r32r16,  p => bracketAngle(p, 1), RADIUS.r16)}
          {pairLines(16, i => bracketAngle(i, 1), RADIUS.r16,  NODE_R.r16qf,   p => bracketAngle(p, 2), RADIUS.qf)}
          {pairLines(8,  i => bracketAngle(i, 2), RADIUS.qf,   NODE_R.qfsf,    p => bracketAngle(p, 3), RADIUS.sf)}
          {pairLines(4,  i => bracketAngle(i, 3), RADIUS.sf,   NODE_R.sffinal, p => bracketAngle(p, 4), RADIUS.final)}
          {finalToTrophy}

          {/* R32 — stage 1, all together */}
          {r32Teams.map((name, i) => {
            const ck = `r32-${i}`
            const a = r32Angle(i)
            const [cx, cy] = svgPos(a, RADIUS.r32)
            const m = r32m.find(x => x.team1 === name || x.team2 === name)
            const opp = m ? (m.team1 === name ? m.team2 : m.team1) : undefined
            const score = m?.score ? getMatchResult(m).displayScore : undefined
            const [ps, po] = opp ? matchOdds(name, opp) : [undefined, undefined]
            return (
              <TeamCircle key={ck} circleKey={ck} index={i}
                teamName={name} cx={cx} cy={cy} state={r32State(name)}
                isActive={hoveredKey === ck}
                opponent={opp} score={score} date={m?.date}
                matchProbSelf={ps} matchProbOpp={po}
                onHover={onHover} onLeave={onLeave}
                revealStage={revealStage} myStage={1} staggerMs={0} matchIdx={Math.floor(i / 2)}
                isPulsing={pulsingSlots.has(ck)}
              />
            )
          })}

          {/* R16 — stage 2, staggered by slot index */}
          {r16VisualSlots.map((slot, j) => {
            const ck = `r16-${j}`
            const [cx, cy] = svgPos(bracketAngle(j, 1), RADIUS.r16)
            const [ps, po] = matchOdds(slot.team, slot.opponent)
            return (
              <TeamCircle key={ck} circleKey={ck} index={32 + j}
                teamName={slot.team} cx={cx} cy={cy}
                state={r16VisualState(slot)}
                isActive={hoveredKey === ck}
                opponent={slot.opponent} score={slot.score} date={slot.date}
                matchProbSelf={ps} matchProbOpp={po}
                onHover={onHover} onLeave={onLeave}
                revealStage={revealStage}
                myStage={slot.team === 'TBD' ? 0 : 2}
                staggerMs={0}
                matchIdx={j}
                arrivedByTravel={slot.team !== 'TBD' && arrivedSlots.has(ck)}
              />
            )
          })}

          {/* QF — stage 3, staggered */}
          {qfSlots.map((slot, k) => {
            const ck = `qf-${k}`
            const [cx, cy] = svgPos(bracketAngle(k, 2), RADIUS.qf)
            const [ps, po] = matchOdds(slot.team, slot.opponent)
            return (
              <TeamCircle key={ck} circleKey={ck} index={48 + k}
                teamName={slot.team} cx={cx} cy={cy}
                state={slotState(slot, qfm)}
                isActive={hoveredKey === ck}
                opponent={slot.opponent} score={slot.score} date={slot.date}
                matchProbSelf={ps} matchProbOpp={po}
                onHover={onHover} onLeave={onLeave}
                revealStage={revealStage}
                myStage={slot.team === 'TBD' ? 0 : 3}
                staggerMs={slot.team === 'TBD' ? 0 : k * 80}
                matchIdx={Math.floor(k / 2)}
              />
            )
          })}

          {/* SF — stage 4, staggered */}
          {sfSlots.map((slot, l) => {
            const ck = `sf-${l}`
            const [cx, cy] = svgPos(bracketAngle(l, 3), RADIUS.sf)
            const [ps, po] = matchOdds(slot.team, slot.opponent)
            return (
              <TeamCircle key={ck} circleKey={ck} index={56 + l}
                teamName={slot.team} cx={cx} cy={cy}
                state={slotState(slot, sfm)}
                isActive={hoveredKey === ck}
                opponent={slot.opponent} score={slot.score} date={slot.date}
                matchProbSelf={ps} matchProbOpp={po}
                onHover={onHover} onLeave={onLeave}
                revealStage={revealStage}
                myStage={slot.team === 'TBD' ? 0 : 4}
                staggerMs={slot.team === 'TBD' ? 0 : l * 80}
                matchIdx={Math.floor(l / 2)}
              />
            )
          })}

          {/* Final — stage 5, staggered */}
          {finalSlots.map((slot, n) => {
            const ck = `final-${n}`
            const [cx, cy] = svgPos(bracketAngle(n, 4), RADIUS.final)
            const [ps, po] = matchOdds(slot.team, slot.opponent)
            return (
              <TeamCircle key={ck} circleKey={ck} index={60 + n}
                teamName={slot.team} cx={cx} cy={cy}
                state={slotState(slot, finm ? [finm] : [])}
                isActive={hoveredKey === ck}
                opponent={slot.opponent} score={slot.score}
                matchProbSelf={ps} matchProbOpp={po}
                onHover={onHover} onLeave={onLeave}
                revealStage={revealStage}
                myStage={slot.team === 'TBD' ? 0 : 5}
                staggerMs={slot.team === 'TBD' ? 0 : n * 80}
                matchIdx={0}
              />
            )
          })}

          {/* Trophy champion glow burst at stage 6 */}
          {revealStage >= 6 && champion && (
            <circle cx={CX} cy={CY} r={TROPHY_R + 14}
              fill="none" stroke="#C9A027" strokeWidth={3}
              style={{ animation: 'trophyGoldBurst 2s ease-out forwards', opacity: 0 }}
            />
          )}

          {/* Trophy */}
          <g
            onMouseEnter={() => setTrophyHovered(true)}
            onMouseLeave={() => setTrophyHovered(false)}
            style={{
              transform: trophyHovered ? 'scale(1.2)' : 'scale(1)',
              transition: 'transform 0.15s ease-out',
              transformOrigin: 'center',
              transformBox: 'fill-box' as React.CSSProperties['transformBox'],
            }}
          >
            <circle cx={CX} cy={CY} r={TROPHY_R}
              fill={champion ? '#C9A027' : '#5C3D2E'}
              stroke="#C9A027" strokeWidth={2}
              style={{ animation: 'trophyPulse 2.5s ease-in-out infinite' }}
            />
            <text x={CX} y={CY}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={26} fontFamily={EMOJI_FONT}
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              {champion ? (FLAGS[champion] ?? '🏆') : '🏆'}
            </text>
          </g>

          {/* Trophy tooltip */}
          {trophyHovered && !hovered && (
            <g style={{ pointerEvents: 'none' }}>
              <rect x={CX - 115} y={CY + TROPHY_R + 10} width={230} height={30} rx={8}
                fill="#0B1D3A" stroke="#C9A027" strokeWidth={1} opacity={0.97}
              />
              <text x={CX} y={CY + TROPHY_R + 30}
                textAnchor="middle" fontSize={12}
                fill="#F0E8D8" fontFamily={MONO_FONT}
              >
                {champion ? `${champion} · 2026 Champions` : 'Final · Jul 19 · MetLife Stadium'}
              </text>
            </g>
          )}

          {/* Traveling flag circles — rendered above all bracket circles */}
          {travelPositions.map(t => (
            <g key={t.id} style={{ pointerEvents: 'none' }}>
              <circle cx={t.cx} cy={t.cy} r={CR} fill="#5C3D2E" stroke="#C9A027" strokeWidth={2.5} />
              <text x={t.cx} y={t.cy}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={20} fontFamily={EMOJI_FONT}
                style={{ userSelect: 'none' }}
              >
                {t.flag}
              </text>
            </g>
          ))}

          {/* Tooltip — rendered last */}
          {hovered && <Tooltip info={hovered} />}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 flex-wrap justify-center" style={{ opacity: 0.8 }}>
        {[
          { stroke: '#C9A027', strokeW: 2.5, opacity: 1,    dash: undefined, label: 'Winner / advancing' },
          { stroke: '#F0E8D8', strokeW: 1.5,  opacity: 0.25, dash: undefined, label: 'Eliminated' },
          { stroke: '#C4A882', strokeW: 1.5,  opacity: 0.6,  dash: '3,2',    label: 'Match not yet played' },
        ].map(({ stroke, strokeW, opacity, dash, label }) => (
          <div key={label} className="flex items-center gap-2">
            <svg width={20} height={20}>
              <circle cx={10} cy={10} r={8}
                fill="#5C3D2E" stroke={stroke}
                strokeWidth={strokeW} strokeDasharray={dash}
                opacity={opacity}
              />
            </svg>
            <span className="font-mono-data text-[11px] text-text-muted">{label}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          onClick={() => setReplayKey(k => k + 1)}
          className="font-mono-data text-text-muted hover:text-text-primary transition-colors"
          style={{ fontSize: 12 }}
        >
          Replay animation ↺
        </button>
      </div>

      <div className="pb-2" />
    </div>
  )
}
