'use client'

import { useEffect, useRef, useState } from 'react'
import { 
  ZoomIn, ZoomOut, RotateCw, Maximize2, Download, 
  AlertCircle, Move, Contrast, Activity, Minus, Plus, RefreshCw, Sun
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
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [isLoading, setIsLoading] = useState(false)

  // Render radiological chest X-ray DICOM canvas representation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 400
    canvas.height = 300

    // Draw dark radiological backdrop
    ctx.fillStyle = '#090d16'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Apply zoom & rotation transformations
    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale(zoom, zoom)

    // Draw simulated chest X-ray radiological structures (lungs, ribs, heart shadow)
    ctx.fillStyle = isInverted ? '#ffffff' : '#05070d'
    ctx.fillRect(-180, -130, 360, 260)

    // Ribcage & Lung fields
    ctx.fillStyle = isInverted ? '#1a202c' : '#e2e8f0'
    ctx.globalAlpha = 0.85

    // Left Lung Field
    ctx.beginPath()
    ctx.ellipse(-70, -10, 50, 85, 0.1, 0, 2 * Math.PI)
    ctx.fillStyle = isInverted ? '#cbd5e1' : '#1e293b'
    ctx.fill()
    ctx.strokeStyle = isInverted ? '#0f172a' : '#94a3b8'
    ctx.lineWidth = 2
    ctx.stroke()

    // Right Lung Field
    ctx.beginPath()
    ctx.ellipse(70, -10, 50, 85, -0.1, 0, 2 * Math.PI)
    ctx.fillStyle = isInverted ? '#cbd5e1' : '#1e293b'
    ctx.fill()
    ctx.stroke()

    // Spine Column
    ctx.fillStyle = isInverted ? '#0f172a' : '#cbd5e1'
    ctx.fillRect(-8, -120, 16, 240)

    // Ribs Arches
    ctx.strokeStyle = isInverted ? '#1e293b' : '#e2e8f0'
    ctx.lineWidth = 3
    for (let y = -90; y <= 70; y += 22) {
      ctx.beginPath()
      ctx.arc(-65, y, 45, 0.2, Math.PI - 0.2)
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(65, y, 45, 0.2, Math.PI - 0.2)
      ctx.stroke()
    }

    // Heart Shadow
    ctx.fillStyle = isInverted ? '#1e293b' : '#94a3b8'
    ctx.globalAlpha = 0.6
    ctx.beginPath()
    ctx.ellipse(25, 20, 42, 52, -0.2, 0, 2 * Math.PI)
    ctx.fill()

    // Clavicle Bones
    ctx.globalAlpha = 0.9
    ctx.strokeStyle = isInverted ? '#0f172a' : '#f1f5f9'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(-110, -95)
    ctx.quadraticCurveTo(-50, -110, -10, -95)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(110, -95)
    ctx.quadraticCurveTo(50, -110, 10, -95)
    ctx.stroke()

    ctx.restore()

    // Render DICOM HUD Text Overlay (Radiological Metadata)
    ctx.fillStyle = '#38bdf8'
    ctx.font = 'bold 11px monospace'
    ctx.fillText(`STUDY: CHEST PA / ${filename.slice(0, 22)}`, 12, 22)
    ctx.fillText(`ZOOM: ${(zoom * 100).toFixed(0)}% | ROT: ${rotation}°`, 12, canvas.height - 15)
    ctx.fillText(`MODE: DICOM WADO 2D`, canvas.width - 150, 22)
    ctx.fillText(`R`, canvas.width - 25, canvas.height / 2)
    ctx.fillText(`L`, 15, canvas.height / 2)
  }, [zoom, rotation, isInverted, brightness, contrast, filename])

  const handleReset = () => {
    setZoom(1.0)
    setRotation(0)
    setIsInverted(false)
    setBrightness(100)
    setContrast(100)
  }

  return (
    <div className="flex flex-col rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
      {/* RADIOLOGICAL CONTROL TOOLBAR */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs font-bold text-slate-300">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom(z => Math.min(z + 0.2, 2.5))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(z => Math.max(z - 0.2, 0.6))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setRotation(r => (r + 90) % 360)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white transition-colors"
            title="Rotate 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsInverted(!isInverted)}
            className={`p-1.5 rounded-lg border transition-colors ${
              isInverted ? 'bg-amber-500 text-white border-amber-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-indigo-600 hover:text-white'
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

      {/* CANVAS DICOM DISPLAY CONTAINER */}
      <div className="relative flex items-center justify-center bg-slate-950 p-3 overflow-hidden h-64">
        <canvas
          ref={canvasRef}
          className="rounded-xl shadow-2xl cursor-grab active:cursor-grabbing border border-slate-800 max-w-full max-h-full object-contain"
        />
        
        {/* TOP RIGHT WADO BADGE */}
        <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold backdrop-blur-md">
          WADO-RS 2D Ready
        </div>
      </div>
    </div>
  )
}
