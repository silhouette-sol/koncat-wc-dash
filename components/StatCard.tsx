interface StatCardProps {
  label: string
  value: string | number
  sub?: string
}

export default function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="bg-card border border-border/9 rounded-sm p-4 flex flex-col gap-1">
      <p className="font-mono-data text-xs uppercase tracking-widest" style={{ color: 'rgba(243,237,224,0.52)' }}>
        {label}
      </p>
      <p className="font-display text-4xl tracking-wide leading-none" style={{ color: '#e3c27e' }}>
        {value}
      </p>
      {sub && (
        <p className="font-mono-data text-xs" style={{ color: 'rgba(243,237,224,0.52)' }}>{sub}</p>
      )}
    </div>
  )
}
