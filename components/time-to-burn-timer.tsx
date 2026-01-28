'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Clock } from 'lucide-react'

interface TimeProps {
  minutes: number
  skinType: number
  isApiData?: boolean
}

export function TimeToBurnTimer({ minutes, skinType, isApiData = false }: TimeProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(minutes * 60)
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    setSecondsRemaining(minutes * 60)
    setIsActive(true)
  }, [minutes])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isActive && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((seconds) => {
          if (seconds <= 1) {
            setIsActive(false)
            return 0
          }
          return seconds - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, secondsRemaining])

  const displayMinutes = Math.floor(secondsRemaining / 60)
  const displaySeconds = secondsRemaining % 60

  // Get warning level
  const getWarningLevel = () => {
    const percentRemaining = secondsRemaining / (minutes * 60)
    if (percentRemaining > 0.5) return 'safe'
    if (percentRemaining > 0.25) return 'warning'
    return 'danger'
  }

  const warningLevel = getWarningLevel()
  const warningColors = {
    safe: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
  }

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/90 text-primary-foreground p-6">
      {/* Animated background effect */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-semibold text-primary-foreground">Time to Burn</h3>
        </div>

        <div className="flex items-baseline justify-center gap-2 mb-2">
          <span className={`text-6xl md:text-7xl font-bold tabular-nums ${warningLevel === 'safe' ? 'text-primary-foreground' : warningColors[warningLevel]}`}>
            {displayMinutes.toString().padStart(2, '0')}
          </span>
          <span className={`text-4xl md:text-5xl font-bold ${warningLevel === 'safe' ? 'text-primary-foreground/80' : warningColors[warningLevel]}`}>
            :
          </span>
          <span className={`text-6xl md:text-7xl font-bold tabular-nums ${warningLevel === 'safe' ? 'text-primary-foreground' : warningColors[warningLevel]}`}>
            {displaySeconds.toString().padStart(2, '0')}
          </span>
        </div>

        <div className="text-center text-sm text-primary-foreground/80">
          Based on Skin Type {skinType}
          {isApiData && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent text-accent-foreground">
              Live API Data
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 bg-primary-foreground/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-1000 ease-linear rounded-full"
            style={{
              width: `${(secondsRemaining / (minutes * 60)) * 100}%`,
            }}
          />
        </div>

        {warningLevel !== 'safe' && (
          <div className="mt-3 text-center text-sm font-medium text-accent">
            {warningLevel === 'warning' ? '⚠️ Halfway to burn time' : '🚨 Seek shade now!'}
          </div>
        )}
      </div>
    </Card>
  )
}
