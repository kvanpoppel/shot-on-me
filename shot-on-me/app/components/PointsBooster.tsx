'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Star } from 'lucide-react'

interface PointsBoosterProps {
  points: number
  show: boolean
  onComplete: () => void
}

export default function PointsBooster({ points, show, onComplete }: PointsBoosterProps) {
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)
      setAnimating(true)
      const timer = setTimeout(() => {
        setAnimating(false)
        setTimeout(() => {
          setVisible(false)
          onComplete()
        }, 500)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center">
      <div className={`transition-all duration-500 ${animating ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
        <div className="relative">
          {/* Main Points Display */}
          <div className="bg-gradient-to-br from-yellow-500/95 to-primary-500/95 backdrop-blur-md border-4 border-yellow-400 rounded-3xl p-8 shadow-2xl transform animate-bounce">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Sparkles className="w-12 h-12 text-yellow-300 animate-pulse" />
                <Star className="w-10 h-10 text-yellow-300 animate-spin" style={{ animationDuration: '2s' }} />
                <Sparkles className="w-12 h-12 text-yellow-300 animate-pulse" />
              </div>
              <p className="text-4xl font-black text-black mb-2">+{points}</p>
              <p className="text-xl font-bold text-black/80">Reward Points!</p>
              <p className="text-sm text-black/70 mt-2">Keep earning for cash rewards</p>
            </div>
          </div>

          {/* Floating Stars */}
          {animating && (
            <>
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute top-1/2 left-1/2 text-yellow-400 animate-ping"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-100px)`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '1.5s'
                  }}
                >
                  <Star className="w-6 h-6" />
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

