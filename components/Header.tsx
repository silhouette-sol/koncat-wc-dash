interface HeaderProps {
  generatedAt: string
}

export default function Header({ generatedAt }: HeaderProps) {
  const [year, month, day] = generatedAt.slice(0, 10).split('-').map(Number)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const formatted = `${months[month - 1]} ${day}, ${year}`

  return (
    <header className="flex items-start justify-between mb-6">
      <div className="border-l-4 pl-4" style={{ borderColor: '#e3c27e' }}>
        <h1 className="font-display text-5xl tracking-wider leading-none" style={{ color: '#e3c27e' }}>
          WORLD CUP 2026
        </h1>
        <p className="font-display text-2xl tracking-widest mt-1" style={{ color: 'rgba(243,237,224,0.52)' }}>
          KONCAT DASHBOARD
        </p>
        <p className="font-mono-data text-xs mt-2" style={{ color: 'rgba(243,237,224,0.52)' }}>
          Updated {formatted}{' '}
          <span style={{ color: '#e3c27e' }}>· Check back daily for updated probabilities</span>
        </p>
      </div>
      <div className="text-right">
        <span
          className="inline-block font-display text-sm tracking-widest px-3 py-1"
          style={{ background: '#e3c27e', color: '#07090e' }}
        >
          KONCAT
        </span>
        <p className="font-mono-data text-xs mt-1" style={{ color: 'rgba(243,237,224,0.52)' }}>
          Built by kenni_bo
        </p>
      </div>
    </header>
  )
}
