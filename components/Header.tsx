interface HeaderProps {
  generatedAt: string
}

export default function Header({ generatedAt }: HeaderProps) {
  const [year, month, day] = generatedAt.slice(0, 10).split('-').map(Number)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const formatted = `${months[month - 1]} ${day}, ${year}`

  return (
    <header className="flex items-start justify-between mb-6">
      <div className="border-l-4 border-accent pl-4">
        <h1 className="font-display text-5xl tracking-wider text-ink leading-none">
          WORLD CUP 2026
        </h1>
        <p className="font-display text-2xl tracking-widest text-ink-muted mt-1">
          KONCAT DASHBOARD
        </p>
        <p className="font-mono-data text-xs text-ink-muted mt-2">
          Updated {formatted}
        </p>
      </div>
      <div className="text-right">
        <span className="inline-block bg-accent text-[#F0E8D8] font-display text-sm tracking-widest px-3 py-1">
          KONCAT
        </span>
        <p className="font-mono-data text-xs text-ink-muted mt-1">
          Built by kenni_bo
        </p>
      </div>
    </header>
  )
}
