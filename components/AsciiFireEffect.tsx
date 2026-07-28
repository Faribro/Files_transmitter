'use client'

import { useEffect, useRef } from 'react'

interface AsciiFireEffectProps {
  onComplete?: () => void
  durationMs?: number
}

export default function AsciiFireEffect({ onComplete, durationMs = 1800 }: AsciiFireEffectProps) {
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const width = 90
    const height = 24 // Increased flame height to reach high up cards
    const firePixels = new Array(width * height).fill(0)
    const ramp = [" ", ".", ":", "░", "▒", "▓", "█"]

    let intervalId: NodeJS.Timeout

    function updateFire() {
      // 1. Generate heat at bottom row (Paper burning from bottom upwards)
      for (let x = 0; x < width; x++) {
        firePixels[(height - 1) * width + x] = Math.random() > 0.25 ? 6 : 1
      }

      // 2. Propagate heat upwards with wind decay
      for (let y = 0; y < height - 1; y++) {
        for (let x = 0; x < width; x++) {
          const srcIdx = (y + 1) * width + x
          const decay = Math.floor(Math.random() * 2)
          const wind = Math.floor(Math.random() * 3) - 1
          let dstX = x + wind
          if (dstX < 0) dstX = 0
          if (dstX >= width) dstX = width - 1

          const dstIdx = y * width + dstX
          const newValue = firePixels[srcIdx] - decay
          firePixels[dstIdx] = newValue > 0 ? newValue : 0
        }
      }
    }

    function render() {
      updateFire()
      let output = ""
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const val = firePixels[y * width + x]
          output += ramp[val] || " "
        }
        output += "\n"
      }
      if (canvasRef.current) {
        canvasRef.current.textContent = output
      }
    }

    intervalId = setInterval(render, 30)

    const timer = setTimeout(() => {
      clearInterval(intervalId)
      if (onComplete) onComplete()
    }, durationMs)

    return () => {
      clearInterval(intervalId)
      clearTimeout(timer)
    }
  }, [durationMs, onComplete])

  return (
    <div className="absolute inset-0 z-50 overflow-hidden bg-transparent flex flex-col justify-end pointer-events-none">
      {/* Real-time Paper Burning Flame Glow from Bottom */}
      <div 
        ref={canvasRef}
        className="white-space-pre leading-[0.75] font-bold text-orange-500 text-center selection:bg-none transform translate-y-2 drop-shadow-[0_0_25px_rgba(255,100,0,0.95)]"
        style={{
          textShadow: '0 0 15px rgba(255, 69, 0, 0.95), 0 0 30px rgba(255, 140, 0, 0.8), 0 0 45px rgba(255, 200, 0, 0.6)'
        }}
      />
      {/* Burning Ember Shadow & Heat Gradient */}
      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-orange-600/40 via-amber-500/20 to-transparent pointer-events-none" />
    </div>
  )
}
