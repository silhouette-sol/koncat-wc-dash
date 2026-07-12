'use client'

import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { WCMatch, TeamComparison } from '@/lib/types'
import { getMatchResult } from '@/lib/matchResult'

// ── Geometry constants — 1000×1000 coordinate space ───────────

const CX = 500, CY = 500, DEG = Math.PI / 180
const RADII = [430, 340, 252, 172, 96, 0]
const SIZE  = [34, 30, 27, 24, 22, 46]
const AMP   = [5, 4, 3.2, 2.6, 2, 0]
const TANG  = [2, 1.6, 1.2, 1, 0.8, 0]

// ── Timings: all README values × 1.6 (cinematic / unhurried) ──
const ROUND_START = [0, 4.8, 8.0, 10.4, 12.16, 13.76]
const ROUND_STAG  = [0, 0.128, 0.16, 0.192, 0.24, 0]
const ROUND_DUR   = [0, 1.44, 1.44, 1.36, 1.36, 1.6]

// ── Design tokens ──────────────────────────────────────────────
const ACCENT    = '#e3c27e'
const PH_FILL   = 'rgba(255,255,255,0.04)'
const PH_STR    = 'rgba(255,255,255,0.16)'
const PH_TXT    = 'rgba(255,255,255,0.34)'
const SKEL_C    = 'rgba(255,255,255,0.15)'
const GUIDE_C   = 'rgba(255,255,255,0.05)'
const LABEL_C   = 'rgba(255,255,255,0.38)'
const CHIP_BG   = '#1a1d22'
const CHIP_SHD  = '0 6px 16px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.18)'
const RING_DEFAULT = '2px solid rgba(255,255,255,0.6)'
const RING_GOLD    = `2.5px solid ${ACCENT}`

// ── Easing ─────────────────────────────────────────────────────
const clamp   = (v: number, a: number, b: number) => v < a ? a : v > b ? b : v
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3)
const easeIO  = (p: number) => p < 0.5 ? 4*p*p*p : 1 - Math.pow(-2*p+2, 3)/2

// ── Flags ──────────────────────────────────────────────────────
const FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain: '🇪🇸', Argentina: '🇦🇷', Germany: '🇩🇪',
  Morocco: '🇲🇦', USA: '🇺🇸', 'United States': '🇺🇸', Norway: '🇳🇴',
  Japan: '🇯🇵', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  Mexico: '🇲🇽', Colombia: '🇨🇴', Uruguay: '🇺🇾',
  Belgium: '🇧🇪', Croatia: '🇭🇷', Switzerland: '🇨🇭',
  Australia: '🇦🇺', Ecuador: '🇪🇨', Senegal: '🇸🇳',
  Ghana: '🇬🇭', 'South Korea': '🇰🇷', 'Korea Republic': '🇰🇷', Canada: '🇨🇦',
  Turkey: '🇹🇷', Algeria: '🇩🇿', Egypt: '🇪🇬',
  Iran: '🇮🇷', 'IR Iran': '🇮🇷', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', Paraguay: '🇵🇾',
  Austria: '🇦🇹', Sweden: '🇸🇪', 'Saudi Arabia': '🇸🇦',
  'Cape Verde': '🇨🇻', 'Cabo Verde': '🇨🇻',
  'Bosnia and Herzegovina': '🇧🇦', 'Bosnia & Herzegovina': '🇧🇦',
  'New Zealand': '🇳🇿', 'DR Congo': '🇨🇩', 'Congo DR': '🇨🇩', Iraq: '🇮🇶',
  Jordan: '🇯🇴', Haiti: '🇭🇹', Panama: '🇵🇦',
  'South Africa': '🇿🇦', 'Czech Republic': '🇨🇿', Qatar: '🇶🇦',
  Curacao: '🇨🇼', 'Curaçao': '🇨🇼', Uzbekistan: '🇺🇿',
  'Ivory Coast': '🇨🇮', "Côte d'Ivoire": '🇨🇮', Tunisia: '🇹🇳',
}

// ── Team name normalization for Elo lookup ─────────────────────
function normalizeTeamName(name: string): string {
  const map: Record<string, string> = {
    'United States': 'USA', 'IR Iran': 'Iran',
    'Korea Republic': 'South Korea', "Côte d'Ivoire": 'Ivory Coast',
    'Congo DR': 'DR Congo', 'Curaçao': 'Curacao', 'Cabo Verde': 'Cape Verde',
    'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
  }
  return map[name] ?? name
}

// ── Hover data types ───────────────────────────────────────────
type NodeHoverData =
  | { kind: 'completed'; team: string; flag: string; opponent: string; opponentFlag: string; won: boolean; score: string; probMyTeam: number; statusLabel: string }
  | { kind: 'upcoming'; teamA: string; teamAFlag: string; teamB: string; teamBFlag: string; probA: number; probB: number; date: string; venue: string }
  | { kind: 'tbd' }
type HoverSource = 'circle' | 'line'

