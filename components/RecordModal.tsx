'use client'

import { X, Download, FileText, ImageIcon, ZoomIn, ZoomOut, RotateCw } from 'lucide-react'
import { useEffect, useState } from 'react'

interface RecordModalProps {
  record: any
  isOpen: boolean
  onClose: () => void
}

export default function RecordModal({ record, isOpen, onClose }: RecordModalProps) {
  const [imageZoom, setImageZoom] = useState(100)
  const [imageRotation, setImageRotation] = useState(0)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
      setImageZoom(100)
      setImageRotation(0)
      setImageError(false)
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen || !record) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-luxury-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div>
            <h2 className="text-2xl font-display font-bold text-text-primary">
              {record.name}
            </h2>
            <p className="text-sm text-text-tertiary mt-1">
              File ID: {record.id} • {record.facility} • Type: {record.fileType?.toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-sunken transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] scrollbar-thin">
          {/* Patient Details */}
          <div className="px-6 py-4 bg-surface-sunken">
            <h3 className="text-sm font-bold text-text-tertiary uppercase tracking-wider mb-3">
              File Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-text-tertiary">Status</p>
                <p className="text-lg font-semibold text-text-primary">{record.tb_status}</p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Facility</p>
                <p className="text-lg font-semibold text-text-primary">{record.facility}</p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary">File Type</p>
                <p className="text-lg font-semibold text-text-primary">{record.fileType?.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Date</p>
                <p className="text-lg font-semibold text-text-primary">{record.date || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* File Viewers */}
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* PDF Viewer */}
              {record.pdf_path ? (
                <div className="border border-border-default rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-surface-sunken border-b border-border-subtle">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-brand-700" />
                      <span className="text-sm font-semibold">PDF Report</span>
                    </div>
                    <a
                      href={record.pdf_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-brand-700 hover:text-brand-900 font-medium"
                    >
                      <Download className="w-4 h-4" />
                      Open
                    </a>
                  </div>
                  <div className="h-[500px] bg-surface-page">
                    <iframe
                      src={record.pdf_path}
                      className="w-full h-full border-0"
                      title="PDF Viewer"
                    />
                  </div>
                </div>
              ) : (
                <div className="border border-border-default rounded-lg p-8 text-center">
                  <FileText className="w-12 h-12 text-text-disabled mx-auto mb-3" />
                  <p className="text-text-tertiary">No PDF available</p>
                </div>
              )}

              {/* Medical Image Viewer (DICOM/PNG/JPG) */}
              {record.dcm_path ? (
                <div className="border border-border-default rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-surface-sunken border-b border-border-subtle">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-brand-700" />
                      <span className="text-sm font-semibold">Medical Scan ({record.fileType?.toUpperCase()})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Image Controls */}
                      <div className="flex items-center gap-1 border-r border-border-subtle pr-3">
                        <button
                          onClick={() => setImageZoom(Math.max(50, imageZoom - 10))}
                          className="p-1.5 hover:bg-surface-page rounded transition-colors"
                          title="Zoom Out"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-mono w-12 text-center">{imageZoom}%</span>
                        <button
                          onClick={() => setImageZoom(Math.min(200, imageZoom + 10))}
                          className="p-1.5 hover:bg-surface-page rounded transition-colors"
                          title="Zoom In"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setImageRotation((imageRotation + 90) % 360)}
                          className="p-1.5 hover:bg-surface-page rounded transition-colors ml-1"
                          title="Rotate"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                      </div>
                      <a
                        href={record.dcm_path}
                        download
                        className="flex items-center gap-1 text-xs text-brand-700 hover:text-brand-900 font-medium"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </a>
                    </div>
                  </div>
                  <div className="h-[500px] bg-black relative overflow-auto flex items-center justify-center">
                    {imageError ? (
                      <div className="text-white text-center">
                        <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Unable to load image</p>
                        <p className="text-xs opacity-70 mt-1">Format: {record.fileType}</p>
                      </div>
                    ) : (
                      <img
                        src={record.dcm_path}
                        alt="Medical Scan"
                        className="transition-transform duration-200"
                        style={{
                          transform: `scale(${imageZoom / 100}) rotate(${imageRotation}deg)`,
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                        }}
                        onError={() => setImageError(true)}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="border border-border-default rounded-lg p-8 text-center">
                  <ImageIcon className="w-12 h-12 text-text-disabled mx-auto mb-3" />
                  <p className="text-text-tertiary">No medical scan available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
