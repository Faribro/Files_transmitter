'use client'

import { useEffect, useRef } from 'react'

interface AsciiFireEffectProps {
  onComplete?: () => void
  durationMs?: number
}

export default function AsciiFireEffect({ onComplete, durationMs = 2500 }: AsciiFireEffectProps) {
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const width = 60
    const height = 18
    const firePixels = new Array(width * height).fill(0)
    const ramp = [" ", ".", ":", "░", "▒", "▓", "█"]

    let animationFrameId: number
    let intervalId: NodeJS.Timeout

    function updateFire() {
      // 1. Generate heat at bottom row
      for (let x = 0; x < width; x++) {
        firePixels[(height - 1) * width + x] = Math.random() > 0.35 ? 6 : 1
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

    intervalId = setInterval(render, 40)

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
    <div className="relative w-full overflow-hidden rounded-3xl bg-slate-950 p-4 border border-orange-500/30 shadow-2xl shadow-orange-500/20 font-mono text-xs">
      <div 
        ref={canvasRef}
        className="white-space-pre leading-[0.8] font-bold text-orange-500 text-shadow-glow text-center selection:bg-none"
        style={{
          textShadow: '0 0 10px rgba(255, 69, 0, 0.8), 0 0 20px rgba(255, 140, 0, 0.5)'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/80 pointer-events-none" />
      <p className="text-center text-[10px] font-extrabold uppercase tracking-widest text-orange-400 mt-2 animate-pulse">
        🔥 Dissolving Top Banner & Opening Month Directory...
      </p>
    </div>
  )
}
