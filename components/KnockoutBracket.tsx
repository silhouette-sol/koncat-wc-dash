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
const RING_C    = 'rgba(255,255,255,0.28)'
const PH_FILL   = 'rgba(255,255,255,0.04)'
const PH_STR    = 'rgba(255,255,255,0.16)'
const PH_TXT    = 'rgba(255,255,255,0.34)'
const SKEL_C    = 'rgba(255,255,255,0.15)'
const GUIDE_C   = 'rgba(255,255,255,0.05)'
const LABEL_C   = 'rgba(255,255,255,0.38)'
const CHIP_BG   = '#1a1d22'
const CHIP_SHD  = '0 6px 16px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.18)'

// ── Easing ─────────────────────────────────────────────────────
const clamp  = (v: number, a: number, b: number) => v < a ? a : v > b ? b : v
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3)
const easeIO  = (p: number) => p < 0.5 ? 4*p*p*p : 1 - Math.pow(-2*p+2, 3)/2

// ── Flags ──────────────────────────────────────────────────────
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
interface LTrav    { id: string; fromId: string; node: LNode }
interface LSkel    { id: string; fromId: string; toId: string; isWinner: boolean; level: number; pStart: number; pEnd: number }
interface UMData   {
  id: string
  nodeAId: string; nodeBId: string
  teamA: string; teamB: string
  teamAFlag: string; teamBFlag: string
  date: string; venue: string
  bothKnown: boolean
}
interface Layout   {
  nodes: LNode[]; byId: Record<string, LNode>
  edges: LEdge[]; travelers: LTrav[]; loserTravelers: LTrav[]
  skeleton: LSkel[]; champion: LNode
  labels: { t: string; r: number }[]
  upcomingMatches: UMData[]
}

// ── DOM slots ──────────────────────────────────────────────────
interface NSlot { wrap: HTMLDivElement | null; ph: HTMLDivElement | null; flag: HTMLDivElement | null; gold: HTMLDivElement | null }
interface WSlot { wrap: HTMLDivElement | null }

