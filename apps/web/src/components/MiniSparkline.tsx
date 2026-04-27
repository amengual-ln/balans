interface MiniSparklineProps {
  data: { precio: number; fecha: string }[]
  height?: number
}

export default function MiniSparkline({
  data,
  height = 36,
}: MiniSparklineProps) {
  const padding = 2
  const h = height - padding * 2

  if (!data || data.length < 2) {
    const flatY = padding + h / 2
    return (
      <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        <line
          x1={padding}
          y1={flatY}
          x2={100 - padding}
          y2={flatY}
          stroke="#22c55e"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  const prices = data.map((d) => d.precio)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1

  const points = data.map((d, i) => ({
    x: padding + (i / (data.length - 1)) * (100 - padding * 2),
    y: padding + (1 - (d.precio - min) / range) * h,
  }))

  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const cpx = (prev.x + curr.x) / 2
    path += ` C ${cpx} ${prev.y} ${cpx} ${curr.y} ${curr.x} ${curr.y}`
  }

  const isUp = prices[prices.length - 1] >= prices[0]
  const color = isUp ? '#22c55e' : '#ef4444'
  const gradientId = `spark-${isUp ? 'up' : 'down'}-${Math.random().toString(36).slice(2, 7)}`

  const fillPath =
    path + ` L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`

  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradientId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
