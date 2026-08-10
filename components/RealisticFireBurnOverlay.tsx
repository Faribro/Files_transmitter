'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  life: number
  maxLife: number
  color: string
}

export default function RealisticFireBurnOverlay({ durationMs = 800 }: { durationMs?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width || 120
    canvas.height = rect.height || 120

    const width = canvas.width
    const height = canvas.height

    const particles: Particle[] = []
    const fireColors = [
      'rgba(255, 230, 0, ',   // Bright yellow core
      'rgba(255, 140, 0, ',   // Intense orange
      'rgba(255, 60, 0, ',    // Fiery red
      'rgba(220, 20, 0, ',    // Deep red
      'rgba(80, 80, 80, ',    // Smoke gray
    ]

    let animId: number
    const startTime = Date.now()

    function createParticle() {
      const maxLife = 20 + Math.random() * 25
      return {
        x: width * 0.15 + Math.random() * (width * 0.7),
        y: height * 0.85 + Math.random() * (height * 0.15),
        vx: (Math.random() - 0.5) * 1.5,
        vy: -(1.5 + Math.random() * 3.5),
        size: 8 + Math.random() * 16,
        alpha: 0.9,
        life: 0,
        maxLife,
        color: fireColors[Math.floor(Math.random() * (fireColors.length - 1))]
      }
    }

    // Pre-populate initial fire particles
    for (let i = 0; i < 35; i++) {
      particles.push(createParticle())
    }

    function render() {
      if (!ctx) return
      const elapsed = Date.now() - startTime
      if (elapsed > durationMs + 200) return

      ctx.clearRect(0, 0, width, height)

      // Add new particles each frame if active
      if (elapsed < durationMs) {
        for (let i = 0; i < 4; i++) {
          particles.push(createParticle())
        }
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life++
        p.x += p.vx
        p.y += p.vy
        p.size *= 0.96
        p.alpha = Math.max(0, 1 - p.life / p.maxLife)

        if (p.life >= p.maxLife || p.size <= 0.5) {
          particles.splice(i, 1)
          continue
        }

        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
        grad.addColorStop(0, `${p.color}${p.alpha})`)
        grad.addColorStop(0.5, `${p.color}${p.alpha * 0.6})`)
        grad.addColorStop(1, `${p.color}0)`)

        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      animId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animId)
    }
  }, [durationMs])

  return (
    <div className="absolute inset-0 z-40 overflow-hidden pointer-events-none rounded-2xl">
      {/* Canvas for realistic fire particles */}
      <canvas ref={canvasRef} className="w-full h-full absolute inset-0 z-10" />

      {/* Burning Ember Gradient Glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-orange-600/60 via-red-500/30 to-amber-400/10 animate-pulse z-0" />
      
      {/* Shockwave Glow Rim */}
      <div className="absolute inset-0 rounded-2xl ring-4 ring-orange-500/80 shadow-[inset_0_0_30px_rgba(249,115,22,0.8)] z-20" />
    </div>
  )
}
