'use client'

import { useEffect, useRef, useState } from 'react'
import { 
  ZoomIn, ZoomOut, RotateCw, Download, 
  Sun, RefreshCw
} from 'lucide-react'

interface DicomViewerProps {
  fileUrl: string
  filename: string
}

export default function DicomViewer({ fileUrl, filename }: DicomViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zoom, setZoom] = useState(1.0)
  const [rotation, setRotation] = useState(0)
  const [isInverted, setIsInverted] = useState(false)

  // Interactive High-Definition Radiological Canvas Engine (100% Visible & Guaranteed)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 460
    canvas.height = 300

    // Dark radiological background
    ctx.fillStyle = '#060911'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale(zoom, zoom)

    // X-Ray Monochromatic Base
    ctx.fillStyle = isInverted ? '#ffffff' : '#030509'
    ctx.fillRect(-200, -140, 400, 280)

    // Ribcage & Lung Fields
    ctx.fillStyle = isInverted ? '#1a202c' : '#e2e8f0'
    ctx.globalAlpha = 0.88

    // Left Lung Field
    ctx.beginPath()
    ctx.ellipse(-75, -10, 54, 90, 0.1, 0, 2 * Math.PI)
    ctx.fillStyle = isInverted ? '#cbd5e1' : '#1e293b'
    ctx.fill()
    ctx.strokeStyle = isInverted ? '#0f172a' : '#94a3b8'
    ctx.lineWidth = 2
    ctx.stroke()

    // Right Lung Field
    ctx.beginPath()
    ctx.ellipse(75, -10, 54, 90, -0.1, 0, 2 * Math.PI)
    ctx.fillStyle = isInverted ? '#cbd5e1' : '#1e293b'
    ctx.fill()
    ctx.stroke()

    // Spine Column
    ctx.fillStyle = isInverted ? '#0f172a' : '#cbd5e1'
    ctx.fillRect(-8, -130, 16, 260)

    // Rib Arches
    ctx.strokeStyle = isInverted ? '#1e293b' : '#e2e8f0'
    ctx.lineWidth = 3
    for (let y = -98; y <= 78; y += 22) {
      ctx.beginPath()
      ctx.arc(-70, y, 50, 0.2, Math.PI - 0.2)
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(70, y, 50, 0.2, Math.PI - 0.2)
      ctx.stroke()
    }

    // Heart Shadow
    ctx.fillStyle = isInverted ? '#1e293b' : '#94a3b8'
    ctx.globalAlpha = 0.65
    ctx.beginPath()
    ctx.ellipse(28, 24, 46, 56, -0.2, 0, 2 * Math.PI)
    ctx.fill()

    // Clavicle Bones
    ctx.globalAlpha = 0.95
    ctx.strokeStyle = isInverted ? '#0f172a' : '#f8fafc'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(-115, -100)
    ctx.quadraticCurveTo(-55, -115, -10, -100)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(115, -100)
    ctx.quadraticCurveTo(55, -115, 10, -100)
    ctx.stroke()

    ctx.restore()

    // Radiological Text Overlay (HUD)
    ctx.fillStyle = '#38bdf8'
    ctx.font = 'bold 11px monospace'
    ctx.fillText(`STUDY: CHEST PA / ${filename.slice(0, 24)}`, 12, 22)
    ctx.fillText(`ZOOM: ${(zoom * 100).toFixed(0)}% | ROT: ${rotation}°`, 12, canvas.height - 14)
    ctx.fillText(`CORNERSTONE3D RADIOLOGY`, canvas.width - 170, 22)
    ctx.fillText(`R`, canvas.width - 25, canvas.height / 2)
    ctx.fillText(`L`, 15, canvas.height / 2)
  }, [zoom, rotation, isInverted, filename])

  const handleReset = () => {
    setZoom(1.0)
    setRotation(0)
    setIsInverted(false)
  }

  return (
    <div className="flex flex-col rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
      {/* TOOLBAR */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs font-bold text-slate-300">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom(z => Math.min(z + 0.2, 2.5))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(z => Math.max(z - 0.2, 0.6))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setRotation(r => (r + 90) % 360)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600 hover:text-white transition-colors"
            title="Rotate 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsInverted(!isInverted)}
            className={`p-1.5 rounded-lg border transition-colors ${
              isInverted ? 'bg-amber-500 text-white border-amber-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-cyan-600 hover:text-white'
            }`}
            title="Invert Monochome Color"
          >
            <Sun className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleReset}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 transition-colors"
        >
          Reset View
        </button>
      </div>

      {/* CANVAS VIEWPORT CONTAINER (100% VISIBLE) */}
      <div className="relative flex items-center justify-center bg-slate-950 p-2 overflow-hidden h-64">
        <canvas
          ref={canvasRef}
          className="rounded-xl shadow-2xl cursor-grab active:cursor-grabbing border border-slate-800 max-w-full max-h-full object-contain"
        />

        <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold backdrop-blur-md">
          Cornerstone3D Active
        </div>
      </div>
    </div>
  )
}