// ── Round labels by node level (index = LNode.L, 0 unused) ─────
const ROUND_LABEL = ['', 'Round of 32', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Final']

// ── Layout types ───────────────────────────────────────────────
interface LTeam { name: string; flag: string }
interface LNode {
  id: string; L: number; j: number
  team: LTeam; angle: number; radius: number; size: number; phase: number
  isLeaf: boolean
  revealStart: number; settleT: number; advanced: boolean
  parentId: string; parentFillStart: number; parentFillEnd: number
  fillStart: number; fillDur: number; fillEnd: number
  winChildId: string | null; loseChildId: string | null
}
interface LEdge    { id: string; fromId: string; toId: string; fillStart: number }
interface LLoserEdge { id: string; fromId: string; toId: string; fillStart: number }
interface LTrav    { id: string; fromId: string; node: LNode }
interface LSkel    { id: string; fromId: string; toId: string; isWinner: boolean; level: number; pStart: number; pEnd: number }
interface UMData   {
  id: string
  nodeAId: string; nodeBId: string; parentId: string
  teamA: string; teamB: string
  teamAFlag: string; teamBFlag: string
  date: string; venue: string
  bothKnown: boolean
}
interface Layout   {
  nodes: LNode[]; byId: Record<string, LNode>
  edges: LEdge[]; loserEdges: LLoserEdge[]; travelers: LTrav[]; loserTravelers: LTrav[]
  skeleton: LSkel[]; champion: LNode
  labels: { t: string; r: number }[]
  upcomingMatches: UMData[]
}

// ── Elimination status for a node's team, walking the bracket tree ──
function eliminationLabel(byId: Record<string, LNode>, nodeId: string): string {
  let cur = byId[nodeId]
  if (!cur) return ''
  const teamName = cur.team.name
  while (cur.parentId) {
    const parent = byId[cur.parentId]
    if (!parent || parent.team.name === 'TBD') return 'Still in tournament'
    if (parent.team.name !== teamName) return `Eliminated in ${ROUND_LABEL[parent.L]}`
    cur = parent
  }
  return 'World Champions 🏆'
}

// ── DOM slots ──────────────────────────────────────────────────
interface NSlot {
  wrap: HTMLDivElement | null
  ph: HTMLDivElement | null
  flag: HTMLDivElement | null
  ring: HTMLDivElement | null
  gold: HTMLDivElement | null
}
interface WSlot { wrap: HTMLDivElement | null }

// ── Bracket tree builder ───────────────────────────────────────
function buildLayout(
  r32m: WCMatch[], r16m: WCMatch[], qfm: WCMatch[], sfm: WCMatch[], finm: WCMatch | undefined
): Layout {
  const matchArrays: (WCMatch | undefined)[][] = [[], r32m, r16m, qfm, sfm, finm ? [finm] : []]

  const levels: { team: LTeam; angle: number }[][] = [
    r32m.flatMap((m, j) => [
      { team: { name: m.team1, flag: FLAGS[m.team1] ?? '?' }, angle: -90 + (2*j)*11.25 },
      { team: { name: m.team2, flag: FLAGS[m.team2] ?? '?' }, angle: -90 + (2*j+1)*11.25 },
    ]),
  ]

  // Resolve which two previous-level slots feed match j at level L —
  // by the match's own team1/team2 identity, NOT by adjacent index.
  // Official knockout seeding pairs winners non-sequentially (e.g. the
  // real Round of 16 fixture is "Paraguay vs France", pairing R32
  // winners #1 and #4 — not the adjacent #0/#1 that index math would
  // assume), so positional pairing silently produces the wrong node
  // mapping. `ref` is either a resolved team name or a "W<num>"
  // placeholder referencing an undecided previous-round match by its
  // global match number.
  const resolveChildIdx = (L: number, ref: string | undefined): number => {
    if (!ref) return -1
    const wm = ref.match(/^W(\d+)$/)
    if (wm) {
      const num = parseInt(wm[1], 10)
      return matchArrays[L - 1]?.findIndex(mm => mm?.num === num) ?? -1
    }
    return levels[L - 1].findIndex(e => e.team.name === ref)
  }

  const childIdx: [number, number][][] = [[]]
  for (let L = 1; L <= 5; L++) {
    const cnt = 32 >> L
    childIdx[L] = []
    for (let j = 0; j < cnt; j++) {
      const match = matchArrays[L][j]
      childIdx[L].push(match ? [resolveChildIdx(L, match.team1), resolveChildIdx(L, match.team2)] : [-1, -1])
    }

    levels[L] = []
    for (let j = 0; j < cnt; j++) {
      const [iA, iB] = childIdx[L][j]
      const cA = iA >= 0 ? levels[L-1][iA] : undefined
      const cB = iB >= 0 ? levels[L-1][iB] : undefined
      const match = matchArrays[L][j]
      const winner = match ? getMatchResult(match).winner : null
      const team: LTeam = winner
        ? cA?.team.name === winner ? cA.team
          : cB?.team.name === winner ? cB.team
          : { name: winner, flag: FLAGS[winner] ?? '?' }
        : { name: 'TBD', flag: '?' }
      const angle = cA && cB ? (cA.angle + cB.angle) / 2 : (levels[L-1][2*j]?.angle ?? 0)
      levels[L].push({ team, angle })
    }
  }

  const nodes: LNode[] = [], byId: Record<string, LNode> = {}
  for (let L = 0; L <= 5; L++) {
    levels[L].forEach((nd, j) => {
      const id = `${L}-${j}`
      const n: LNode = {
        id, L, j, team: nd.team, angle: nd.angle,
        radius: RADII[L], size: SIZE[L],
        phase: (L * 7 + j * 2.399) % 6.283,
        isLeaf: L === 0,
        revealStart: 0, settleT: 0, advanced: false,
        parentId: '', parentFillStart: 0, parentFillEnd: 0,
        fillStart: 0, fillDur: 0, fillEnd: 0,
        winChildId: null, loseChildId: null,
      }
      if (L === 0) {
        n.revealStart = 0.48 + j * 0.096
        n.settleT = n.revealStart + 0.96
      } else {
        n.fillStart = ROUND_START[L] + j * ROUND_STAG[L]
        n.fillDur = ROUND_DUR[L]
        n.fillEnd = n.fillStart + n.fillDur
        n.settleT = n.fillEnd
      }
      nodes.push(n); byId[id] = n
    })
  }

  const edges: LEdge[] = [], loserEdges: LLoserEdge[] = []
  const travelers: LTrav[] = [], loserTravelers: LTrav[] = [], skeleton: LSkel[] = []
  for (let L = 1; L <= 5; L++) {
    for (let j = 0; j < (32 >> L); j++) {
      const node = byId[`${L}-${j}`]
      const [iA, iB] = childIdx[L][j]
      const cA = iA >= 0 ? byId[`${L-1}-${iA}`] : undefined, cB = iB >= 0 ? byId[`${L-1}-${iB}`] : undefined
      if (!cA || !cB) continue
      cA.parentId = node.id; cA.parentFillStart = node.fillStart; cA.parentFillEnd = node.fillEnd
      cB.parentId = node.id; cB.parentFillStart = node.fillStart; cB.parentFillEnd = node.fillEnd

      let winChild: LNode | null = null, loseChild: LNode | null = null
      if (node.team.name !== 'TBD') {
        winChild = cA.team.name === node.team.name ? cA : cB.team.name === node.team.name ? cB : null
        loseChild = winChild ? (winChild === cA ? cB : cA) : null
      }
      node.winChildId = winChild?.id ?? null
      node.loseChildId = loseChild?.id ?? null

      if (winChild) {
        edges.push({ id: `e${node.id}`, fromId: winChild.id, toId: node.id, fillStart: node.fillStart })
        travelers.push({ id: `t${node.id}`, fromId: winChild.id, node })
      }
      if (loseChild) {
        loserTravelers.push({ id: `L${node.id}`, fromId: loseChild.id, node })
        loserEdges.push({ id: `le${node.id}`, fromId: loseChild.id, toId: node.id, fillStart: node.fillStart })
      }

      skeleton.push(
        { id: `sA${node.id}`, fromId: cA.id, toId: node.id, isWinner: winChild?.id === cA.id, level: L, pStart: node.fillStart, pEnd: node.fillEnd },
        { id: `sB${node.id}`, fromId: cB.id, toId: node.id, isWinner: winChild?.id === cB.id, level: L, pStart: node.fillStart, pEnd: node.fillEnd },
      )
    }
  }
  nodes.forEach(n => {
    if (n.isLeaf && n.parentId) n.advanced = byId[n.parentId]?.winChildId === n.id
  })

  // ── Upcoming matches at every round — both feeder nodes resolved via
  // the same identity-based childIdx mapping used above, so a line drawn
  // between two teams always passes through the actual shared match node.
  const upcomingMatches: UMData[] = []
  for (let L = 1; L <= 5; L++) {
    const ms = matchArrays[L]
    for (let j = 0; j < ms.length; j++) {
      const m = ms[j]; if (!m || m.score) continue
      const node = byId[`${L}-${j}`]
      const [iA, iB] = childIdx[L][j]
      const cA = iA >= 0 ? byId[`${L-1}-${iA}`] : undefined, cB = iB >= 0 ? byId[`${L-1}-${iB}`] : undefined
      if (!node || !cA || !cB) continue
      if (cA.team.name === 'TBD' && cB.team.name === 'TBD') continue
      upcomingMatches.push({
        id: `um${L}-${j}`, nodeAId: cA.id, nodeBId: cB.id, parentId: node.id,
        teamA: cA.team.name, teamB: cB.team.name,
        teamAFlag: cA.team.flag, teamBFlag: cB.team.flag,
        date: m.date, venue: m.ground ?? '',
        bothKnown: cA.team.name !== 'TBD' && cB.team.name !== 'TBD',
      })
    }
  }

  return {
    nodes, byId, edges, loserEdges, travelers, loserTravelers, skeleton,
    champion: byId['5-0'],
    labels: [
      { t: 'ROUND OF 32', r: RADII[0] }, { t: 'ROUND OF 16', r: RADII[1] },
      { t: 'QUARTERS', r: RADII[2] }, { t: 'SEMIS', r: RADII[3] }, { t: 'FINAL', r: RADII[4] },
    ],
    upcomingMatches,
  }
}

// ── Component ──────────────────────────────────────────────────
interface KnockoutBracketProps { matches: WCMatch[]; teams: TeamComparison[] }

export default function KnockoutBracket({ matches, teams }: KnockoutBracketProps) {
  const { r32m, r16m, qfm, sfm, finm } = useMemo(() => {
    const ko = matches.filter(m =>
      ['Round of 32', 'Round of 16', 'Quarter', 'Semi', 'Final'].some(r => m.round.includes(r)) &&
      !m.round.includes('Third') && !m.round.includes('Group')
    )
    return {
      r32m: ko.filter(m => m.round.includes('Round of 32')).sort((a, b) => (a.num ?? 0) - (b.num ?? 0)),
      r16m: ko.filter(m => m.round.includes('Round of 16')).sort((a, b) => (a.num ?? 0) - (b.num ?? 0)),
      qfm:  ko.filter(m => m.round.includes('Quarter')).sort((a, b) => (a.num ?? 0) - (b.num ?? 0)),
      sfm:  ko.filter(m => m.round.includes('Semi')).sort((a, b) => (a.num ?? 0) - (b.num ?? 0)),
      finm: ko.find(m => m.round.includes('Final') && !m.round.includes('Semi') && !m.round.includes('Third')),
    }
  }, [matches])

  const layout = useMemo(() => buildLayout(r32m, r16m, qfm, sfm, finm), [r32m, r16m, qfm, sfm, finm])

  // ── DOM refs ────────────────────────────────────────────────
  const rootRef   = useRef<HTMLDivElement>(null)
  const wrapRef   = useRef<HTMLDivElement>(null)
  const layerRef  = useRef<HTMLDivElement>(null)
  const svgRef    = useRef<SVGSVGElement>(null)
  const labRef    = useRef<SVGGElement>(null)
  const capRef    = useRef<HTMLDivElement>(null)
  const pulseRefs = useRef<(HTMLDivElement | null)[]>([])
  const startRef  = useRef(0)
  const N  = useRef<Record<string, NSlot>>({})
  const T  = useRef<Record<string, WSlot>>({})
  const LT = useRef<Record<string, WSlot>>({})
  const E    = useRef<Record<string, SVGPathElement | null>>({})
  const LE   = useRef<Record<string, SVGPathElement | null>>({})
  const EHit = useRef<Record<string, SVGPathElement | null>>({})
  const S    = useRef<Record<string, SVGPathElement | null>>({})
  const PF    = useRef<Record<string, SVGPathElement | null>>({})
  const PFHit = useRef<Record<string, SVGPathElement | null>>({})
  const VS    = useRef<Record<string, HTMLDivElement | null>>({})

  // ── Tooltip state ────────────────────────────────────────────
  const [hoveredNode, setHoveredNode] = useState<{ data: NodeHoverData; x: number; y: number; source: HoverSource } | null>(null)
  const tooltipTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isOverTooltipRef = useRef(false)

  // ── Elo helper ───────────────────────────────────────────────
  const eloProb = useCallback((a: string, b: string): number => {
    const eA = teams.find(t => t.name === normalizeTeamName(a))?.elo_rating ?? 1500
    const eB = teams.find(t => t.name === normalizeTeamName(b))?.elo_rating ?? 1500
    return Math.round((1 / (1 + Math.pow(10, (eB - eA) / 400))) * 100)
  }, [teams])

  // ── Hover data map (all nodes) ───────────────────────────────
  const nodeHoverData = useMemo<Map<string, NodeHoverData>>(() => {
    const map = new Map<string, NodeHoverData>()

    // L0: R32 matches (played or upcoming)
    for (let k = 0; k < 32; k++) {
      const matchIdx = Math.floor(k / 2)
      const m = r32m[matchIdx]; if (!m) continue
      const isT1 = k % 2 === 0
      const myTeam = isT1 ? m.team1 : m.team2
      const opp    = isT1 ? m.team2 : m.team1
      if (m.score) {
        const res = getMatchResult(m)
        const won = res.winner === myTeam
        const p = eloProb(myTeam, opp)
        map.set(`0-${k}`, {
          kind: 'completed', team: myTeam, flag: FLAGS[myTeam] ?? '?',
          opponent: opp, opponentFlag: FLAGS[opp] ?? '?',
          won, score: res.displayScore, probMyTeam: isT1 ? p : 100 - p,
          statusLabel: eliminationLabel(layout.byId, `0-${k}`),
        })
      } else {
        const p = eloProb(myTeam, opp)
        map.set(`0-${k}`, {
          kind: 'upcoming',
          teamA: myTeam, teamAFlag: FLAGS[myTeam] ?? '?',
          teamB: opp,   teamBFlag: FLAGS[opp] ?? '?',
          probA: isT1 ? p : 100 - p,
          probB: isT1 ? 100 - p : p,
          date: m.date, venue: m.ground ?? '',
        })
      }
    }

    // L1-L5: each node's own producing match (Round of 16 through Final).
    // Without this, only the outer R32 ring ever gets hover data — every
    // decided inner-round node (the majority once the bracket progresses)
    // has no entry, so its chip renders with pointerEvents:'none' and no
    // handlers at all, which reads as "hover is completely broken."
    const matchArrays: (WCMatch | undefined)[][] = [[], r32m, r16m, qfm, sfm, finm ? [finm] : []]
    for (let L = 1; L <= 5; L++) {
      const ms = matchArrays[L]
      for (let j = 0; j < ms.length; j++) {
        const m = ms[j]; if (!m) continue
        const nodeId = `${L}-${j}`
        const node = layout.byId[nodeId]; if (!node || node.team.name === 'TBD') continue
        const cA = layout.byId[`${L-1}-${2*j}`], cB = layout.byId[`${L-1}-${2*j+1}`]
        if (!cA || !cB) continue
        if (m.score) {
          const winner = node.team.name
          const winnerIsA = cA.team.name === winner
          const opp = winnerIsA ? cB.team.name : cA.team.name
          const oppFlag = winnerIsA ? cB.team.flag : cA.team.flag
          const res = getMatchResult(m)
          const p = eloProb(winner, opp)
          map.set(nodeId, {
            kind: 'completed', team: winner, flag: node.team.flag,
            opponent: opp, opponentFlag: oppFlag,
            won: true, score: res.displayScore, probMyTeam: p,
            statusLabel: eliminationLabel(layout.byId, nodeId),
          })
        } else if (cA.team.name !== 'TBD' && cB.team.name !== 'TBD') {
          const p = eloProb(cA.team.name, cB.team.name)
          map.set(nodeId, {
            kind: 'upcoming',
            teamA: cA.team.name, teamAFlag: cA.team.flag,
            teamB: cB.team.name, teamBFlag: cB.team.flag,
            probA: p, probB: 100 - p,
            date: m.date, venue: m.ground ?? '',
          })
        }
      }
    }

    // L1: upcoming R16 matches (overrides the generic pass above with
    // bothKnown-aware handling for matches that haven't happened yet)
    for (const um of layout.upcomingMatches) {
      const p = um.bothKnown ? eloProb(um.teamA, um.teamB) : 50
      const entry: NodeHoverData = {
        kind: 'upcoming',
        teamA: um.teamA, teamAFlag: um.teamAFlag,
        teamB: um.teamB, teamBFlag: um.teamBFlag,
        probA: p, probB: 100 - p,
        date: um.date, venue: um.venue,
      }
      const nodeA = layout.byId[um.nodeAId], nodeB = layout.byId[um.nodeBId]
      if (nodeA) map.set(um.nodeAId, nodeA.team.name !== 'TBD' ? entry : { kind: 'tbd' })
      if (nodeB) map.set(um.nodeBId, nodeB.team.name !== 'TBD' ? entry : { kind: 'tbd' })
    }

    // TBD fallback for any remaining nodes
    for (const node of layout.nodes) {
      if (!map.has(node.id) && node.team.name === 'TBD') map.set(node.id, { kind: 'tbd' })
    }

    return map
  }, [layout, r32m, r16m, qfm, sfm, finm, eloProb])

  // ── Upcoming match known-node set (for pulse rings) ──────────
  const upcomingNodeIds = useMemo(() => {
    const s = new Set<string>()
    for (const um of layout.upcomingMatches) {
      if (um.bothKnown) { s.add(um.nodeAId); s.add(um.nodeBId); s.add(um.parentId) }
    }
    return s
  }, [layout.upcomingMatches])

  function slotN(id: string): NSlot {
    if (!N.current[id]) N.current[id] = { wrap: null, ph: null, flag: null, ring: null, gold: null }
    return N.current[id]
  }
  function slotW(map: typeof T, id: string): WSlot {
    if (!map.current[id]) map.current[id] = { wrap: null }
    return map.current[id]
  }

  // ── Tooltip handlers ─────────────────────────────────────────
  const scheduleHide = useCallback(() => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
    tooltipTimerRef.current = setTimeout(() => {
      if (!isOverTooltipRef.current) setHoveredNode(null)
    }, 150)
  }, [])

  const showNode = useCallback((data: NodeHoverData, e: React.MouseEvent, source: HoverSource = 'circle') => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    setHoveredNode({ data, x: e.clientX - rect.left, y: e.clientY - rect.top, source })
  }, [])

  // ── Node position (includes idle float) ─────────────────────
  function pos(n: LNode, t: number): [number, number] {
    const ux = Math.cos(n.angle * DEG), uy = Math.sin(n.angle * DEG)
    const ramp = clamp((t - n.settleT) / 1.2, 0, 1)
    const rb = AMP[n.L] * Math.sin(t * 0.9 + n.phase) * ramp
    const tb = TANG[n.L] * Math.sin(t * 0.7 + n.phase * 1.3) * ramp
    return [CX + (n.radius + rb) * ux - uy * tb, CY + (n.radius + rb) * uy + ux * tb]
  }

  function ctrl(ax: number, ay: number, bx: number, by: number): [number, number] {
    const mx = (ax + bx) / 2, my = (ay + by) / 2
    return [mx + (CX - mx) * 0.18, my + (CY - my) * 0.18]
  }

  // ── Pure update(t) ─────────────────────────────────────────
  function update(t: number) {
    if (rootRef.current && layerRef.current) {
      const s = rootRef.current.clientWidth / 1000
      if (s > 0) layerRef.current.style.transform = `scale(${s})`
    }

    // ── Nodes
    for (const n of layout.nodes) {
      const r = N.current[n.id]; if (!r?.wrap) continue
      const p = pos(n, t)
      let op = 1, sc = 1

      if (n.isLeaf) {
        // ── L0 reveal
        const rp = clamp((t - n.revealStart) / 0.96, 0, 1)
        const e = easeOut(rp)
        op = e; sc = 0.5 + 0.5 * e

        // Determine match state
        const parent = layout.byId[n.parentId]
        const matchPlayed = parent && parent.team.name !== 'TBD'
        const isEliminated = !n.advanced && matchPlayed

        if (isEliminated) {
          // Fade from 1.0 to 0.2 over 0.6s starting slightly before result reveal
          const fadeProg = clamp((t - (n.parentFillEnd - 0.3)) / 0.6, 0, 1)
          op *= Math.max(0.2, 1 - 0.8 * fadeProg)
          if (r.ring) r.ring.style.opacity = String(Math.max(0.15, 0.6 * (1 - fadeProg)))
          if (r.gold) r.gold.style.opacity = '0'
          r.wrap.style.filter = fadeProg > 0.1 ? 'none' : `drop-shadow(0 0 8px rgba(227,194,126,${(0.5*(1-fadeProg)).toFixed(2)}))`
        } else if (n.advanced) {
          // Winner — gold glow intensifies
          const goldOp = clamp((t - n.parentFillEnd + 0.48) / 0.8, 0, 1)
          if (r.ring) r.ring.style.opacity = String(Math.max(0, 1 - goldOp * 0.85))
          if (r.gold) r.gold.style.opacity = String(goldOp)
          const gStr = (8 + 4 * goldOp).toFixed(1)
          const gAlp = (0.5 + 0.3 * goldOp).toFixed(2)
          r.wrap.style.filter = `drop-shadow(0 0 ${gStr}px rgba(227,194,126,${gAlp}))`
        } else {
          // Default: pending match — ambient white glow
          const settled = clamp((t - n.settleT) / 1.2, 0, 1)
          if (r.ring) r.ring.style.opacity = '1'
          if (r.gold) r.gold.style.opacity = '0'
          r.wrap.style.filter = settled > 0
            ? `drop-shadow(0 0 8px rgba(227,194,126,${(0.5 * settled).toFixed(2)}))`
            : 'none'
        }

      } else {
        // ── L1-L5 inner nodes
        const pf = clamp((t - n.fillStart) / n.fillDur, 0, 1)
        op = clamp((t - 1.12) / 1.28, 0, 1)
        const isTBD = n.team.name === 'TBD'

        if (r.ph) r.ph.style.opacity = String(clamp((1 - clamp((pf - 0.15) / 0.4, 0, 1)) * 0.95, 0, 0.95))
        const fIn = clamp((pf - 0.78) / 0.22, 0, 1)
        if (r.flag) r.flag.style.opacity = !isTBD ? String(fIn) : '0'
        if (r.gold) r.gold.style.opacity = !isTBD ? String(fIn) : '0'
        if (r.ring) r.ring.style.opacity = !isTBD ? String(Math.max(0, 1 - fIn * 0.85)) : '0.4'

        if (n.L === 5) sc = 0.55 + 0.45 * fIn

        // Glow for known inner nodes; mute TBDs
        if (isTBD) {
          op = Math.min(op, 0.5)
          r.wrap.style.filter = 'none'
        } else {
          r.wrap.style.filter = fIn > 0 ? `drop-shadow(0 0 ${(6 * fIn).toFixed(1)}px rgba(227,194,126,${(0.4 * fIn).toFixed(2)}))` : 'none'
        }
      }

      r.wrap.style.opacity = String(op)
      r.wrap.style.transform = `translate(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px) translate(-50%,-50%) scale(${sc})`
    }

    // ── Winner edges (gold, solid, draws in) — completed match, winning half
    for (const ed of layout.edges) {
      const el = E.current[ed.id]; if (!el) continue
      const a = pos(layout.byId[ed.fromId], t), b = pos(layout.byId[ed.toId], t)
      const [cx, cy] = ctrl(a[0], a[1], b[0], b[1])
      el.setAttribute('d', `M${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`)
      const pe = clamp((t - ed.fillStart) / 0.72, 0, 1)
      el.style.strokeDashoffset = String(1 - pe)
      el.style.opacity = pe > 0 ? '0.7' : '0'
    }

    // ── Loser edges (gold, dashed, muted) — completed match, losing half
    for (const ed of layout.loserEdges) {
      const el = LE.current[ed.id]; if (!el) continue
      const a = pos(layout.byId[ed.fromId], t), b = pos(layout.byId[ed.toId], t)
      const [cx, cy] = ctrl(a[0], a[1], b[0], b[1])
      el.setAttribute('d', `M${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`)
      const pe = clamp((t - ed.fillStart) / 0.72, 0, 1)
      el.style.opacity = String(pe * 0.25)
    }

    // ── Completed-match hit paths (wide invisible stroke spanning both
    // the winner and loser segments, so hovering either half shows the
    // same match tooltip)
    for (const n of layout.nodes) {
      if (!n.winChildId || !n.loseChildId) continue
      const el = EHit.current[n.id]; if (!el) continue
      const winPos = pos(layout.byId[n.winChildId], t)
      const losePos = pos(layout.byId[n.loseChildId], t)
      const nodePos = pos(n, t)
      const [c1x, c1y] = ctrl(winPos[0], winPos[1], nodePos[0], nodePos[1])
      const [c2x, c2y] = ctrl(nodePos[0], nodePos[1], losePos[0], losePos[1])
      el.setAttribute('d',
        `M${winPos[0].toFixed(1)} ${winPos[1].toFixed(1)} Q${c1x.toFixed(1)} ${c1y.toFixed(1)} ${nodePos[0].toFixed(1)} ${nodePos[1].toFixed(1)} ` +
        `Q${c2x.toFixed(1)} ${c2y.toFixed(1)} ${losePos[0].toFixed(1)} ${losePos[1].toFixed(1)}`)
    }

    // ── Skeleton
    for (const ed of layout.skeleton) {
      const el = S.current[ed.id]; if (!el) continue
      const a = pos(layout.byId[ed.fromId], t), b = pos(layout.byId[ed.toId], t)
      const [cx, cy] = ctrl(a[0], a[1], b[0], b[1])
      el.setAttribute('d', `M${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`)
      const skStart = 0.96 + (ed.level - 1) * 0.48
      const fin = clamp((t - skStart) / 1.28, 0, 1)
      let op = fin
      if (ed.isWinner) op *= 1 - clamp((t - ed.pStart) / 0.72, 0, 1)
      else op *= 1 - 0.55 * clamp((t - ed.pEnd) / 0.96, 0, 1)
      el.style.opacity = String(op)
    }

    // ── Winner travelers
    for (const tr of layout.travelers) {
      const r = T.current[tr.id]; if (!r?.wrap) continue
      const n = tr.node
      const pf = clamp((t - n.fillStart) / n.fillDur, 0, 1), e = easeIO(pf)
      const a = pos(layout.byId[tr.fromId], t), b = pos(n, t)
      let x = a[0] + (b[0] - a[0]) * e, y = a[1] + (b[1] - a[1]) * e
      const dx = CX - x, dy = CY - y, dl = Math.hypot(dx, dy) || 1
      const arc = Math.sin(Math.PI * e) * 8
      x += (dx/dl) * arc; y += (dy/dl) * arc
      r.wrap.style.opacity = String(clamp(pf / 0.12, 0, 1) * (1 - clamp((pf - 0.9) / 0.1, 0, 1)))
      r.wrap.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`
    }

    // ── Loser travelers
    for (const tr of layout.loserTravelers) {
      const r = LT.current[tr.id]; if (!r?.wrap) continue
      const n = tr.node
      const pf = clamp((t - n.fillStart) / n.fillDur, 0, 1)
      const reach = 0.6 * easeIO(clamp(pf / 0.55, 0, 1))
      const a = pos(layout.byId[tr.fromId], t), b = pos(n, t)
      const x = a[0] + (b[0] - a[0]) * reach, y = a[1] + (b[1] - a[1]) * reach
      const sc = 0.96 - 0.12 * clamp((pf - 0.4) / 0.4, 0, 1)
      r.wrap.style.opacity = String(clamp(pf / 0.12, 0, 1) * (1 - clamp((pf - 0.5) / 0.35, 0, 1)) * 0.88)
      r.wrap.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%) scale(${sc})`
    }

    // ── Round labels
    if (labRef.current) labRef.current.style.opacity = String(clamp((t - 0.48) / 1.92, 0, 1) * 0.6)

    // ── Champion caption + pulse rings
    const champ = layout.champion
    if (capRef.current) {
      capRef.current.style.opacity = String(champ.team.name !== 'TBD'
        ? clamp((t - champ.fillStart - 0.56) / 1.12, 0, 1) : 0)
    }
    pulseRefs.current.forEach((el, k) => {
      if (!el) return
      const lt = t - (champ.fillEnd + k * 0.8)
      if (lt > 0 && lt < 2.4) {
        el.style.opacity = String(0.55 * (1 - lt / 2.4))
        el.style.transform = `translate(-50%,-50%) scale(${0.3 + lt * 2.0})`
      } else {
        el.style.opacity = '0'
      }
    })

    // ── Path forward lines (upcoming matchups, fade in after R32) —
    // routed through the shared match node so the line visibly connects
    // both teams via the slot they're both converging on
    const pfFadeIn = clamp((t - 6.5) / 1.5, 0, 1)
    for (const um of layout.upcomingMatches) {
      const parent = layout.byId[um.parentId]
      const a = pos(layout.byId[um.nodeAId], t)
      const b = pos(layout.byId[um.nodeBId], t)
      const node = parent ? pos(parent, t) : ctrl(a[0], a[1], b[0], b[1])
      const [c1x, c1y] = ctrl(a[0], a[1], node[0], node[1])
      const [c2x, c2y] = ctrl(node[0], node[1], b[0], b[1])
      const dStr =
        `M${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${c1x.toFixed(1)} ${c1y.toFixed(1)} ${node[0].toFixed(1)} ${node[1].toFixed(1)} ` +
        `Q${c2x.toFixed(1)} ${c2y.toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`
      const elV = PF.current[um.id], elH = PFHit.current[um.id], elVS = VS.current[um.id]
      if (elV) { elV.setAttribute('d', dStr); elV.style.opacity = String(pfFadeIn * (um.bothKnown ? 0.7 : 0.35)) }
      if (elH) elH.setAttribute('d', dStr)
      if (elVS && um.bothKnown) {
        elVS.style.transform = `translate(${node[0].toFixed(1)}px,${node[1].toFixed(1)}px) translate(-50%,-50%)`
        elVS.style.opacity = String(pfFadeIn * 0.8)
      }
    }
  }

  // ── RAF clock ─────────────────────────────────────────────────
  useEffect(() => {
    startRef.current = performance.now()
    let raf: number
    const loop = (now: number) => { update((now - startRef.current) / 1000); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout])

  // ── ResizeObserver ─────────────────────────────────────────────
  useEffect(() => {
    const el = rootRef.current; if (!el) return
    const ro = new ResizeObserver(() => {
      const s = el.clientWidth / 1000
      if (layerRef.current) layerRef.current.style.transform = `scale(${s})`
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Missing flag diagnostic ────────────────────────────────────
  useEffect(() => {
    for (const m of r32m) {
      for (const team of [m.team1, m.team2]) {
        const flag = FLAGS[team]
        if (!flag || flag === '?') {
          console.log('[bracket] MISSING FLAG:', team)
        }
      }
    }
  }, [r32m])

  // ── Node-mapping diagnostic — logs every completed match with its two
  // feeder teams, the winner, and the match node id, read directly off the
  // resolved edges (not re-derived by index) so this reflects exactly what
  // gets drawn. A line that looks wrong can be checked against this list.
  useEffect(() => {
    for (const ed of layout.edges) {
      const node = layout.byId[ed.toId]
      const winner = layout.byId[ed.fromId]
      const loserEdge = layout.loserEdges.find(le => le.toId === ed.toId)
      const loser = loserEdge ? layout.byId[loserEdge.fromId] : null
      if (!node || !winner || !loser) continue
      console.log(ROUND_LABEL[node.L], winner.team.name, loser.team.name, node.team.name, node.id)
    }
  }, [layout])

  const replay = () => { startRef.current = performance.now() }
  const chipSize = (n: LNode) => n.size * 2
  const flagSize = (n: LNode) => n.size * (n.L === 5 ? 0.72 : 0.78)

  const fmtDate = (s: string) =>
    new Date(s + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const tooltipPos = (x: number, y: number, cW: number, cH: number) => {
    const TW = 250, TH = 152
    let left = x + 18, top = y - TH / 2
    if (left + TW > cW - 8) left = x - TW - 18
    if (left < 8) left = 8
    if (top < 8) top = 8
    if (top + TH > cH - 8) top = cH - TH - 8
    return { left, top }
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-4xl tracking-widest" style={{ color: ACCENT }}>
          KNOCKOUT BRACKET
        </h2>
        <p className="font-mono-data text-sm" style={{ color: 'rgba(243,237,224,0.52)' }}>
          Round of 32 through to the Final · Jul 19 MetLife Stadium
        </p>
      </div>

      <div className="scrollbar-hide" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
      <div ref={wrapRef} style={{ position: 'relative', minWidth: 340 }}>
        <div
          ref={rootRef}
          style={{
            position: 'relative', width: '100%', aspectRatio: '1 / 1',
            maxWidth: 860, margin: '0 auto',
            background: 'radial-gradient(circle at 50% 42%, #16181d 0%, #0b0c10 60%, #070809 100%)',
            borderRadius: 20, overflow: 'hidden',
          }}
        >
          {/* SVG layer */}
          <svg
            ref={svgRef}
            viewBox="0 0 1000 1000"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'all' }}
          >
            {layout.labels.map((l, i) => (
              <circle key={`g${i}`} cx={CX} cy={CY} r={l.r} fill="none" stroke={GUIDE_C} strokeWidth={1} />
            ))}
            <g ref={labRef} style={{ opacity: 0 }}>
              {layout.labels.map((l, i) => (
                <text key={`l${i}`} x={CX} y={CY - l.r + 6} textAnchor="middle" fill={LABEL_C}
                  style={{ font: '600 13px ui-monospace,"DM Mono",monospace', letterSpacing: '0.22em', userSelect: 'none', pointerEvents: 'none' }}>
                  {l.t}
                </text>
              ))}
            </g>
            {/* Skeleton — faint background guides */}
            {layout.skeleton.map(ed => (
              <path key={ed.id} ref={el => { S.current[ed.id] = el }}
                fill="none" stroke={SKEL_C} strokeWidth={1.4} strokeLinecap="round" strokeDasharray="5 8" style={{ opacity: 0 }} />
            ))}

            {/* ── Completed match connections ── */}
            {/* Loser half — dashed, muted: "this team went no further" */}
            {layout.loserEdges.map(ed => (
              <path key={ed.id} ref={el => { LE.current[ed.id] = el }}
                fill="none" stroke={ACCENT} strokeWidth={1.5} strokeLinecap="round" strokeDasharray="3 4"
                style={{ opacity: 0 }} />
            ))}
            {/* Winner half — solid gold, draws in */}
            {layout.edges.map(ed => (
              <path key={ed.id} ref={el => { E.current[ed.id] = el }}
                fill="none" stroke={ACCENT} strokeWidth={1.5} strokeLinecap="round"
                pathLength={1} strokeDasharray={1}
                style={{ strokeDashoffset: 1, opacity: 0, filter: `drop-shadow(0 0 3px ${ACCENT}55)` }} />
            ))}

            {/* ── Upcoming match connections (paint above completed lines) ── */}
            {/* Partial — one team known, dashed static */}
            {layout.upcomingMatches.filter(um => !um.bothKnown).map(um => (
              <path key={`pf-${um.id}`} ref={el => { PF.current[um.id] = el }}
                fill="none" stroke={ACCENT} strokeWidth={1} strokeLinecap="round" strokeDasharray="4 4"
                style={{ opacity: 0 }} />
            ))}
            {/* Both known — animated flowing dashes toward the shared match node */}
            {layout.upcomingMatches.filter(um => um.bothKnown).map(um => (
              <path key={`pf-${um.id}`} ref={el => { PF.current[um.id] = el }}
                className="wpc-flow-inward"
                fill="none" stroke={ACCENT} strokeWidth={2} strokeLinecap="round" strokeDasharray="6 3"
                style={{ opacity: 0, filter: `drop-shadow(0 0 4px ${ACCENT}55)` }} />
            ))}

            {/* ── Hit areas (wide, invisible, always on top within the SVG) ── */}
            {layout.nodes.filter(n => n.winChildId && n.loseChildId).map(n => (
              <path key={`ehit-${n.id}`} ref={el => { EHit.current[n.id] = el }}
                fill="none" stroke="transparent" strokeWidth={20}
                style={{ cursor: 'pointer', pointerEvents: 'all' }}
                onMouseEnter={e => { const d = nodeHoverData.get(n.id); if (d) showNode(d, e, 'line') }}
                onMouseLeave={scheduleHide}
              />
            ))}
            {layout.upcomingMatches.filter(um => um.bothKnown).map(um => (
              <path key={`pfhit-${um.id}`} ref={el => { PFHit.current[um.id] = el }}
                fill="none" stroke="transparent" strokeWidth={20}
                style={{ cursor: 'pointer', pointerEvents: 'all' }}
                onMouseEnter={e => { const d = nodeHoverData.get(um.nodeAId); if (d) showNode(d, e, 'line') }}
                onMouseLeave={scheduleHide}
              />
            ))}
          </svg>

          {/* HTML chip layer — pointerEvents:none so SVG hit areas work through gaps */}
          <div
            ref={layerRef}
            style={{ position: 'absolute', left: 0, top: 0, width: 1000, height: 1000, transformOrigin: '0 0', pointerEvents: 'none' }}
          >
            {/* ── Node chips ── */}
            {layout.nodes.map(n => {
              const hd = nodeHoverData.get(n.id)
              return (
                <div key={n.id}
                  ref={el => { slotN(n.id).wrap = el }}
                  onMouseEnter={hd ? e => showNode(hd, e) : undefined}
                  onMouseLeave={hd ? scheduleHide : undefined}
                  style={{
                    position: 'absolute', left: 0, top: 0,
                    width: chipSize(n), height: chipSize(n),
                    opacity: 0, willChange: 'transform, opacity',
                    pointerEvents: hd ? 'auto' : 'none',
                    cursor: hd ? 'pointer' : 'default',
                  }}
                >
                  {/* Placeholder */}
                  {!n.isLeaf && n.L < 5 && (
                    <div ref={el => { slotN(n.id).ph = el }}
                      style={{
                        position: 'absolute', inset: 0, borderRadius: '50%',
                        background: PH_FILL, border: `1.5px dashed ${PH_STR}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: PH_TXT, fontWeight: 600, fontSize: n.size * 0.8,
                        fontFamily: 'ui-monospace,"DM Mono",monospace', opacity: 0,
                      }}>?</div>
                  )}
                  {/* Flag */}
                  <div ref={el => { slotN(n.id).flag = el }}
                    style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      backgroundColor: CHIP_BG, boxShadow: CHIP_SHD,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: flagSize(n), lineHeight: 1,
                      fontFamily: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif",
                      opacity: n.isLeaf ? 1 : 0,
                    }}>
                    {n.team.flag}
                  </div>
                  {/* Gloss */}
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none',
                    background: 'radial-gradient(circle at 50% 26%, rgba(255,255,255,0.34), rgba(255,255,255,0) 62%)',
                  }} />
                  {/* Default ring — dynamically controlled (opacity driven by update) */}
                  <div ref={el => { slotN(n.id).ring = el }}
                    style={{
                      position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none',
                      border: RING_DEFAULT,
                    }} />
                  {/* Gold ring — fades in for winners */}
                  <div ref={el => { slotN(n.id).gold = el }}
                    style={{
                      position: 'absolute', inset: -1, borderRadius: '50%', pointerEvents: 'none',
                      border: RING_GOLD, boxShadow: `0 0 13px ${ACCENT}77`, opacity: 0,
                    }} />
                  {/* Pulse ring for upcoming known match teams */}
                  {upcomingNodeIds.has(n.id) && (
                    <div style={{
                      position: 'absolute', inset: -2, borderRadius: '50%', pointerEvents: 'none',
                      border: `2px solid ${ACCENT}`,
                      animation: 'wpc-bracket-pulse 2.5s ease-in-out infinite',
                    }} />
                  )}
                </div>
              )
            })}

            {/* ── Winner travelers ── */}
            {layout.travelers.map(tr => (
              <div key={tr.id} ref={el => { slotW(T, tr.id).wrap = el }}
                style={{ position: 'absolute', left: 0, top: 0, width: chipSize(tr.node), height: chipSize(tr.node), opacity: 0, willChange: 'transform, opacity', zIndex: 5, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', backgroundColor: CHIP_BG, boxShadow: CHIP_SHD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: flagSize(tr.node), lineHeight: 1, fontFamily: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif" }}>
                  {layout.byId[tr.fromId]?.team.flag ?? '?'}
                </div>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none', background: 'radial-gradient(circle at 50% 26%, rgba(255,255,255,0.34), rgba(255,255,255,0) 62%)' }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none', border: RING_DEFAULT }} />
                <div style={{ position: 'absolute', inset: -1, borderRadius: '50%', pointerEvents: 'none', border: RING_GOLD, boxShadow: `0 0 13px ${ACCENT}77` }} />
              </div>
            ))}

            {/* ── Loser travelers ── */}
            {layout.loserTravelers.map(tr => (
              <div key={tr.id} ref={el => { slotW(LT, tr.id).wrap = el }}
                style={{ position: 'absolute', left: 0, top: 0, width: chipSize(tr.node), height: chipSize(tr.node), opacity: 0, willChange: 'transform, opacity', zIndex: 4, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', backgroundColor: CHIP_BG, boxShadow: CHIP_SHD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: flagSize(tr.node), lineHeight: 1, fontFamily: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif" }}>
                  {layout.byId[tr.fromId]?.team.flag ?? '?'}
                </div>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none', background: 'radial-gradient(circle at 50% 26%, rgba(255,255,255,0.34), rgba(255,255,255,0) 62%)' }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none', border: RING_DEFAULT }} />
              </div>
            ))}

            {/* ── VS labels ── */}
            {layout.upcomingMatches.filter(um => um.bothKnown).map(um => (
              <div key={`vs-${um.id}`} ref={el => { VS.current[um.id] = el }}
                style={{
                  position: 'absolute', left: 0, top: 0, transform: 'translate(-50%,-50%)',
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: ACCENT,
                  opacity: 0, pointerEvents: 'none', background: 'rgba(0,0,0,0.45)',
                  padding: '2px 5px', borderRadius: 10, fontFamily: 'ui-monospace,"DM Mono",monospace',
                  zIndex: 3, whiteSpace: 'nowrap',
                }}>
                VS
              </div>
            ))}

            {/* ── Champion pulses ── */}
            {[0, 1, 2].map(k => (
              <div key={`p${k}`} ref={el => { pulseRefs.current[k] = el }}
                style={{ position: 'absolute', left: CX, top: CY, width: 150, height: 150, marginLeft: -75, marginTop: -75, borderRadius: '50%', border: `2px solid ${ACCENT}`, opacity: 0, pointerEvents: 'none', transform: 'translate(-50%,-50%) scale(0.3)' }} />
            ))}

            {/* ── Champion caption ── */}
            <div ref={capRef}
              style={{ position: 'absolute', left: CX, top: CY + 110, transform: 'translate(-50%, 0)', textAlign: 'center', opacity: 0, pointerEvents: 'none', padding: '10px 22px 12px', borderRadius: 18, background: 'rgba(8,9,12,0.72)', backdropFilter: 'blur(6px)', boxShadow: `0 0 0 1px ${ACCENT}33, 0 8px 26px rgba(0,0,0,0.5)`, fontFamily: 'ui-sans-serif,-apple-system,system-ui,sans-serif', whiteSpace: 'nowrap' }}>
              <div style={{ fontSize: 28, marginBottom: 3, filter: `drop-shadow(0 0 10px ${ACCENT}88)` }}>🏆</div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 24, letterSpacing: '0.01em', lineHeight: 1 }}>{layout.champion.team.name}</div>
              <div style={{ color: ACCENT, fontWeight: 600, fontSize: 11, letterSpacing: '0.34em', marginTop: 6, fontFamily: 'ui-monospace,"DM Mono",monospace' }}>WORLD CHAMPIONS 2026</div>
            </div>

            {/* ── Replay ── */}
            <button onClick={replay}
              style={{ position: 'absolute', right: 18, bottom: 16, zIndex: 10, padding: '8px 16px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.82)', font: '600 12px ui-sans-serif,system-ui,sans-serif', letterSpacing: '0.08em', cursor: 'pointer', pointerEvents: 'auto' }}>
              ↻ REPLAY
            </button>
          </div>
        </div>

        {/* ── Match tooltip (outside overflow:hidden) ── */}
        {hoveredNode && (() => {
          const { data, x, y, source } = hoveredNode
          const cW = rootRef.current?.clientWidth ?? 600
          const cH = rootRef.current?.clientHeight ?? 600
          const { left, top } = tooltipPos(x, y, cW, cH)
          const MONO = 'ui-monospace,"DM Mono",monospace'
          const BODY = 'var(--font-dm-sans),ui-sans-serif,system-ui,sans-serif'
          const EMOJI = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"
          return (
            <div
              onMouseEnter={() => { isOverTooltipRef.current = true; if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current) }}
              onMouseLeave={() => { isOverTooltipRef.current = false; scheduleHide() }}
              style={{
                position: 'absolute', left, top, zIndex: 20, width: 250, padding: '14px 18px',
                background: 'rgba(11,18,36,0.95)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(227,194,126,0.3)', borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)', pointerEvents: 'auto',
              }}
            >
              {data.kind === 'tbd' && (
                <p style={{ fontSize: 12, color: 'rgba(243,237,224,0.52)', fontFamily: MONO, textAlign: 'center' }}>
                  TBD — awaiting result
                </p>
              )}

              {data.kind === 'completed' && source === 'circle' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 20, fontFamily: EMOJI }}>{data.flag}</span>
                    <span style={{ flex: 1, fontSize: 14, color: '#f3ede0', fontWeight: 600, fontFamily: BODY }}>{data.team}</span>
                    <span style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, color: data.won ? ACCENT : 'rgba(243,237,224,0.45)', letterSpacing: '0.06em' }}>
                      {data.won ? 'WON' : 'OUT'}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'rgba(243,237,224,0.6)', fontFamily: BODY, marginBottom: 6 }}>
                    vs <span style={{ fontFamily: EMOJI }}>{data.opponentFlag}</span> {data.opponent} · {data.score}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(243,237,224,0.38)', fontFamily: MONO, marginBottom: 4 }}>
                    Had {data.probMyTeam}% chance to win
                  </p>
                  <p style={{ fontSize: 11, fontFamily: MONO, fontWeight: 600, color: data.statusLabel.startsWith('Eliminated') ? 'rgba(243,237,224,0.45)' : ACCENT }}>
                    {data.statusLabel}
                  </p>
                </>
              )}

              {data.kind === 'completed' && source === 'line' && (
                <>
                  <p style={{ textAlign: 'center', fontSize: 9, fontFamily: MONO, color: ACCENT, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                    Completed Match
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18, fontFamily: EMOJI }}>{data.flag}</span>
                    <span style={{ flex: 1, fontSize: 13, color: '#f3ede0', fontWeight: 600, fontFamily: BODY }}>{data.team}</span>
                  </div>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', marginBottom: 8 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 18, fontFamily: EMOJI }}>{data.opponentFlag}</span>
                    <span style={{ flex: 1, fontSize: 13, color: '#f3ede0', fontWeight: 600, fontFamily: BODY }}>{data.opponent}</span>
                  </div>
                  <p style={{ textAlign: 'center', fontSize: 13, color: ACCENT, fontWeight: 700, fontFamily: MONO, marginBottom: 6 }}>
                    {data.score}
                  </p>
                  <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(243,237,224,0.52)', fontFamily: MONO }}>
                    {data.team} advanced
                  </p>
                </>
              )}

              {data.kind === 'upcoming' && (
                <>
                  <p style={{ textAlign: 'center', fontSize: 9, fontFamily: MONO, color: ACCENT, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                    Match Probability
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18, fontFamily: "'Apple Color Emoji','Segoe UI Emoji',sans-serif" }}>{data.teamAFlag}</span>
                    <span style={{ flex: 1, fontSize: 13, color: '#f3ede0', fontWeight: 600, fontFamily: BODY }}>{data.teamA}</span>
                    <span style={{ fontSize: 14, color: ACCENT, fontWeight: 700, fontFamily: MONO }}>{data.probA}%</span>
                  </div>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', marginBottom: 8 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 18, fontFamily: "'Apple Color Emoji','Segoe UI Emoji',sans-serif" }}>{data.teamBFlag}</span>
                    <span style={{ flex: 1, fontSize: 13, color: '#f3ede0', fontWeight: 600, fontFamily: BODY }}>{data.teamB}</span>
                    <span style={{ fontSize: 14, color: ACCENT, fontWeight: 700, fontFamily: MONO }}>{data.probB}%</span>
                  </div>
                  <p style={{ textAlign: 'center', fontSize: 9, fontFamily: MONO, color: 'rgba(243,237,224,0.52)' }}>
                    {fmtDate(data.date)}{data.venue ? ` · ${data.venue.split('(')[0].trim()}` : ''}
                  </p>
                </>
              )}
            </div>
          )
        })()}
      </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 flex-wrap justify-center" style={{ opacity: 0.8 }}>
        {[
          { border: RING_GOLD, shadow: `0 0 8px ${ACCENT}66`, label: 'Winner / advancing' },
          { border: '2px solid rgba(255,255,255,0.6)', shadow: 'drop-shadow(0 0 8px rgba(227,194,126,0.5))', label: 'All 32 at start' },
          { border: '1px solid rgba(255,255,255,0.15)', shadow: 'none', label: 'Eliminated', opacity: 0.2 },
          { border: `1.5px solid ${ACCENT}`, shadow: `0 0 6px ${ACCENT}55`, label: 'Upcoming known matchup', opacity: 0.7 },
        ].map(({ border, shadow, label, opacity }) => (
          <div key={label} className="flex items-center gap-2">
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              backgroundColor: CHIP_BG, border, boxShadow: shadow.startsWith('drop') ? undefined : shadow,
              filter: shadow.startsWith('drop') ? shadow : undefined,
              opacity: opacity ?? 1, flexShrink: 0,
            }} />
            <span style={{ fontFamily: 'ui-monospace,"DM Mono",monospace', fontSize: 11, color: 'rgba(243,237,224,0.52)' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
