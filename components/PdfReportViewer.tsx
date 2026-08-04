'use client'

import { useState, useEffect } from 'react'
import { ZoomIn, ZoomOut, RotateCw, RefreshCw, ExternalLink, Download, AlertTriangle, Maximize2, Minimize2, FileX } from 'lucide-react'

interface PdfReportViewerProps {
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

export default function PdfReportViewer({ fileUrl, filename, onClose, isMaximized, onToggleMaximize }: PdfReportViewerProps) {
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  const proxied = proxyUrl(fileUrl)

  useEffect(() => {
    if (!fileUrl) {
      setLoaded(true)
      setErrored(true)
      return
    }

    let isMounted = true
    setLoaded(false)
    setErrored(false)

    // Pre-verify that proxied URL is a valid PDF stream (HTTP 200)
    fetch(proxied, { method: 'HEAD' })
      .then((res) => {
        if (isMounted) {
          if (res.ok) {
            setLoaded(true)
          } else {
            setLoaded(true)
            setErrored(true)
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoaded(true)
          setErrored(true)
        }
      })

    return () => {
      isMounted = false
    }
  }, [fileUrl, proxied])

  return (
    <div className={`flex flex-col rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl transition-all duration-300 ${isMaximized ? 'fixed inset-4 z-50 rounded-3xl' : 'relative'}`}>
      {/* TOOLBAR */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 text-xs font-bold text-slate-300 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setZoom(z => Math.min(z + 20, 250))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white transition-colors" title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => setZoom(z => Math.max(z - 20, 40))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white transition-colors" title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={() => setRotation(r => (r + 90) % 360)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white transition-colors" title="Rotate">
            <RotateCw className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-extrabold text-indigo-400 px-2.5 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            {zoom}%
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {fileUrl && (
            <>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white transition-colors" title="Open in new tab">
                <ExternalLink className="w-4 h-4" />
              </a>
              <a href={proxied} download={filename}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white transition-colors" title="Download PDF">
                <Download className="w-4 h-4" />
              </a>
            </>
          )}
          <button onClick={() => { setZoom(100); setRotation(0) }}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold transition-colors">
            Reset Zoom
          </button>
          {onToggleMaximize && (
            <button onClick={onToggleMaximize} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors" title={isMaximized ? "Minimize" : "Maximize"}>
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* PDF VIEWPORT */}
      <div
        className="relative bg-slate-950 overflow-auto"
        style={{ height: isMaximized ? 'calc(100vh - 120px)' : '480px' }}
      >
        {/* Loading skeleton */}
        {!loaded && !errored && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 z-10">
            <RefreshCw className="w-7 h-7 text-indigo-500 animate-spin" />
            <p className="text-xs font-bold text-slate-400">Loading AI Diagnostic Report…</p>
            <p className="text-[10px] text-slate-600 max-w-[220px] text-center truncate">{filename}</p>
          </div>
        )}

        {/* Error / Not Available State */}
        {errored && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 z-10 p-6 text-center">
            <FileX className="w-12 h-12 text-slate-600" />
            <p className="text-sm font-black text-slate-300">Diagnostic PDF Report Not Available</p>
            <p className="text-xs text-slate-500 max-w-xs">
              This inmate record contains DICOM image scans. A separate PDF report is not present for this scan.
            </p>
          </div>
        )}

        {/* Real PDF iframe */}
        {!errored && loaded && (
          <div
            className="origin-top-left transition-transform duration-200"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              width: `${10000 / zoom}%`,
              height: `${10000 / zoom}%`,
            }}
          >
            <iframe
              key={proxied}
              src={`${proxied}#toolbar=1&navpanes=0&scrollbar=1`}
              className="w-full h-full border-0"
              style={{ minHeight: `${480 * 100 / zoom}px` }}
              title={filename}
            />
          </div>
        )}
      </div>
    </div>
  )
}
