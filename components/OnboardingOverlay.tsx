'use client'

import { useState, useEffect } from 'react'

export default function OnboardingOverlay() {
  const [visible, setVisible] = useState(false)
  const [slide, setSlide] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem('wc_onboarded')) setVisible(true)
    } catch {/* localStorage blocked in private browsing */}
  }, [])

  function dismiss() {
    try { localStorage.setItem('wc_onboarded', '1') } catch {/* ignore */}
    setVisible(false)
  }

  function nextSlide() {
    if (slide === 1) { dismiss(); return }
    setFading(true)
    setTimeout(() => { setSlide(1); setFading(false) }, 200)
  }

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(11,29,58,0.97)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          maxWidth: 520, width: '100%', padding: '36px 32px',
          background: '#5C3D2E',
          border: '1px solid rgba(201,160,39,0.4)',
          borderRadius: 2,
          opacity: fading ? 0 : 1,
          transition: 'opacity 0.2s ease',
        }}
      >
        {slide === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <p
                className="font-mono-data uppercase tracking-widest"
                style={{ fontSize: 10, color: '#C9A027', marginBottom: 8 }}
              >
                Welcome
              </p>
              <h2 className="font-display text-3xl tracking-widest text-text-primary">
                WORLD CUP 2026 DASHBOARD
              </h2>
            </div>
            <p className="font-body text-base text-text-primary leading-relaxed">
              This dashboard tracks the 2026 World Cup using a statistical model built on{' '}
              <strong style={{ color: '#C9A027' }}>Elo ratings</strong> and{' '}
              <strong style={{ color: '#C9A027' }}>Monte Carlo simulation</strong>.
            </p>
            <p className="font-body text-sm text-text-muted leading-relaxed">
              A personal project for exploring data-driven football analysis. Not affiliated with FIFA or any sportsbook.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
              <button
                onClick={dismiss}
                className="font-mono-data text-xs text-text-muted underline hover:text-text-primary transition-colors"
              >
                Skip intro
              </button>
              <button
                onClick={nextSlide}
                className="font-display text-sm tracking-widest transition-colors"
                style={{ background: '#C9A027', color: '#0B1D3A', padding: '10px 24px' }}
              >
                HOW IT WORKS →
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <p
                className="font-mono-data uppercase tracking-widest"
                style={{ fontSize: 10, color: '#C9A027', marginBottom: 8 }}
              >
                How it works
              </p>
              <h2 className="font-display text-3xl tracking-widest text-text-primary">
                THE MODEL
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <p className="font-mono-data uppercase tracking-widest mb-1" style={{ fontSize: 10, color: '#C9A027' }}>
                  Elo Ratings
                </p>
                <p className="font-body text-sm text-text-muted leading-relaxed">
                  Each team carries an Elo number reflecting historical strength and recent form. Higher Elo = stronger team. A 400-point gap means roughly a 91% win probability.
                </p>
              </div>
              <div>
                <p className="font-mono-data uppercase tracking-widest mb-1" style={{ fontSize: 10, color: '#C9A027' }}>
                  Monte Carlo Simulation
                </p>
                <p className="font-body text-sm text-text-muted leading-relaxed">
                  We simulate the entire tournament 10,000 times. Each match outcome is drawn from Elo-based probabilities. The win % shows how often each team lifts the trophy across all simulations.
                </p>
              </div>
              <div>
                <p className="font-mono-data uppercase tracking-widest mb-1" style={{ fontSize: 10, color: '#C9A027' }}>
                  Consensus %
                </p>
                <p className="font-body text-sm text-text-muted leading-relaxed">
                  An aggregated probability estimate from external prediction sources — useful context for comparing against the model, not its own output.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
              <button
                onClick={dismiss}
                className="font-display text-sm tracking-widest transition-colors"
                style={{ background: '#C9A027', color: '#0B1D3A', padding: '10px 24px' }}
              >
                EXPLORE THE DASHBOARD →
              </button>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
          <div style={{ width: 6, height: 6, borderRadius: 999, background: slide === 0 ? '#C9A027' : 'rgba(201,160,39,0.3)' }} />
          <div style={{ width: 6, height: 6, borderRadius: 999, background: slide === 1 ? '#C9A027' : 'rgba(201,160,39,0.3)' }} />
        </div>
      </div>
    </div>
  )
}
