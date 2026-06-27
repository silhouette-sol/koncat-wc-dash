interface DivergenceBarProps {
  delta: number | null
  maxDelta?: number
}

export default function DivergenceBar({ delta, maxDelta = 0.15 }: DivergenceBarProps) {
  if (delta === null) {
    return (
      <div className="flex flex-col items-center gap-1 w-full">
        <div className="relative w-full h-4 flex items-center">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
          <div className="w-full h-1 bg-border/30 rounded-none" />
        </div>
        <span className="font-mono-data text-[10px] text-text-muted">no data</span>
      </div>
    )
  }

  const pct = Math.min(Math.abs(delta) / maxDelta, 1) * 50
  const isModelFavors = delta > 0

  return (
    <div className="flex flex-col items-center gap-1 w-full">
      <div className="relative w-full h-4 flex items-center">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-text-muted z-10" />
        {isModelFavors ? (
          <div
            className="absolute h-2 bg-teal"
            style={{ left: '50%', width: `${pct}%` }}
          />
        ) : (
          <div
            className="absolute h-2 bg-coral"
            style={{ right: '50%', width: `${pct}%` }}
          />
        )}
      </div>
      <span
        className="font-mono-data text-[10px]"
        style={{ color: isModelFavors ? '#1D9E75' : '#D85A30' }}
      >
        {isModelFavors ? '+' : ''}
        {(delta * 100).toFixed(1)}%
      </span>
    </div>
  )
}
