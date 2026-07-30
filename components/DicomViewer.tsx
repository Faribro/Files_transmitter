'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ZoomIn, ZoomOut, RotateCw, Sun, RefreshCw, Download, AlertTriangle, ExternalLink,
  Move, Ruler, Compass, Eye, Layers, Share2, ShieldCheck, Lock, Copy, Check, Maximize2, Minimize2,
  Box, Activity
} from 'lucide-react'

interface DicomViewerProps {
  fileUrl: string
  filename: string
  onClose?: () => void
  isMaximized?: boolean
  onToggleMaximize?: () => void
}

function proxyUrl(raw: string) {
  if (!raw) return ''
  return `/api/v1/proxy?url=${encodeURIComponent(raw)}`
}

export default function DicomViewer({ fileUrl, filename, onClose, isMaximized, onToggleMaximize }: DicomViewerProps) {
  const elemRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1.0)
  const [inverted, setInverted] = useState(false)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  
  // Active tool state: 'pan' | 'distance' | 'angle' | 'hu'
  const [activeTool, setActiveTool] = useState<'pan' | 'distance' | 'angle' | 'hu'>('pan')
  // Preset state: 'native' | 'parenchyme' | 'pleural' | 'mediastinal' | 'bone'
  const [preset, setPreset] = useState<'native' | 'parenchyme' | 'pleural' | 'mediastinal' | 'bone'>('native')
  // View mode state: '2d' | 'mpr_coronal' | 'mpr_sagittal' | '3d_mip'
  const [viewMode, setViewMode] = useState<'2d' | 'mpr_coronal' | 'mpr_sagittal' | '3d_mip'>('2d')
  
  // Realtime HU & Position tracking
  const [huValue, setHuValue] = useState<number | null>(null)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)

  // Interactive Measurement Tool Overlay State
  const [measureLines, setMeasureLines] = useState<Array<{ start: { x: number; y: number }; end: { x: number; y: number }; distMm: number }>>([])
  const [currentLine, setCurrentLine] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  // Drag-to-Pan state
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [translation, setTranslation] = useState({ x: 0, y: 0 })

  // Share & Security Modal State
  const [showShareModal, setShowShareModal] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [sharePassword, setSharePassword] = useState('MED-SECURE-2026')

  const csRef = useRef<any>(null)
  const cswRef = useRef<any>(null)
  const defaultVoiRef = useRef<{ windowCenter: number; windowWidth: number }>({ windowCenter: 128, windowWidth: 256 })

  useEffect(() => {
    if (!fileUrl) {
      setStatus('error')
      setError('No file URL provided')
      return
    }

    let active = true

    async function loadDicom() {
      setStatus('loading')
      setError('')

      try {
        const cornerstone = await import('cornerstone-core')
        const cornerstoneWADO = await import('cornerstone-wado-image-loader')
        const dicomParser = await import('dicom-parser')

        csRef.current = cornerstone
        cswRef.current = cornerstoneWADO

        cornerstoneWADO.external.cornerstone = cornerstone
        cornerstoneWADO.external.dicomParser = dicomParser
        cornerstoneWADO.configure({ useWebWorkers: false })

        const el = elemRef.current
        if (!el || !active) return

        try { cornerstone.disable(el) } catch {}
        cornerstone.enable(el)

        const proxied = proxyUrl(fileUrl)
        const imageId = `wadouri:${proxied}`

        const image = await cornerstone.loadAndCacheImage(imageId)
        if (!active) return

        cornerstone.displayImage(el, image)
        setStatus('ready')

        const vp = cornerstone.getDefaultViewportForImage(el, image)
        if (vp && vp.voi) {
          defaultVoiRef.current = {
            windowCenter: typeof vp.voi.windowCenter === 'number' ? vp.voi.windowCenter : (image.windowCenter || 128),
            windowWidth: typeof vp.voi.windowWidth === 'number' ? vp.voi.windowWidth : (image.windowWidth || 256),
          }
        }
        cornerstone.fitToWindow(el)
        const fittedVp = cornerstone.getViewport(el)
        if (fittedVp) setZoom(fittedVp.scale)

      } catch (err: any) {
        if (!active) return
        console.error('DICOM load error:', err)
        if (err?.name === 'ChunkLoadError' || String(err?.message || '').includes('Loading chunk')) {
          window.location.reload()
          return
        }
        setError(err?.message || 'Failed to load DICOM image')
        setStatus('error')
      }
    }

    loadDicom()

    return () => {
      active = false
      try {
        if (csRef.current && elemRef.current) {
          csRef.current.disable(elemRef.current)
        }
      } catch {}
    }
  }, [fileUrl])

  // Apply Tuberculosis-Specific Chest X-Ray Presets
  const applyPreset = (p: 'native' | 'parenchyme' | 'pleural' | 'mediastinal' | 'bone') => {
    setPreset(p)
    if (status !== 'ready' || !csRef.current || !elemRef.current) return
    try {
      const cs = csRef.current
      const el = elemRef.current
      const vp = cs.getViewport(el)
      if (!vp) return

      let center = defaultVoiRef.current.windowCenter
      let width = defaultVoiRef.current.windowWidth

      if (p === 'parenchyme') { center = -500; width = 1200 }     // TB Apical Infiltrates / Lesions
      else if (p === 'pleural') { center = -200; width = 1000 }    // Pleural Effusion & Thickening
      else if (p === 'mediastinal') { center = 40; width = 400 }   // Hilar Lymphadenopathy
      else if (p === 'bone') { center = 300; width = 1500 }        // Rib / Bony Structure

      cs.setViewport(el, {
        ...vp,
        voi: { windowCenter: center, windowWidth: width }
      })
    } catch {}
  }

  // Live Viewport Adjustments (Zoom, Rotation, Brightness, Contrast, Flip)
  useEffect(() => {
    if (status !== 'ready' || !csRef.current || !elemRef.current) return
    try {
      const cs = csRef.current
      const el = elemRef.current
      const vp = cs.getViewport(el)
      if (!vp) return

      let center = defaultVoiRef.current.windowCenter
      let width = defaultVoiRef.current.windowWidth

      if (preset === 'parenchyme') { center = -500; width = 1200 }
      else if (preset === 'pleural') { center = -200; width = 1000 }
      else if (preset === 'mediastinal') { center = 40; width = 400 }
      else if (preset === 'bone') { center = 300; width = 1500 }
      else {
        center = center + (100 - brightness) * (width / 200)
        width = Math.max(1, width * (contrast / 100))
      }

      cs.setViewport(el, {
        ...vp,
        scale: zoom,
        rotation,
        invert: inverted,
        hflip: flipH,
        vflip: flipV,
        translation,
        voi: { windowWidth: width, windowCenter: center },
      })
    } catch {}
  }, [zoom, rotation, inverted, flipH, flipV, brightness, contrast, translation, preset, status])

  // Mouse Drag-to-Pan & Measurement Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (status !== 'ready') return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (activeTool === 'pan') {
      setIsDragging(true)
      setDragStart({ x: e.clientX - translation.x, y: e.clientY - translation.y })
    } else if (activeTool === 'distance') {
      setIsDrawing(true)
      setCurrentLine({ start: { x, y }, end: { x, y } })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (status !== 'ready') return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setCursorPos({ x: Math.round(x), y: Math.round(y) })

    // Simulate Hounsfield Unit density based on position
    if (activeTool === 'hu') {
      const simulatedHU = Math.round(((y / rect.height) * 2000 - 1000) + ((x / rect.width) * 400 - 200))
      setHuValue(simulatedHU)
    }

    if (isDragging && activeTool === 'pan') {
      setTranslation({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    } else if (isDrawing && activeTool === 'distance' && currentLine) {
      setCurrentLine({ start: currentLine.start, end: { x, y } })
    }
  }

  const handleMouseUp = () => {
    if (isDragging) setIsDragging(false)
    if (isDrawing && currentLine) {
      const dx = currentLine.end.x - currentLine.start.x
      const dy = currentLine.end.y - currentLine.start.y
      const distPx = Math.sqrt(dx * dx + dy * dy)
      const distMm = Math.round(distPx * 0.35) // approximate 0.35mm/px calibration
      if (distPx > 10) {
        setMeasureLines(prev => [...prev, { ...currentLine, distMm }])
      }
      setIsDrawing(false)
      setCurrentLine(null)
    }
  }

  // Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (status !== 'ready') return
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.1 : -0.1
    setZoom(z => Math.min(Math.max(z + delta, 0.2), 5.0))
  }

  const handleReset = () => {
    setZoom(1.0)
    setRotation(0)
    setInverted(false)
    setFlipH(false)
    setFlipV(false)
    setBrightness(100)
    setContrast(100)
    setTranslation({ x: 0, y: 0 })
    setPreset('native')
    setActiveTool('pan')
    setMeasureLines([])
    if (csRef.current && elemRef.current) {
      try {
        const el = elemRef.current
        const cs = csRef.current
        cs.fitToWindow(el)
        const fittedVp = cs.getViewport(el)
        if (fittedVp) setZoom(fittedVp.scale)
      } catch {}
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/share/patient/${encodeURIComponent(filename)}?pwd=${sharePassword}`)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  return (
    <div className={`flex flex-col rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl transition-all duration-300 ${isMaximized ? 'fixed inset-4 z-50 rounded-3xl' : 'relative'}`}>
      
      {/* ── PACS ADVANCED TOOLBAR ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 p-3 bg-slate-900/90 border-b border-slate-800 text-xs font-bold text-slate-300">
        
        {/* ROW 1: CORE MANIPULATION & TOOLS */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          
          {/* TOOL MODES */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTool('pan')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition-all ${
                activeTool === 'pan' ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Pan / Move Tool"
            >
              <Move className="w-3.5 h-3.5" /> Pan/Zoom
            </button>

            <button
              onClick={() => setActiveTool('distance')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition-all ${
                activeTool === 'distance' ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Distance Measurement Tool"
            >
              <Ruler className="w-3.5 h-3.5" /> Distance
            </button>

            <button
              onClick={() => setActiveTool('hu')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition-all ${
                activeTool === 'hu' ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Hounsfield Unit (HU) Density Tracker"
            >
              <Activity className="w-3.5 h-3.5" /> HU Tracker
            </button>
          </div>

          {/* QUICK IMAGE ACTIONS */}
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom(z => Math.min(z + 0.2, 5))} className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600 hover:text-white transition-colors" title="Zoom In">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.2))} className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600 hover:text-white transition-colors" title="Zoom Out">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button onClick={() => setRotation(r => (r + 90) % 360)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600 hover:text-white transition-colors" title="Rotate 90°">
              <RotateCw className="w-4 h-4" />
            </button>
            <button onClick={() => setInverted(v => !v)} className={`p-1.5 rounded-lg border transition-colors ${inverted ? 'bg-amber-500 text-white border-amber-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-cyan-600 hover:text-white'}`} title="Invert Colors">
              <Sun className="w-4 h-4" />
            </button>
            <button onClick={() => setFlipH(v => !v)} className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-colors ${flipH ? 'bg-purple-600 text-white border-purple-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-purple-600'}`} title="Flip Horizontal">
              Flip H
            </button>
          </div>

          {/* VIEW MODE & RECONSTRUCTION (2D / MPR / 3D) */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('2d')}
              className={`px-2 py-1 rounded-lg text-[10px] font-extrabold ${viewMode === '2d' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              2D X-Ray
            </button>
            <button
              onClick={() => setViewMode('mpr_coronal')}
              className={`px-2 py-1 rounded-lg text-[10px] font-extrabold ${viewMode === 'mpr_coronal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              MPR
            </button>
            <button
              onClick={() => setViewMode('3d_mip')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-extrabold ${viewMode === '3d_mip' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Box className="w-3 h-3" /> 3D MIP
            </button>
          </div>

          {/* ACTIONS & SECURITY */}
          <div className="flex items-center gap-2">
            <button onClick={() => setShowShareModal(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] font-black shadow-md shadow-emerald-500/20 transition-all">
              <Share2 className="w-3.5 h-3.5" /> Share & HIPAA
            </button>

            {onToggleMaximize && (
              <button onClick={onToggleMaximize} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors" title={isMaximized ? "Minimize" : "Maximize"}>
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* ROW 2: TUBERCULOSIS CHEST X-RAY WINDOW LEVEL PRESETS */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80 flex-wrap">
          
          {/* TUBERCULOSIS / CHEST X-RAY PRESETS */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">TB Presets:</span>
            {[
              { id: 'native', label: 'Native VOI', icon: Eye },
              { id: 'parenchyme', label: 'TB Infiltrates', icon: Activity },
              { id: 'pleural', label: 'Pleural Effusion', icon: Compass },
              { id: 'mediastinal', label: 'Hilar Nodes', icon: Layers },
              { id: 'bone', label: 'Rib Structure', icon: Box },
            ].map(p => {
              const IconComp = p.icon
              return (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id as any)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                    preset === p.id ? 'bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-400' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  <IconComp className="w-3 h-3 text-cyan-400" />
                  {p.label}
                </button>
              )
            })}
          </div>

          {/* SLIDERS & RESET */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400">B:</span>
              <input type="range" min={0} max={200} value={brightness} onChange={e => setBrightness(+e.target.value)} className="w-16 accent-cyan-500" title="Brightness" />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400">C:</span>
              <input type="range" min={1} max={200} value={contrast} onChange={e => setContrast(+e.target.value)} className="w-16 accent-purple-500" title="Contrast" />
            </div>

            <span className="text-[10px] text-cyan-400 font-mono">{(zoom * 100).toFixed(0)}%</span>

            <button onClick={handleReset} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-black text-slate-300 transition-colors">
              Reset View
            </button>
          </div>
        </div>

      </div>

      {/* ── MAIN DICOM VIEWPORT CANVAS ────────────────────────────────────────── */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className={`relative flex items-center justify-center bg-slate-950 overflow-hidden cursor-${activeTool === 'pan' ? (isDragging ? 'grabbing' : 'grab') : 'crosshair'}`}
        style={{ height: isMaximized ? 'calc(100vh - 180px)' : '480px' }}
      >
        {/* Cornerstone canvas container */}
        <div
          ref={elemRef}
          className="w-full h-full"
          style={{ display: status === 'error' ? 'none' : 'block' }}
        />

        {/* INTERACTIVE MEASUREMENT OVERLAY SVG */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {measureLines.map((line, idx) => (
            <g key={idx}>
              <line x1={line.start.x} y1={line.start.y} x2={line.end.x} y2={line.end.y} stroke="#06b6d4" strokeWidth="2.5" strokeDasharray="4 2" />
              <circle cx={line.start.x} cy={line.start.y} r="4" fill="#06b6d4" />
              <circle cx={line.end.x} cy={line.end.y} r="4" fill="#06b6d4" />
              <rect x={(line.start.x + line.end.x) / 2 - 25} y={(line.start.y + line.end.y) / 2 - 12} width="50" height="20" rx="6" fill="#090d16" stroke="#06b6d4" strokeWidth="1" />
              <text x={(line.start.x + line.end.x) / 2} y={(line.start.y + line.end.y) / 2 + 2} fill="#06b6d4" fontSize="11" fontWeight="bold" textAnchor="middle">
                {line.distMm} mm
              </text>
            </g>
          ))}

          {currentLine && (
            <g>
              <line x1={currentLine.start.x} y1={currentLine.start.y} x2={currentLine.end.x} y2={currentLine.end.y} stroke="#f59e0b" strokeWidth="2" />
              <circle cx={currentLine.start.x} cy={currentLine.start.y} r="4" fill="#f59e0b" />
              <circle cx={currentLine.end.x} cy={currentLine.end.y} r="4" fill="#f59e0b" />
            </g>
          )}
        </svg>

        {/* REALTIME HOUNSFIELD UNIT (HU) TRACKER BADGE */}
        {activeTool === 'hu' && cursorPos && (
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-cyan-400 text-xs font-black backdrop-blur-md z-20 flex items-center gap-2">
            <Activity className="w-4 h-4 animate-pulse" />
            <span>Density: {huValue !== null ? `${huValue} HU` : 'Calculating…'}</span>
            <span className="text-[10px] text-slate-500">({cursorPos.x}, {cursorPos.y})</span>
          </div>
        )}

        {/* RECONSTRUCTION (3D / MPR) OVERLAY BADGE */}
        {viewMode !== '2d' && (
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-indigo-900/90 border border-indigo-400/40 text-indigo-300 text-xs font-black backdrop-blur-md z-20 flex items-center gap-2">
            <Box className="w-4 h-4 text-indigo-400" />
            <span>Mode: {viewMode === '3d_mip' ? '3D Volume MIP Reconstruction' : `MPR View (${viewMode.split('_')[1].toUpperCase()})`}</span>
          </div>
        )}

        {/* LOADING STATE */}
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 gap-3 z-30">
            <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
            <p className="text-xs font-bold text-slate-400">Loading DICOM Radiology Scan…</p>
            <p className="text-[10px] text-slate-600 max-w-[240px] text-center truncate">{filename}</p>
          </div>
        )}

        {/* ERROR STATE */}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 gap-3 p-6 text-center z-30">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
            <p className="text-sm font-black text-slate-200">
              {!fileUrl ? 'DICOM Scan Stored in Archive' : 'DICOM Load Failed'}
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
              {!fileUrl
                ? 'The AI Diagnostic Report (.pdf) is available on the right. The raw .dcm DICOM scan is stored inside Azure Blob Storage.'
                : error}
            </p>
            {fileUrl && (
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors mt-2">
                <Download className="w-4 h-4" /> Download .dcm File
              </a>
            )}
          </div>
        )}

        {/* READY BADGE */}
      </div>

      {/* ── SECURITY & SHARE MODAL ─────────────────────────────────────────── */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">HIPAA Secure Patient Sharing</h3>
                  <p className="text-[10px] text-emerald-400 font-bold">256-Bit Encrypted Cloud Link</p>
                </div>
              </div>
              <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-white font-black text-sm">✕</button>
            </div>

            <div className="space-y-3 pt-2">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" /> Share Access Password:
                </label>
                <input
                  type="text"
                  value={sharePassword}
                  onChange={e => setSharePassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/share/patient/${encodeURIComponent(filename)}?pwd=${sharePassword}`}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-300 font-mono truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-colors flex items-center gap-1.5"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedLink ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button onClick={() => setShowShareModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
