'use client'

import { useEffect, useRef } from 'react'

interface AsciiFireEffectProps {
  onComplete?: () => void
  durationMs?: number
}

export default function AsciiFireEffect({ onComplete, durationMs = 1800 }: AsciiFireEffectProps) {
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const width = 80
    const height = 16
    const firePixels = new Array(width * height).fill(0)
    const ramp = [" ", ".", ":", "░", "▒", "▓", "█"]

    let intervalId: NodeJS.Timeout

    function updateFire() {
      // 1. Generate heat at bottom row
      for (let x = 0; x < width; x++) {
        firePixels[(height - 1) * width + x] = Math.random() > 0.3 ? 6 : 1
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

    intervalId = setInterval(render, 35)

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
    <div className="absolute inset-0 z-50 overflow-hidden rounded-3xl bg-slate-950/90 backdrop-blur-md flex items-center justify-center font-mono text-xs pointer-events-none">
      <div 
        ref={canvasRef}
        className="white-space-pre leading-[0.8] font-bold text-orange-500 text-shadow-glow text-center selection:bg-none"
        style={{
          textShadow: '0 0 12px rgba(255, 69, 0, 0.9), 0 0 24px rgba(255, 140, 0, 0.7)'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-orange-600/20 via-transparent to-slate-950/80 pointer-events-none" />
    </div>
  )
}
