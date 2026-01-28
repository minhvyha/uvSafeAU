'use client'

import { useEffect, useState } from 'react'

interface UVGaugeProps {
  value: number
  className?: string
}

export function UVGauge({ value, className = '' }: UVGaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value)
    }, 100)
    return () => clearTimeout(timer)
  }, [value])

  // Calculate the rotation angle (0-180 degrees for half circle)
  const maxValue = 11
  const percentage = Math.min(value / maxValue, 1)
  const rotation = percentage * 180

  // Get UV level description and color
  const getUVLevel = (uv: number) => {
    if (uv <= 2) return { level: 'Low', color: '#10b981' }
    if (uv <= 5) return { level: 'Moderate', color: '#f59e0b' }
    if (uv <= 7) return { level: 'High', color: '#ef4444' }
    if (uv <= 10) return { level: 'Very High', color: '#dc2626' }
    return { level: 'Extreme', color: '#7c2d12' }
  }

  const { level, color } = getUVLevel(value)

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      <div className="relative w-64 h-32">
        {/* Background arc */}
        <svg className="w-full h-full" viewBox="0 0 200 100">
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="33%" stopColor="#f59e0b" />
              <stop offset="66%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#7c2d12" />
            </linearGradient>
          </defs>

          {/* Background track */}
          <path
            d="M 20 95 A 80 80 0 0 1 180 95"
            fill="none"
            stroke="oklch(0.90 0.01 245)"
            strokeWidth="20"
            strokeLinecap="round"
          />

          {/* Colored progress arc */}
          <path
            d="M 20 95 A 80 80 0 0 1 180 95"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="20"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 251} 251`}
            style={{
              transition: 'stroke-dasharray 1s ease-out',
            }}
          />

          {/* Tick marks */}
          {[0, 2, 4, 6, 8, 10, 11].map((tick) => {
            const tickAngle = (tick / maxValue) * 180
            const tickRad = ((tickAngle - 90) * Math.PI) / 180
            const innerRadius = 70
            const outerRadius = 85
            const x1 = 100 + innerRadius * Math.cos(tickRad)
            const y1 = 95 + innerRadius * Math.sin(tickRad)
            const x2 = 100 + outerRadius * Math.cos(tickRad)
            const y2 = 95 + outerRadius * Math.sin(tickRad)

            return (
              <line
                key={tick}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="oklch(0.28 0.06 245)"
                strokeWidth="2"
              />
            )
          })}

          {/* Needle */}
          <g
            style={{
              transform: `rotate(${rotation - 90}deg)`,
              transformOrigin: '100px 95px',
              transition: 'transform 1s ease-out',
            }}
          >
            <line
              x1="100"
              y1="95"
              x2="100"
              y2="25"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="100" cy="95" r="6" fill={color} />
          </g>

          {/* Center dot */}
          <circle cx="100" cy="95" r="8" fill="oklch(1 0 0)" />
          <circle cx="100" cy="95" r="4" fill="oklch(0.28 0.06 245)" />
        </svg>

        {/* Labels */}
        <div className="absolute bottom-0 left-0 text-xs font-medium text-muted-foreground">
          0
        </div>
        <div className="absolute bottom-0 right-0 text-xs font-medium text-muted-foreground">
          11+
        </div>
      </div>

      {/* Center value display */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 text-center">
        <div className="text-5xl font-bold text-primary tabular-nums">
          {animatedValue.toFixed(1)}
        </div>
        <div className="text-sm font-semibold uppercase tracking-wider mt-1" style={{ color }}>
          {level}
        </div>
      </div>
    </div>
  )
}
