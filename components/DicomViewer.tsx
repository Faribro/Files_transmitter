'use client'

import { useEffect, useRef, useState } from 'react'
import { ZoomIn, ZoomOut, RotateCw, Sun, RefreshCw, Download, AlertTriangle, ExternalLink } from 'lucide-react'

interface DicomViewerProps {
  fileUrl: string
  filename: string
  onClose?: () => void
}

// Build the proxied URL to bypass CORS on Azure blob
function proxyUrl(raw: string) {
  if (!raw) return ''
  return `/api/v1/proxy?url=${encodeURIComponent(raw)}`
}

export default function DicomViewer({ fileUrl, filename, onClose }: DicomViewerProps) {
  const elemRef    = useRef<HTMLDivElement>(null)
  const [status, setStatus]   = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError]     = useState('')
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast]     = useState(100)
  const [rotation, setRotation]     = useState(0)
  const [zoom, setZoom]             = useState(1.0)
  const [inverted, setInverted]     = useState(false)
  const csRef   = useRef<any>(null)
  const cswRef  = useRef<any>(null)

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
        // Dynamically import Cornerstone (client-only)
        const cornerstone = await import('cornerstone-core')
        const cornerstoneWADO = await import('cornerstone-wado-image-loader')
        const dicomParser = await import('dicom-parser')

        csRef.current  = cornerstone
        cswRef.current = cornerstoneWADO

        // Configure WADO loader
        cornerstoneWADO.external.cornerstone  = cornerstone
        cornerstoneWADO.external.dicomParser  = dicomParser
        cornerstoneWADO.configure({
          useWebWorkers: false,
        })

        const el = elemRef.current
        if (!el || !active) return

        // Enable the element
        try { cornerstone.disable(el) } catch {}
        cornerstone.enable(el)

        const proxied = proxyUrl(fileUrl)
        const imageId = `wadouri:${proxied}`

        const image = await cornerstone.loadAndCacheImage(imageId)
        if (!active) return

        cornerstone.displayImage(el, image)
        setStatus('ready')

        // Apply initial viewport
        const vp = cornerstone.getDefaultViewportForImage(el, image)
        cornerstone.setViewport(el, vp)

      } catch (err: any) {
        if (!active) return
        console.error('DICOM load error:', err)
        setError(err?.message || 'Failed to load DICOM')
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

  // Apply viewport adjustments live
  useEffect(() => {
    if (status !== 'ready' || !csRef.current || !elemRef.current) return
    try {
      const cs = csRef.current
      const el = elemRef.current
      const vp = cs.getViewport(el)
      if (!vp) return
      cs.setViewport(el, {
        ...vp,
        scale: zoom,
        rotation,
        invert: inverted,
        voi: { windowWidth: contrast * 4, windowCenter: brightness - 50 },
      })
    } catch {}
  }, [zoom, rotation, inverted, brightness, contrast, status])

  const handleReset = () => {
    setZoom(1.0); setRotation(0); setInverted(false)
    setBrightness(100); setContrast(100)
    if (csRef.current && elemRef.current) {
      try {
        const el = elemRef.current
        const cs = csRef.current
        const image = cs.getImage(el)
        if (image) {
          const vp = cs.getDefaultViewportForImage(el, image)
          cs.setViewport(el, vp)
        }
      } catch {}
    }
  }

  return (
    <div className="flex flex-col rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
      {/* TOOLBAR */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs font-bold text-slate-300 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setZoom(z => Math.min(z + 0.2, 4))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600 hover:text-white transition-colors" title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.3))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600 hover:text-white transition-colors" title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={() => setRotation(r => (r + 90) % 360)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600 hover:text-white transition-colors" title="Rotate 90°">
            <RotateCw className="w-4 h-4" />
          </button>
          <button onClick={() => setInverted(v => !v)}
            className={`p-1.5 rounded-lg border transition-colors ${inverted ? 'bg-amber-500 text-white border-amber-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-cyan-600 hover:text-white'}`}
            title="Invert">
            <Sun className="w-4 h-4" />
          </button>
          <span className="ml-2 text-[10px] text-slate-500 hidden sm:inline">B:</span>
          <input type="range" min={0} max={200} value={brightness}
            onChange={e => setBrightness(+e.target.value)}
            className="w-16 accent-cyan-500" title="Brightness" />
          <span className="text-[10px] text-slate-500 hidden sm:inline">C:</span>
          <input type="range" min={1} max={200} value={contrast}
            onChange={e => setContrast(+e.target.value)}
            className="w-16 accent-purple-500" title="Contrast" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">{(zoom * 100).toFixed(0)}% | {rotation}°</span>
          <button onClick={handleReset}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold transition-colors">
            Reset View
          </button>
        </div>
      </div>

      {/* VIEWPORT */}
      <div className="relative flex items-center justify-center bg-slate-950 overflow-hidden" style={{ height: '320px' }}>
        {/* Cornerstone div — must be sized explicitly */}
        <div
          ref={elemRef}
          className="w-full h-full"
          style={{ minHeight: '320px', display: status === 'error' ? 'none' : 'block' }}
        />

        {/* Loading state */}
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 gap-3">
            <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
            <p className="text-xs font-bold text-slate-400">Loading DICOM from Azure…</p>
            <p className="text-[10px] text-slate-600 max-w-[200px] text-center truncate">{filename}</p>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 gap-3 p-6 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
            <p className="text-sm font-black text-slate-200">DICOM Load Failed</p>
            <p className="text-[10px] text-slate-500 max-w-xs">{error}</p>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors mt-2">
              <Download className="w-4 h-4" />
              Download .dcm File
            </a>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-cyan-400 transition-colors">
              <ExternalLink className="w-3 h-3" /> View in Azure Storage
            </a>
          </div>
        )}

        {/* Ready badge */}
        {status === 'ready' && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold backdrop-blur-md pointer-events-none">
            Live DICOM
          </div>
        )}
      </div>
    </div>
  )
}
