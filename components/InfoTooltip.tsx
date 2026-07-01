'use client'

import { useState, useRef, useEffect } from 'react'

interface InfoTooltipProps {
  term: string
  definition: string
  link?: string
}

export default function InfoTooltip({ term, definition, link }: InfoTooltipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <span ref={ref} className="relative inline-block ml-0.5 align-middle" style={{ lineHeight: 0 }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="font-mono-data leading-none rounded-full inline-flex items-center justify-center transition-colors"
        style={{
          fontSize: 9, width: 14, height: 14,
          color: '#e3c27e', border: '1px solid rgba(227,194,126,0.5)',
          verticalAlign: 'middle', flexShrink: 0,
        }}
        aria-label={`What is ${term}?`}
      >
        i
      </button>
      {open && (
        <span
          className="absolute z-50 bottom-full left-1/2 mb-2 rounded-sm shadow-xl block"
          style={{
            transform: 'translateX(-50%)',
            background: 'rgba(7,9,14,0.9)',
            border: '1px solid rgba(227,194,126,0.4)',
            width: 220,
            padding: '10px 12px',
            whiteSpace: 'normal',
            lineHeight: 'normal',
          }}
        >
          <span
            className="font-mono-data uppercase tracking-widest block mb-1"
            style={{ fontSize: 9, color: '#e3c27e' }}
          >
            {term}
          </span>
          <span className="font-body text-xs text-text-muted leading-relaxed block">
            {definition}
          </span>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono-data underline mt-1.5 block hover:text-text-primary transition-colors"
              style={{ fontSize: 10, color: '#e3c27e' }}
            >
              Learn more ↗
            </a>
          )}
        </span>
      )}
    </span>
  )
}