// ── Bracket tree builder (driven by real match data) ──────────
function buildLayout(
  r32m: WCMatch[], r16m: WCMatch[], qfm: WCMatch[], sfm: WCMatch[], finm: WCMatch | undefined
): Layout {
  const matchArrays: (WCMatch | undefined)[][] = [
    [],
    r32m,
    r16m,
    qfm,
    sfm,
    finm ? [finm] : [],
  ]

  const levels: { team: LTeam; angle: number }[][] = [
    r32m.flatMap((m, j) => [
      { team: { name: m.team1, flag: FLAGS[m.team1] ?? '?' }, angle: -90 + (2*j)*11.25 },
      { team: { name: m.team2, flag: FLAGS[m.team2] ?? '?' }, angle: -90 + (2*j+1)*11.25 },
    ]),
  ]

  for (let L = 1; L <= 5; L++) {
    const cnt = 32 >> L
    levels[L] = []
    for (let j = 0; j < cnt; j++) {
      const cA = levels[L-1][2*j], cB = levels[L-1][2*j+1]
      const match = matchArrays[L][j]
      const winner = match ? getMatchResult(match).winner : null
      const team: LTeam = winner
        ? cA.team.name === winner ? cA.team
          : cB.team.name === winner ? cB.team
          : { name: winner, flag: FLAGS[winner] ?? '?' }
        : { name: 'TBD', flag: '?' }
      levels[L].push({ team, angle: (cA.angle + cB.angle) / 2 })
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

  const edges: LEdge[] = [], travelers: LTrav[] = [], loserTravelers: LTrav[] = [], skeleton: LSkel[] = []
  for (let L = 1; L <= 5; L++) {
    for (let j = 0; j < (32 >> L); j++) {
      const node = byId[`${L}-${j}`]
      const cA = byId[`${L-1}-${2*j}`], cB = byId[`${L-1}-${2*j+1}`]
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
      if (loseChild) loserTravelers.push({ id: `L${node.id}`, fromId: loseChild.id, node })

      skeleton.push(
        { id: `sA${node.id}`, fromId: cA.id, toId: node.id, isWinner: winChild?.id === cA.id, level: L, pStart: node.fillStart, pEnd: node.fillEnd },
        { id: `sB${node.id}`, fromId: cB.id, toId: node.id, isWinner: winChild?.id === cB.id, level: L, pStart: node.fillStart, pEnd: node.fillEnd },
      )
    }
  }
  nodes.forEach(n => {
    if (n.isLeaf && n.parentId) n.advanced = byId[n.parentId]?.winChildId === n.id
  })

  // ── Compute upcoming R16 matches (unplayed, with at least one known team)
  const l1Nodes = nodes.filter(n => n.L === 1)
  const findL1Id = (teamRef: string): string | null => {
    const wm = teamRef.match(/^W(\d+)$/)
    if (wm) {
      const mNum = parseInt(wm[1])
      const idx = r32m.findIndex(m => m.num === mNum)
      return idx >= 0 ? `1-${idx}` : null
    }
    const nd = l1Nodes.find(n => n.team.name === teamRef)
    return nd?.id ?? null
  }

  const upcomingMatches: UMData[] = []
  for (let j = 0; j < r16m.length; j++) {
    const m = r16m[j]
    if (m.score) continue
    const nodeAId = findL1Id(m.team1)
    const nodeBId = findL1Id(m.team2)
    if (!nodeAId || !nodeBId) continue
    const nodeA = byId[nodeAId], nodeB = byId[nodeBId]
    if (!nodeA || !nodeB) continue
    if (nodeA.team.name === 'TBD' && nodeB.team.name === 'TBD') continue
    const bothKnown = nodeA.team.name !== 'TBD' && nodeB.team.name !== 'TBD'
    upcomingMatches.push({
      id: `um${j}`, nodeAId, nodeBId,
      teamA: nodeA.team.name, teamB: nodeB.team.name,
      teamAFlag: nodeA.team.flag, teamBFlag: nodeB.team.flag,
      date: m.date, venue: m.ground ?? '', bothKnown,
    })
  }

  return {
    nodes, byId, edges, travelers, loserTravelers, skeleton,
    champion: byId['5-0'],
    labels: [
      { t: 'ROUND OF 32', r: RADII[0] }, { t: 'ROUND OF 16', r: RADII[1] },
      { t: 'QUARTERS', r: RADII[2] }, { t: 'SEMIS', r: RADII[3] }, { t: 'FINAL', r: RADII[4] },
    ],
    upcomingMatches,
  }
}

// ── Component props ────────────────────────────────────────────
interface KnockoutBracketProps {
  matches: WCMatch[]
  teams: TeamComparison[]
}

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

  const layout = useMemo(
    () => buildLayout(r32m, r16m, qfm, sfm, finm),
    [r32m, r16m, qfm, sfm, finm]
  )

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
  const E  = useRef<Record<string, SVGPathElement | null>>({})
  const S  = useRef<Record<string, SVGPathElement | null>>({})
  const PF    = useRef<Record<string, SVGPathElement | null>>({})
  const PFHit = useRef<Record<string, SVGPathElement | null>>({})
  const VS    = useRef<Record<string, HTMLDivElement | null>>({})

  // ── Tooltip state ────────────────────────────────────────────
  const [hoveredMatch, setHoveredMatch] = useState<{ um: UMData; x: number; y: number } | null>(null)
  const tooltipTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isOverTooltipRef = useRef(false)

  // ── Upcoming match sets ──────────────────────────────────────
  const upcomingNodeIds = useMemo(() => {
    const s = new Set<string>()
    for (const um of layout.upcomingMatches) {
      if (um.bothKnown) { s.add(um.nodeAId); s.add(um.nodeBId) }
    }
    return s
  }, [layout.upcomingMatches])

  const nodeToUM = useMemo(() => {
    const m = new Map<string, UMData>()
    for (const um of layout.upcomingMatches) {
      if (um.bothKnown) { m.set(um.nodeAId, um); m.set(um.nodeBId, um) }
    }
    return m
  }, [layout.upcomingMatches])

  function slotN(id: string): NSlot {
    if (!N.current[id]) N.current[id] = { wrap: null, ph: null, flag: null, gold: null }
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
      if (!isOverTooltipRef.current) setHoveredMatch(null)
    }, 150)
  }, [])

  const showTooltip = useCallback((um: UMData, e: React.MouseEvent) => {
    if (!um.bothKnown) return
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    setHoveredMatch({ um, x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [])

  // ── Node position (includes idle float) ─────────────────────
  function pos(n: LNode, t: number): [number, number] {
    const ux = Math.cos(n.angle * DEG), uy = Math.sin(n.angle * DEG)
    const ramp = clamp((t - n.settleT) / 1.2, 0, 1)
    const rb = AMP[n.L] * Math.sin(t * 0.9 + n.phase) * ramp
    const tb = TANG[n.L] * Math.sin(t * 0.7 + n.phase * 1.3) * ramp
    const R = n.radius + rb
    return [CX + R * ux - uy * tb, CY + R * uy + ux * tb]
  }

  // ── Quadratic bezier control point (pulled 18% toward center)
  function ctrl(ax: number, ay: number, bx: number, by: number): [number, number] {
    const mx = (ax + bx) / 2, my = (ay + by) / 2
    return [mx + (CX - mx) * 0.18, my + (CY - my) * 0.18]
  }

  // ── Pure update(t) — writes imperatively to all DOM refs ─────
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
        const rp = clamp((t - n.revealStart) / 0.96, 0, 1), e = easeOut(rp)
        op = e; sc = 0.5 + 0.5 * e
        if (!n.advanced) {
          const d = clamp((t - n.parentFillEnd) / 0.8, 0, 1)
          op *= 1 - 0.62 * d
        }
        if (r.gold) r.gold.style.opacity = n.advanced
          ? String(clamp((t - n.parentFillEnd + 0.48) / 0.8, 0, 1))
          : '0'
      } else {
        const pf = clamp((t - n.fillStart) / n.fillDur, 0, 1)
        op = clamp((t - 1.12) / 1.28, 0, 1)
        if (r.ph) r.ph.style.opacity = String(clamp((1 - clamp((pf - 0.15) / 0.4, 0, 1)) * 0.95, 0, 0.95))
        const fIn = clamp((pf - 0.78) / 0.22, 0, 1)
        if (r.flag) r.flag.style.opacity = n.team.name !== 'TBD' ? String(fIn) : '0'
        if (r.gold) r.gold.style.opacity = n.team.name !== 'TBD' ? String(fIn) : '0'
        if (n.L === 5) sc = 0.55 + 0.45 * fIn
      }

      r.wrap.style.opacity = String(op)
      r.wrap.style.transform = `translate(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px) translate(-50%,-50%) scale(${sc})`
    }

    // ── Winner edges
    for (const ed of layout.edges) {
      const el = E.current[ed.id]; if (!el) continue
      const a = pos(layout.byId[ed.fromId], t), b = pos(layout.byId[ed.toId], t)
      const [cx, cy] = ctrl(a[0], a[1], b[0], b[1])
      el.setAttribute('d', `M${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`)
      const pe = clamp((t - ed.fillStart) / 0.72, 0, 1)
      el.style.strokeDashoffset = String(1 - pe)
      el.style.opacity = pe > 0 ? '0.9' : '0'
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
      const op = clamp(pf / 0.12, 0, 1) * (1 - clamp((pf - 0.9) / 0.1, 0, 1))
      r.wrap.style.opacity = String(op)
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
      const op = clamp(pf / 0.12, 0, 1) * (1 - clamp((pf - 0.5) / 0.35, 0, 1))
      r.wrap.style.opacity = String(op * 0.88)
      const sc = 0.96 - 0.12 * clamp((pf - 0.4) / 0.4, 0, 1)
      r.wrap.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%) scale(${sc})`
    }

    // ── Round labels
    if (labRef.current) labRef.current.style.opacity = String(clamp((t - 0.48) / 1.92, 0, 1) * 0.6)

    // ── Champion caption + pulse rings
    const champ = layout.champion
    if (capRef.current) {
      const showCap = champ.team.name !== 'TBD'
        ? clamp((t - champ.fillStart - 0.56) / 1.12, 0, 1)
        : 0
      capRef.current.style.opacity = String(showCap)
    }
    const cEnd = champ.fillEnd
    pulseRefs.current.forEach((el, k) => {
      if (!el) return
      const lt = t - (cEnd + k * 0.8)
      if (lt > 0 && lt < 2.4) {
        const s = 0.3 + lt * 2.0
        el.style.opacity = String(0.55 * (1 - lt / 2.4))
        el.style.transform = `translate(-50%,-50%) scale(${s})`
      } else {
        el.style.opacity = '0'
      }
    })

    // ── Path forward lines (upcoming R16 matchups, fade in after R32 settles)
    const pfFadeIn = clamp((t - 6.5) / 1.5, 0, 1)
    for (const um of layout.upcomingMatches) {
      const a = pos(layout.byId[um.nodeAId], t)
      const b = pos(layout.byId[um.nodeBId], t)
      const [qcx, qcy] = ctrl(a[0], a[1], b[0], b[1])
      const dStr = `M${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${qcx.toFixed(1)} ${qcy.toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`
      const elV = PF.current[um.id]
      const elH = PFHit.current[um.id]
      const elVS = VS.current[um.id]
      if (elV) {
        elV.setAttribute('d', dStr)
        elV.style.opacity = String(pfFadeIn * (um.bothKnown ? 0.7 : 0.35))
      }
      if (elH) elH.setAttribute('d', dStr)
      if (elVS && um.bothKnown) {
        const mx = 0.25*a[0] + 0.5*qcx + 0.25*b[0]
        const my = 0.25*a[1] + 0.5*qcy + 0.25*b[1]
        elVS.style.transform = `translate(${mx.toFixed(1)}px,${my.toFixed(1)}px) translate(-50%,-50%)`
        elVS.style.opacity = String(pfFadeIn * 0.8)
      }
    }
  }

  // ── RAF clock — runs forever, intro plays once ────────────────
  useEffect(() => {
    startRef.current = performance.now()
    let raf: number
    const loop = (now: number) => {
      update((now - startRef.current) / 1000)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout])

  // ── ResizeObserver: keep HTML chip layer scaled to SVG ────────
  useEffect(() => {
    const el = rootRef.current; if (!el) return
    const ro = new ResizeObserver(() => {
      const s = el.clientWidth / 1000
      if (layerRef.current) layerRef.current.style.transform = `scale(${s})`
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const replay = () => { startRef.current = performance.now() }

  const chipSize = (n: LNode) => n.size * 2
  const flagSize = (n: LNode) => n.size * (n.L === 5 ? 0.72 : 0.78)

  // ── Elo probability for tooltip ──────────────────────────────
  const getEloProb = (teamA: string, teamB: string): [number, number] => {
    const eA = teams.find(t => t.name === teamA)?.elo_rating ?? 1500
    const eB = teams.find(t => t.name === teamB)?.elo_rating ?? 1500
    const p = Math.round((1 / (1 + Math.pow(10, (eB - eA) / 400))) * 100)
    return [p, 100 - p]
  }

  const fmtDate = (s: string) =>
    new Date(s + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  // ── Tooltip position calculation ─────────────────────────────
  const tooltipPos = (x: number, y: number, cW: number, cH: number) => {
    const TW = 244, TH = 148
    let left = x + 18, top = y - TH / 2
    if (left + TW > cW - 8) left = x - TW - 18
    if (left < 8) left = 8
    if (top < 8) top = 8
    if (top + TH > cH - 8) top = cH - TH - 8
    return { left, top }
  }

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

      {/* Wrapper for tooltip overflow (outside the overflow:hidden root) */}
      <div ref={wrapRef} style={{ position: 'relative' }}>

        {/* Main bracket canvas */}
        <div
          ref={rootRef}
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1 / 1',
            maxWidth: 860,
            margin: '0 auto',
            background: 'radial-gradient(circle at 50% 42%, #16181d 0%, #0b0c10 60%, #070809 100%)',
            borderRadius: 20,
            overflow: 'hidden',
          }}
        >
          {/* SVG layer */}
          <svg
            ref={svgRef}
            viewBox="0 0 1000 1000"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
          >
            {/* Orbit guide circles */}
            {layout.labels.map((l, i) => (
              <circle key={`g${i}`} cx={CX} cy={CY} r={l.r} fill="none" stroke={GUIDE_C} strokeWidth={1} />
            ))}

            {/* Round labels */}
            <g ref={labRef} style={{ opacity: 0 }}>
              {layout.labels.map((l, i) => (
                <text key={`l${i}`}
                  x={CX} y={CY - l.r + 6}
                  textAnchor="middle" fill={LABEL_C}
                  style={{ font: '600 13px ui-monospace,"DM Mono",monospace', letterSpacing: '0.22em', userSelect: 'none', pointerEvents: 'none' }}
                >
                  {l.t}
                </text>
              ))}
            </g>

            {/* Skeleton edges (dashed, full matchup tree) */}
            {layout.skeleton.map(ed => (
              <path key={ed.id}
                ref={el => { S.current[ed.id] = el }}
                fill="none" stroke={SKEL_C} strokeWidth={1.4}
                strokeLinecap="round" strokeDasharray="5 8"
                style={{ opacity: 0 }}
              />
            ))}

            {/* Path forward lines — known upcoming matchups (solid gold) */}
            {layout.upcomingMatches.filter(um => um.bothKnown).map(um => (
              <path key={`pf-${um.id}`}
                ref={el => { PF.current[um.id] = el }}
                fill="none" stroke={ACCENT} strokeWidth={1.5}
                strokeLinecap="round"
                style={{ opacity: 0, filter: `drop-shadow(0 0 4px ${ACCENT}55)` }}
              />
            ))}

            {/* Path forward lines — partial matchups (dashed gold) */}
            {layout.upcomingMatches.filter(um => !um.bothKnown).map(um => (
              <path key={`pf-${um.id}`}
                ref={el => { PF.current[um.id] = el }}
                fill="none" stroke={ACCENT} strokeWidth={1}
                strokeLinecap="round" strokeDasharray="4 4"
                style={{ opacity: 0 }}
              />
            ))}

            {/* Winner edges (gold, draws in) */}
            {layout.edges.map(ed => (
              <path key={ed.id}
                ref={el => { E.current[ed.id] = el }}
                fill="none" stroke={ACCENT} strokeWidth={2}
                strokeLinecap="round" pathLength={1} strokeDasharray={1}
                style={{ strokeDashoffset: 1, opacity: 0, filter: `drop-shadow(0 0 3px ${ACCENT}55)` }}
              />
            ))}

            {/* Hit areas for upcoming known matchup lines (transparent, wide for easy hover) */}
            {layout.upcomingMatches.filter(um => um.bothKnown).map(um => (
              <path key={`pfhit-${um.id}`}
                ref={el => { PFHit.current[um.id] = el }}
                fill="none" stroke="transparent" strokeWidth={20}
                style={{ cursor: 'pointer' }}
                onMouseEnter={e => showTooltip(um, e)}
                onMouseLeave={scheduleHide}
              />
            ))}
          </svg>

          {/* HTML chip layer — scaled by ResizeObserver, 1000×1000 units */}
          <div
            ref={layerRef}
            style={{ position: 'absolute', left: 0, top: 0, width: 1000, height: 1000, transformOrigin: '0 0' }}
          >
            {/* ── Node chips ── */}
            {layout.nodes.map(n => {
              const um = nodeToUM.get(n.id)
              return (
                <div key={n.id}
                  ref={el => { slotN(n.id).wrap = el }}
                  onMouseEnter={um ? e => showTooltip(um, e) : undefined}
                  onMouseLeave={um ? scheduleHide : undefined}
                  style={{
                    position: 'absolute', left: 0, top: 0,
                    width: chipSize(n), height: chipSize(n),
                    opacity: 0, willChange: 'transform, opacity',
                    cursor: um ? 'pointer' : 'default',
                  }}
                >
                  {/* Placeholder */}
                  {!n.isLeaf && n.L < 5 && (
                    <div
                      ref={el => { slotN(n.id).ph = el }}
                      style={{
                        position: 'absolute', inset: 0, borderRadius: '50%',
                        background: PH_FILL, border: `1.5px dashed ${PH_STR}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: PH_TXT, fontWeight: 600, fontSize: n.size * 0.8,
                        fontFamily: 'ui-monospace,"DM Mono",monospace',
                        opacity: 0,
                      }}
                    >
                      ?
                    </div>
                  )}
                  {/* Flag chip */}
                  <div
                    ref={el => { slotN(n.id).flag = el }}
                    style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      backgroundColor: CHIP_BG, boxShadow: CHIP_SHD,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: flagSize(n), lineHeight: 1,
                      opacity: n.isLeaf ? 1 : 0,
                    }}
                  >
                    {n.team.flag}
                  </div>
                  {/* Gloss overlay */}
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none',
                    background: 'radial-gradient(circle at 50% 26%, rgba(255,255,255,0.34), rgba(255,255,255,0) 62%)',
                  }} />
                  {/* Neutral ring */}
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none',
                    border: `1.5px solid ${RING_C}`,
                  }} />
                  {/* Gold winner ring */}
                  <div
                    ref={el => { slotN(n.id).gold = el }}
                    style={{
                      position: 'absolute', inset: -1, borderRadius: '50%', pointerEvents: 'none',
                      border: `2.5px solid ${ACCENT}`,
                      boxShadow: `0 0 13px ${ACCENT}77`,
                      opacity: 0,
                    }}
                  />
                  {/* Pulse ring for upcoming match nodes */}
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
              <div key={tr.id}
                ref={el => { slotW(T, tr.id).wrap = el }}
                style={{
                  position: 'absolute', left: 0, top: 0,
                  width: chipSize(tr.node), height: chipSize(tr.node),
                  opacity: 0, willChange: 'transform, opacity', zIndex: 5,
                }}
              >
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  backgroundColor: CHIP_BG, boxShadow: CHIP_SHD,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: flagSize(tr.node), lineHeight: 1,
                }}>
                  {layout.byId[tr.fromId]?.team.flag ?? '?'}
                </div>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none', background: 'radial-gradient(circle at 50% 26%, rgba(255,255,255,0.34), rgba(255,255,255,0) 62%)' }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none', border: `1.5px solid ${RING_C}` }} />
                <div style={{ position: 'absolute', inset: -1, borderRadius: '50%', pointerEvents: 'none', border: `2.5px solid ${ACCENT}`, boxShadow: `0 0 13px ${ACCENT}77` }} />
              </div>
            ))}

            {/* ── Loser travelers ── */}
            {layout.loserTravelers.map(tr => {
              const fromTeam = layout.byId[tr.fromId]?.team
              return (
                <div key={tr.id}
                  ref={el => { slotW(LT, tr.id).wrap = el }}
                  style={{
                    position: 'absolute', left: 0, top: 0,
                    width: chipSize(tr.node), height: chipSize(tr.node),
                    opacity: 0, willChange: 'transform, opacity', zIndex: 4,
                  }}
                >
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    backgroundColor: CHIP_BG, boxShadow: CHIP_SHD,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: flagSize(tr.node), lineHeight: 1,
                  }}>
                    {fromTeam?.flag ?? '?'}
                  </div>
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none', background: 'radial-gradient(circle at 50% 26%, rgba(255,255,255,0.34), rgba(255,255,255,0) 62%)' }} />
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none', border: `1.5px solid ${RING_C}` }} />
                </div>
              )
            })}

            {/* ── VS labels for upcoming known matchups ── */}
            {layout.upcomingMatches.filter(um => um.bothKnown).map(um => (
              <div key={`vs-${um.id}`}
                ref={el => { VS.current[um.id] = el }}
                style={{
                  position: 'absolute', left: 0, top: 0,
                  transform: 'translate(-50%,-50%)',
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                  color: ACCENT, opacity: 0, pointerEvents: 'none',
                  background: 'rgba(0,0,0,0.45)',
                  padding: '2px 5px', borderRadius: 10,
                  fontFamily: 'ui-monospace,"DM Mono",monospace',
                  zIndex: 3, whiteSpace: 'nowrap',
                }}
              >
                VS
              </div>
            ))}

            {/* ── Champion celebration pulses ── */}
            {[0, 1, 2].map(k => (
              <div key={`p${k}`}
                ref={el => { pulseRefs.current[k] = el }}
                style={{
                  position: 'absolute', left: CX, top: CY,
                  width: 150, height: 150, marginLeft: -75, marginTop: -75,
                  borderRadius: '50%', border: `2px solid ${ACCENT}`,
                  opacity: 0, pointerEvents: 'none',
                  transform: 'translate(-50%,-50%) scale(0.3)',
                }}
              />
            ))}

            {/* ── Champion caption pill ── */}
            <div
              ref={capRef}
              style={{
                position: 'absolute', left: CX, top: CY + 110,
                transform: 'translate(-50%, 0)',
                textAlign: 'center', opacity: 0, pointerEvents: 'none',
                padding: '10px 22px 12px', borderRadius: 18,
                background: 'rgba(8,9,12,0.72)',
                backdropFilter: 'blur(6px)',
                boxShadow: `0 0 0 1px ${ACCENT}33, 0 8px 26px rgba(0,0,0,0.5)`,
                fontFamily: 'ui-sans-serif,-apple-system,"Segoe UI",system-ui,sans-serif',
                whiteSpace: 'nowrap',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 3, filter: `drop-shadow(0 0 10px ${ACCENT}88)` }}>🏆</div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 24, letterSpacing: '0.01em', lineHeight: 1 }}>
                {layout.champion.team.name}
              </div>
              <div style={{ color: ACCENT, fontWeight: 600, fontSize: 11, letterSpacing: '0.34em', marginTop: 6, fontFamily: 'ui-monospace,"DM Mono",monospace' }}>
                WORLD CHAMPIONS 2026
              </div>
            </div>

            {/* ── Replay button ── */}
            <button
              onClick={replay}
              style={{
                position: 'absolute', right: 18, bottom: 16, zIndex: 10,
                padding: '8px 16px', borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(8px)',
                color: 'rgba(255,255,255,0.82)',
                font: '600 12px ui-sans-serif,system-ui,sans-serif',
                letterSpacing: '0.08em', cursor: 'pointer',
              }}
            >
              ↻ REPLAY
            </button>
          </div>
        </div>

        {/* ── Match probability tooltip (rendered outside overflow:hidden) ── */}
        {hoveredMatch && (() => {
          const { um, x, y } = hoveredMatch
          const [probA, probB] = getEloProb(um.teamA, um.teamB)
          const cW = rootRef.current?.clientWidth ?? 600
          const cH = rootRef.current?.clientHeight ?? 600
          const { left, top } = tooltipPos(x, y, cW, cH)
          const venueShort = um.venue ? um.venue.split('(')[0].trim() : ''
          const dateLabel = `${fmtDate(um.date)}${venueShort ? ` · ${venueShort}` : ''}`
          return (
            <div
              onMouseEnter={() => { isOverTooltipRef.current = true; if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current) }}
              onMouseLeave={() => { isOverTooltipRef.current = false; scheduleHide() }}
              style={{
                position: 'absolute', left, top, zIndex: 20,
                width: 244, padding: '14px 18px',
                background: 'rgba(11,18,36,0.95)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(227,194,126,0.3)',
                borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                pointerEvents: 'auto',
              }}
            >
              <p style={{
                textAlign: 'center', fontSize: 9,
                fontFamily: 'ui-monospace,"DM Mono",monospace',
                color: 'rgba(243,237,224,0.52)', letterSpacing: '0.08em',
                marginBottom: 10, textTransform: 'uppercase',
              }}>
                Match Probability
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{um.teamAFlag}</span>
                <span style={{ flex: 1, fontSize: 13, color: '#f3ede0', fontWeight: 600, fontFamily: 'var(--font-dm-sans)' }}>{um.teamA}</span>
                <span style={{ fontSize: 14, color: ACCENT, fontWeight: 700, fontFamily: 'ui-monospace,"DM Mono",monospace' }}>{probA}%</span>
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', marginBottom: 8 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{um.teamBFlag}</span>
                <span style={{ flex: 1, fontSize: 13, color: '#f3ede0', fontWeight: 600, fontFamily: 'var(--font-dm-sans)' }}>{um.teamB}</span>
                <span style={{ fontSize: 14, color: ACCENT, fontWeight: 700, fontFamily: 'ui-monospace,"DM Mono",monospace' }}>{probB}%</span>
              </div>
              <p style={{
                textAlign: 'center', fontSize: 9,
                fontFamily: 'ui-monospace,"DM Mono",monospace',
                color: 'rgba(243,237,224,0.52)',
              }}>
                {dateLabel}
              </p>
            </div>
          )
        })()}

      </div>{/* end wrapRef */}

      {/* Legend */}
      <div className="flex items-center gap-6 flex-wrap justify-center" style={{ opacity: 0.8 }}>
        {[
          { border: `2.5px solid ${ACCENT}`, shadow: `0 0 8px ${ACCENT}66`, label: 'Winner / advancing' },
          { border: `1.5px solid rgba(255,255,255,0.28)`, shadow: 'none', label: 'Eliminated', opacity: 0.35 },
          { border: `1.5px dashed rgba(255,255,255,0.28)`, shadow: 'none', label: 'Match not yet played', opacity: 0.6 },
          { border: `1.5px solid ${ACCENT}`, shadow: `0 0 6px ${ACCENT}55`, label: 'Upcoming known matchup', opacity: 0.7 },
        ].map(({ border, shadow, label, opacity }) => (
          <div key={label} className="flex items-center gap-2">
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              backgroundColor: CHIP_BG, border, boxShadow: shadow,
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
