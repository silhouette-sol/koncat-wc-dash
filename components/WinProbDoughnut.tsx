'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { TeamComparison } from '@/lib/types'
import { getFlag } from '@/lib/flags'

// ── National colors (ensure dark colors are lightened for contrast) ──
const NATIONAL_COLORS: Record<string, string> = {
  France:      '#2138b8',
  England:     '#e23039',
  Spain:       '#c01528',
  Argentina:   '#74b3e0',
  Brazil:      '#00a14b',
  Germany:     '#8a8e96',  // lightened from near-black for contrast
  Netherlands: '#ff7a00',
  Portugal:    '#0a8a44',
  Norway:      '#ef3340',
  Morocco:     '#c1272d',
  USA:         '#3b6bca',
  Japan:       '#bc002d',
  Mexico:      '#006847',
  Colombia:    '#e6b800',  // lightened from #FCD116 for readability
  Uruguay:     '#5eb6e4',
  Belgium:     '#ef3340',
}

const ACCENT = '#e3c27e'
const R = 78
const C = 2 * Math.PI * R   // ≈ 490.09
const THICK = 16
const HOVER_GROW = 11
const GAP = 6
const DUR = 1700             // sweep duration ms

function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c+c).join('') : h, 16)
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`
}

interface WPTeam { name: string; pct: number; color: string; flag: string }

interface WinProbDoughnutProps {
  teams: TeamComparison[]
}

export default function WinProbDoughnut({ teams }: WinProbDoughnutProps) {
  const top10: WPTeam[] = teams
    .filter(t => t.elo_win_prob >= 0.005)
    .sort((a, b) => b.elo_win_prob - a.elo_win_prob)
    .slice(0, 10)
    .map(t => ({
      name: t.name,
      pct: parseFloat((t.elo_win_prob * 100).toFixed(2)),
      color: NATIONAL_COLORS[t.name] ?? ACCENT,
      flag: getFlag(t.name),
    }))

  const [hovered, setHovered] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)

  // SVG segment refs for imperative stroke updates
  const segRefs = useRef<(SVGCircleElement | null)[]>([])
  const pctRefs = useRef<(HTMLElement | null)[]>([])
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])
  const cFlagRef  = useRef<HTMLSpanElement>(null)
  const cNumRef   = useRef<HTMLSpanElement>(null)
  const cNameRef  = useRef<HTMLSpanElement>(null)
  const cLabelRef = useRef<HTMLSpanElement>(null)
  const animRef   = useRef<number | null>(null)
  const startMsRef = useRef<number | null>(null)
  const progressRef = useRef(0)
  const hoveredRef = useRef<number | null>(null)

  const total = top10.reduce((s, t) => s + t.pct, 0)
  const leaderIdx = top10.reduce((li, t, i) => t.pct > top10[li].pct ? i : li, 0)

  const renderFrame = useCallback((p: number, hov: number | null) => {
    let cum = 0
    top10.forEach((t, i) => {
      const frac = t.pct / total
      const segLen = frac * C
      const visLen = Math.max(0, segLen - GAP)
      const startOff = cum + GAP / 2
      const drawn = Math.max(0, Math.min(visLen, p * C - startOff))
      const angle = -90 + (startOff / C) * 360
      const active = hov === null || hov === i
      const started = drawn > 0.4

      const el = segRefs.current[i]
      if (el) {
        el.setAttribute('stroke-dasharray', `${drawn.toFixed(2)} ${C.toFixed(2)}`)
        el.setAttribute('transform', `rotate(${angle.toFixed(3)} 100 100)`)
        el.style.strokeWidth = hov === i ? `${THICK + HOVER_GROW}px` : `${THICK}px`
        el.style.opacity = !started ? '0' : (active ? '1' : '0.22')
        el.style.filter = hov === i ? `drop-shadow(0 0 14px ${hexToRgba(t.color, 0.95)})` : 'none'
      }

      const pctEl = pctRefs.current[i]
      if (pctEl) pctEl.textContent = (t.pct * p).toFixed(1)

      const rowEl = rowRefs.current[i]
      if (rowEl) {
        rowEl.style.background = hov === i ? 'rgba(255,255,255,0.07)' : 'transparent'
        rowEl.style.opacity = (hov === null || hov === i) ? '1' : '0.4'
      }

      cum += segLen
    })

    // Center callout
    const showI = hov !== null ? hov : leaderIdx
    const showT = top10[showI]
    if (!showT) return
    const cp = hov !== null ? 1 : p
    if (cFlagRef.current)  cFlagRef.current.textContent = showT.flag
    if (cNumRef.current)   cNumRef.current.textContent = (showT.pct * cp).toFixed(1)
    if (cNameRef.current)  cNameRef.current.textContent = showT.name
    if (cLabelRef.current) cLabelRef.current.textContent = hov !== null ? 'WIN PROBABILITY' : 'PROJECTED WINNER'
  }, [top10, total, leaderIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load animation — 1700ms easeOutCubic sweep + count-up
  useEffect(() => {
    startMsRef.current = null
    progressRef.current = 0
    setProgress(0)

    const tick = (now: number) => {
      if (startMsRef.current === null) startMsRef.current = now
      const elapsed = Math.min(1, (now - startMsRef.current) / DUR)
      const p = 1 - Math.pow(1 - elapsed, 3)  // easeOutCubic
      progressRef.current = p
      renderFrame(p, hoveredRef.current)
      if (elapsed < 1) {
        animRef.current = requestAnimationFrame(tick)
      } else {
        setProgress(1)
      }
    }
    animRef.current = requestAnimationFrame(tick)
    return () => { if (animRef.current !== null) cancelAnimationFrame(animRef.current) }
  }, [top10.map(t => t.name).join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-render on hover change without restarting animation
  useEffect(() => {
    hoveredRef.current = hovered
    renderFrame(progressRef.current, hovered)
  }, [hovered, renderFrame])

  const handleEnter = (i: number) => setHovered(i)
  const handleLeave = () => setHovered(null)

  return (
    <section style={{
      position: 'relative',
      width: '100%',
      padding: 'clamp(22px, 3.4vw, 42px)',
      borderRadius: 28,
      overflow: 'hidden',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018))',
      backdropFilter: 'blur(22px) saturate(1.25)',
      WebkitBackdropFilter: 'blur(22px) saturate(1.25)',
      border: '1px solid rgba(255,255,255,0.09)',
      boxShadow: '0 40px 120px -45px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.08)',
    }}>
      {/* Shimmer sweep */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(115deg, transparent 42%, rgba(255,255,255,0.05) 50%, transparent 58%)',
        backgroundSize: '250% 100%',
        animation: 'wpc-shimmer 8s linear infinite',
      }} />

      {/* Header */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: ACCENT, boxShadow: `0 0 14px ${ACCENT}`, flexShrink: 0, display: 'inline-block' }} />
        <h2 style={{ margin: 0, fontSize: 'clamp(15px,1.7vw,18px)', letterSpacing: '0.15em', fontWeight: 600, color: '#f3ede0', textTransform: 'uppercase', fontFamily: 'var(--font-bebas), sans-serif' }}>
          Model Win Probability
        </h2>
      </div>
      <p style={{ position: 'relative', margin: '9px 0 0', fontSize: 'clamp(12.5px,1.3vw,14px)', color: 'rgba(243,237,224,0.52)', maxWidth: '62ch', lineHeight: 1.55 }}>
        How likely is each team to win the tournament, based on 100,000{' '}
        simulated tournaments using{' '}
        <a href="https://en.wikipedia.org/wiki/Elo_rating_system" target="_blank" rel="noopener noreferrer"
          style={{ color: ACCENT, textDecoration: 'none', borderBottom: `1px solid rgba(227,194,126,0.45)` }}>
          Elo ratings
        </a>.
      </p>
      <div style={{ position: 'relative', margin: 'clamp(18px,2.4vw,26px) 0 0', height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))' }} />

      {/* Body: donut + legend */}
      <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'clamp(20px,3vw,52px)', marginTop: 'clamp(22px,3vw,34px)' }}>

        {/* Donut */}
        <div style={{ position: 'relative', flex: '0 1 360px', width: 'clamp(220px,42vw,380px)', aspectRatio: '1', minWidth: 200, margin: '0 auto' }}>
          {/* Ambient glow */}
          <div style={{
            position: 'absolute', inset: '14%', borderRadius: '50%',
            background: `radial-gradient(closest-side, rgba(227,194,126,0.20), transparent 70%)`,
            filter: 'blur(22px)',
            animation: 'wpc-breathe 4.6s ease-in-out infinite',
            pointerEvents: 'none',
          }} />

          <svg viewBox="0 0 200 200" style={{ position: 'relative', width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
            {top10.map((t, i) => (
              <circle key={t.name}
                ref={el => { segRefs.current[i] = el }}
                cx={100} cy={100} r={R}
                fill="none" stroke={t.color}
                strokeLinecap="round"
                style={{
                  strokeWidth: `${THICK}px`,
                  transition: 'stroke-width .35s ease, opacity .3s ease, filter .3s ease',
                  cursor: 'pointer',
                  opacity: 0,
                }}
                onMouseEnter={() => handleEnter(i)}
                onMouseLeave={handleLeave}
              />
            ))}
          </svg>

          {/* Center callout */}
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', textAlign: 'center',
            pointerEvents: 'none', gap: 3,
          }}>
            <span ref={cFlagRef} style={{ fontSize: 'clamp(26px,4.4vw,36px)', lineHeight: 1 }}>
              {top10[leaderIdx]?.flag ?? ''}
            </span>
            <div style={{ fontSize: 'clamp(34px,6.2vw,52px)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              <span ref={cNumRef}>0.0</span>
              <small style={{ fontSize: '0.5em', fontWeight: 600, opacity: 0.75, marginLeft: 2 }}>%</small>
            </div>
            <span ref={cNameRef} style={{ fontSize: 'clamp(13px,1.6vw,15px)', color: 'rgba(255,255,255,0.72)', fontWeight: 500 }}>
              {top10[leaderIdx]?.name ?? ''}
            </span>
            <span ref={cLabelRef} style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.13em', color: ACCENT, marginTop: 2 }}>
              PROJECTED WINNER
            </span>
          </div>
        </div>

        {/* Legend */}
        <div style={{ flex: '1 1 360px', minWidth: 240, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 'clamp(3px,0.8vw,7px)' }}>
          {top10.map((t, i) => (
            <div key={t.name}
              ref={el => { rowRefs.current[i] = el }}
              onMouseEnter={() => handleEnter(i)}
              onMouseLeave={handleLeave}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 12, cursor: 'pointer',
                background: 'transparent', opacity: 1,
                transition: 'background .25s ease, opacity .25s ease',
              }}
            >
              <span style={{
                width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
                background: t.color,
                boxShadow: `0 0 8px ${hexToRgba(t.color, 0.75)}`,
                display: 'inline-block',
              }} />
              <span style={{ fontSize: 16, lineHeight: 1 }}>{t.flag}</span>
              <span style={{ flex: 1, fontSize: 'clamp(13px,1.4vw,15px)', color: '#ece6d8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t.name}
              </span>
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 'clamp(13px,1.4vw,15px)', color: '#fff' }}>
                <b ref={el => { pctRefs.current[i] = el }} style={{ fontWeight: 600 }}>0.0</b>
                <span style={{ opacity: 0.55, fontWeight: 500 }}>%</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
