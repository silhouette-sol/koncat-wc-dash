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

  const ACCENT = '#e3c27e'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(7,9,14,0.95)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        maxWidth: 520, width: '100%', padding: '36px 32px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))',
        backdropFilter: 'blur(22px) saturate(1.25)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 40px 120px -45px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.08)',
        borderRadius: 20,
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.2s ease',
      }}>
        {slide === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <p className="font-mono-data uppercase tracking-widest" style={{ fontSize: 10, color: ACCENT, marginBottom: 8 }}>
                Welcome
              </p>
              <h2 className="font-display text-3xl tracking-widest" style={{ color: '#f3ede0' }}>
                WORLD CUP 2026 DASHBOARD
              </h2>
            </div>
            <p className="font-body text-base leading-relaxed" style={{ color: '#f3ede0' }}>
              This dashboard tracks the 2026 World Cup using a statistical model built on{' '}
              <strong style={{ color: ACCENT }}>Elo ratings</strong> and{' '}
              <strong style={{ color: ACCENT }}>Monte Carlo simulation</strong>.
            </p>
            <p className="font-body text-sm leading-relaxed" style={{ color: 'rgba(243,237,224,0.52)' }}>
              A personal project for exploring data-driven football analysis. Not affiliated with FIFA or any sportsbook.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
              <button onClick={dismiss} className="font-mono-data text-xs underline transition-colors" style={{ color: 'rgba(243,237,224,0.52)' }}>
                Skip intro
              </button>
              <button onClick={nextSlide} className="font-display text-sm tracking-widest transition-colors" style={{ background: ACCENT, color: '#07090e', padding: '10px 24px', borderRadius: 8 }}>
                HOW IT WORKS →
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <p className="font-mono-data uppercase tracking-widest" style={{ fontSize: 10, color: ACCENT, marginBottom: 8 }}>
                How it works
              </p>
              <h2 className="font-display text-3xl tracking-widest" style={{ color: '#f3ede0' }}>
                THE MODEL
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Elo Ratings', text: 'Each team carries an Elo number reflecting historical strength and recent form. Higher Elo = stronger team. A 400-point gap means roughly a 91% win probability.' },
                { label: 'Monte Carlo Simulation', text: 'We simulate the entire tournament 100,000 times. Each match outcome is drawn from Elo-based probabilities. The win % shows how often each team lifts the trophy across all simulations.' },
                { label: 'Consensus %', text: 'An aggregated probability estimate from external prediction sources — useful context for comparing against the model, not its own output.' },
              ].map(({ label, text }) => (
                <div key={label}>
                  <p className="font-mono-data uppercase tracking-widest mb-1" style={{ fontSize: 10, color: ACCENT }}>{label}</p>
                  <p className="font-body text-sm leading-relaxed" style={{ color: 'rgba(243,237,224,0.52)' }}>{text}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
              <button onClick={dismiss} className="font-display text-sm tracking-widest transition-colors" style={{ background: ACCENT, color: '#07090e', padding: '10px 24px', borderRadius: 8 }}>
                EXPLORE THE DASHBOARD →
              </button>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
          {[0, 1].map(i => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: 999, background: slide === i ? ACCENT : `rgba(227,194,126,0.25)` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
