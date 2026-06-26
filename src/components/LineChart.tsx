import { useId } from 'react'
import type { ProgressPoint } from '@/types'

interface LineChartProps {
  data: ProgressPoint[]
  height?: number
}

/** رسم خطي SVG خفيف بدون مكتبات — يعرض اتجاه القيم. */
export function LineChart({ data, height = 120 }: LineChartProps) {
  const id = useId()
  const width = 320
  const pad = 8
  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2)
    const y = pad + (1 - (d.value - min) / range) * (height - pad * 2)
    return { x, y }
  })

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" preserveAspectRatio="none" role="img" aria-label="رسم تقدّم الوزن">
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#grad-${id})`} />
      <path d={line} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#06070a" stroke="#10b981" strokeWidth="2" />
      ))}
    </svg>
  )
}
