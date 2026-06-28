interface StatCardProps {
  label: string
  value: string | number
  sub?: string
}

export default function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="bg-card border border-border/30 rounded-sm p-4 flex flex-col gap-1">
      <p className="font-mono-data text-xs text-text-muted uppercase tracking-widest">
        {label}
      </p>
      <p className="font-display text-4xl tracking-wide leading-none" style={{ color: '#C9A027' }}>
        {value}
      </p>
      {sub && (
        <p className="font-mono-data text-xs text-text-muted">{sub}</p>
      )}
    </div>
  )
}
