'use client'

import { useState } from 'react'
import { ZoomIn, ZoomOut, RotateCw, Maximize2, Download, ExternalLink, FileText, CheckCircle } from 'lucide-react'

interface PdfReportViewerProps {
  fileUrl: string
  filename: string
}

export default function PdfReportViewer({ fileUrl, filename }: PdfReportViewerProps) {
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)

  const proxiedUrl = fileUrl.startsWith('http') 
    ? `/api/v1/files/proxy?url=${encodeURIComponent(fileUrl)}` 
    : fileUrl

  return (
    <div className="flex flex-col rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
      {/* REAL-TIME PDF TOOLBAR WITH ZOOM CONTROLS */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs font-bold text-slate-300">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom(z => Math.min(z + 25, 250))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(z => Math.max(z - 25, 50))}
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
          <span className="text-[11px] font-extrabold text-indigo-400 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">
            {zoom}%
          </span>
        </div>

        <button
          onClick={() => { setZoom(100); setRotation(0) }}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 transition-colors"
        >
          Reset Zoom
        </button>
      </div>

      {/* REAL-TIME ZOOMABLE PDF CONTAINER */}
      <div className="relative flex items-center justify-center bg-slate-950 p-2 overflow-auto h-64">
        <div 
          className="w-full h-full transition-transform duration-200 ease-out origin-top-left"
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            width: `${100 / (zoom / 100)}%`,
            height: `${100 / (zoom / 100)}%`
          }}
        >
          <object
            data={proxiedUrl}
            type="application/pdf"
            className="w-full h-full rounded-xl border border-slate-800"
          >
            {/* Fallback iframe / Google View embed */}
            <iframe
              src={`https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`}
              className="w-full h-full rounded-xl border-0"
              title="Diagnostic Report PDF"
            />
          </object>
        </div>
      </div>
    </div>
  )
}
