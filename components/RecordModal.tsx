'use client'

import { X, Download, FileText, ImageIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiUrl } from '@/lib/api'
import dynamic from 'next/dynamic'

const DicomViewer = dynamic(() => import('./DicomViewer'), { ssr: false })

interface RecordModalProps {
  record: any
  isOpen: boolean
  onClose: () => void
}

export default function RecordModal({ record, isOpen, onClose }: RecordModalProps) {
  const [imageError, setImageError] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  useEffect(() => {
    // Global error handler for unhandled rejections
    const handleGlobalRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && (event.reason instanceof XMLHttpRequest || event.reason?.toString().includes('XMLHttpRequest'))) {
        event.preventDefault()
        console.warn('Caught XMLHttpRequest rejection in modal')
      }
    }

    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('unhandledrejection', handleGlobalRejection)
    } else {
      document.body.style.overflow = 'unset'
      setImageError(false)
      setDownloadUrl(null)
    }
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('unhandledrejection', handleGlobalRejection)
    }
  }, [isOpen, record])

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
            {/* Show message if PDF not yet migrated */}
            {!record.pdfFileId && !record.pdf_path && record.dcmFileId && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  📋 PDF reports are still being migrated. DICOM scan available below.
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* PDF Viewer */}
              {(record.pdfFiles && record.pdfFiles.length > 0) || record.pdfFileId ? (
                <div className="border border-border-default rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-surface-sunken border-b border-border-subtle">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-brand-700" />
                      <span className="text-sm font-semibold">PDF Report</span>
                      {record.pdfFiles && record.pdfFiles.length > 1 && (
                        <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                          +{record.pdfFiles.length - 1} more
                        </span>
                      )}
                    </div>
                    <a
                      href={apiUrl(`/api/v1/files/${record.pdfFiles?.[0]?.id || record.pdfFileId || record.fileId}/download`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-brand-700 hover:text-brand-900 font-medium"
                    >
                      <Download className="w-4 h-4" />
                      Open PDF
                    </a>
                  </div>
                  <div className="h-[600px] bg-surface-page">
                    <iframe
                      src={apiUrl(`/api/v1/files/${record.pdfFiles?.[0]?.id || record.pdfFileId || record.fileId}/download`)}
                      className="w-full h-full border-0"
                      title="PDF Viewer"
                    />
                  </div>
                </div>
              ) : (
                <div className="border border-border-default rounded-lg p-8 text-center bg-surface-sunken">
                  <FileText className="w-12 h-12 text-text-disabled mx-auto mb-3" />
                  <p className="text-text-secondary font-semibold mb-1">PDF Not Available Yet</p>
                  <p className="text-xs text-text-tertiary">PDF reports are being migrated and will appear here soon</p>
                </div>
              )}

              {/* Medical Image Viewer (DICOM/PNG/JPG) */}
              {record.dcmFileId || (record.dcmFiles && record.dcmFiles.length > 0) ? (
                <DicomViewer 
                  fileUrl={apiUrl(`/api/v1/files/${record.dcmFiles?.[0]?.id || record.dcmFileId || record.fileId}/download`)}
                  filename={record.dcmFiles?.[0]?.filename || record.name || 'medical-scan.dcm'}
                />
              ) : record.imageFiles && record.imageFiles.length > 0 ? (
                <div className="border border-border-default rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-surface-sunken border-b border-border-subtle">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-brand-700" />
                      <span className="text-sm font-semibold">Medical Image</span>
                    </div>
                    <a
                      href={apiUrl(`/api/v1/files/${record.imageFiles[0].id}/download`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-brand-700 hover:text-brand-900 font-medium"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                  <div className="h-[600px] bg-black flex items-center justify-center">
                    <img
                      src={apiUrl(`/api/v1/files/${record.imageFiles[0].id}/download`)}
                      alt="Medical Image"
                      className="max-w-full max-h-full object-contain"
                      onError={() => setImageError(true)}
                    />
                  </div>
                </div>
              ) : (
                <div className="border border-border-default rounded-lg p-8 text-center">
                  <ImageIcon className="w-12 h-12 text-text-disabled mx-auto mb-3" />
                  <p className="text-text-tertiary">No medical scan available for this patient</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
