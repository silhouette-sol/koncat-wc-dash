interface HeaderProps {
  generatedAt: string
}

export default function Header({ generatedAt }: HeaderProps) {
  const [year, month, day] = generatedAt.slice(0, 10).split('-').map(Number)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const formatted = `${months[month - 1]} ${day}, ${year}`

  return (
    <header className="flex items-start justify-between mb-6">
      <div className="border-l-4 pl-4" style={{ borderColor: '#C9A027' }}>
        <h1 className="font-display text-5xl tracking-wider leading-none" style={{ color: '#C9A027' }}>
          WORLD CUP 2026
        </h1>
        <p className="font-display text-2xl tracking-widest text-text-muted mt-1">
          KONCAT DASHBOARD
        </p>
        <p className="font-mono-data text-xs text-text-muted mt-2">
          Updated {formatted} <span style={{ color: '#C9A027' }}>· Check back daily for updated probabilities</span>
        </p>
      </div>
      <div className="text-right">
        <span
          className="inline-block font-display text-sm tracking-widest px-3 py-1"
          style={{ background: '#C9A027', color: '#0B1D3A' }}
        >
          KONCAT
        </span>
        <p className="font-mono-data text-xs text-text-muted mt-1">
          Built by ken b
        </p>
      </div>
    </header>
  )
}
