'use client'

import { useState } from 'react'
import { ZoomIn, ZoomOut, RotateCw, RefreshCw, ExternalLink, Download, AlertTriangle } from 'lucide-react'

interface PdfReportViewerProps {
  fileUrl: string
  filename: string
}

function proxyUrl(raw: string) {
  if (!raw) return ''
  return `/api/v1/proxy?url=${encodeURIComponent(raw)}`
}

export default function PdfReportViewer({ fileUrl, filename }: PdfReportViewerProps) {
  const [zoom, setZoom]         = useState(100)
  const [rotation, setRotation] = useState(0)
  const [loaded, setLoaded]     = useState(false)
  const [errored, setErrored]   = useState(false)

  const proxied = proxyUrl(fileUrl)

  return (
    <div className="flex flex-col rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
      {/* TOOLBAR */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs font-bold text-slate-300 gap-2 flex-wrap">
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
          <span className="text-[11px] font-extrabold text-indigo-400 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">
            {zoom}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a href={fileUrl} target="_blank" rel="noopener noreferrer"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white transition-colors" title="Open in new tab">
            <ExternalLink className="w-4 h-4" />
          </a>
          <a href={proxied} download={filename}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white transition-colors" title="Download PDF">
            <Download className="w-4 h-4" />
          </a>
          <button onClick={() => { setZoom(100); setRotation(0) }}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold transition-colors">
            Reset Zoom
          </button>
        </div>
      </div>

      {/* PDF VIEWPORT */}
      <div
        className="relative bg-slate-950 overflow-auto"
        style={{ height: '360px' }}
      >
        {/* Loading skeleton */}
        {!loaded && !errored && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 z-10">
            <RefreshCw className="w-7 h-7 text-indigo-500 animate-spin" />
            <p className="text-xs font-bold text-slate-400">Loading PDF from Azure…</p>
            <p className="text-[10px] text-slate-600 max-w-[220px] text-center truncate">{filename}</p>
          </div>
        )}

        {/* Error state */}
        {errored && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 z-10 p-6 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
            <p className="text-sm font-black text-slate-200">PDF Load Failed</p>
            <p className="text-[10px] text-slate-500 max-w-xs">
              The browser couldn't embed this PDF inline. Use the buttons below to open or download it.
            </p>
            <div className="flex gap-3 mt-2">
              <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors">
                <ExternalLink className="w-4 h-4" /> Open in New Tab
              </a>
              <a href={proxied} download={filename}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-colors">
                <Download className="w-4 h-4" /> Download
              </a>
            </div>
          </div>
        )}

        {/* Real PDF iframe — zoomed via CSS transform on a wrapper */}
        {!errored && (
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
              style={{ minHeight: `${360 * 100 / zoom}px` }}
              onLoad={() => setLoaded(true)}
              onError={() => { setLoaded(true); setErrored(true) }}
              title={filename}
            />
          </div>
        )}

        {/* Ready badge */}
        {loaded && !errored && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold backdrop-blur-md pointer-events-none z-20">
            Live PDF
          </div>
        )}
      </div>
    </div>
  )
}
