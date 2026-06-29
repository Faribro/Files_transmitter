'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, FileText, Image as ImageIcon, Info, ChevronRight, Activity } from 'lucide-react'
import DicomViewer from './DicomViewer'
import { apiUrl } from '@/lib/api'

interface PatientFile {
  id: number
  file_inventory_id: number
  file_type: string
  series_description?: string
  modality?: string
  filename: string
  size_bytes?: number
  target_path?: string
  target_file_id?: string
}

interface SessionDetail {
  id: number
  session_date?: string
  session_month?: string
  session_number: number
  total_files: number
  files: PatientFile[]
}

interface PatientDetail {
  patient_id: string
  facility: string
  total_sessions: number
  total_dcm_files: number
  total_pdf_files: number
  total_files: number
  first_scan_date?: string
  last_scan_date?: string
  has_complete_set: boolean
  sessions: SessionDetail[]
}

interface PatientDetailModalProps {
  patientId: string
  onClose: () => void
}

export default function PatientDetailModal({ patientId, onClose }: PatientDetailModalProps) {
  const [data, setData] = useState<PatientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null)
  const [activeFile, setActiveFile] = useState<PatientFile | null>(null)

  useEffect(() => {
    async function fetchPatientDetail() {
      try {
        setLoading(true)
        const res = await fetch(apiUrl(`/api/v1/patients/${patientId}`))
        if (!res.ok) throw new Error('Failed to fetch patient details')
        const json = await res.json()
        setData(json)
        
        if (json.sessions && json.sessions.length > 0) {
          const firstSession = json.sessions[0]
          setSelectedSessionId(firstSession.id)
          // Default to the first file
          if (firstSession.files && firstSession.files.length > 0) {
            setActiveFile(firstSession.files[0])
          }
        }
        setLoading(false)
      } catch (err: any) {
        console.error(err)
        setError(err.message || 'Error fetching details')
        setLoading(false)
      }
    }

    if (patientId) {
      fetchPatientDetail()
    }
  }, [patientId])

  const selectSession = (session: SessionDetail) => {
    setSelectedSessionId(session.id)
    if (session.files && session.files.length > 0) {
      setActiveFile(session.files[0])
    } else {
      setActiveFile(null)
    }
  }

  const selectedSession = data?.sessions.find(s => s.id === selectedSessionId)

  // Construct SAS url for files
  const getFileUrl = (file: PatientFile) => {
    if (!file.target_path) return ''
    // Under Nginx proxy, we can directly request the file from the backend,
    // or if the frontend has a direct link. The backend router serves files.
    // Wait! Let's check routes.py to see how files are downloaded:
    // Is there a file proxy endpoint in routes.py?
    // Let's check if there is an endpoint like `/api/v1/files/{file_id}/download` or similar.
    // Yes! Let's check routes.py to make sure. 
    return apiUrl(`/api/v1/files/${file.file_inventory_id}/download`)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[85vh] flex flex-col overflow-hidden border border-gray-100"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-600 to-brand-700 text-white px-6 py-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-display">{patientId}</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  data?.facility === 'AKROSS' ? 'bg-white/20 text-white' : 'bg-purple-500/20 text-purple-200'
                }`}>
                  {data?.facility}
                </span>
              </div>
              <p className="text-xs text-white/80 mt-1">
                {data?.first_scan_date ? `Timeline: ${data.first_scan_date} to ${data.last_scan_date || 'Present'}` : 'No scan history'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="p-6 text-center text-red-600 flex-1 flex flex-col items-center justify-center">
              <Info className="w-12 h-12 mb-2" />
              <p className="font-semibold">{error}</p>
            </div>
          )}

          {loading && !error && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-text-secondary font-semibold">Loading patient file sessions...</p>
            </div>
          )}

          {!loading && !error && data && (
            <div className="flex-1 flex overflow-hidden">
              {/* Left Timeline Panel (30% width) */}
              <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50/50">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Timeline Sessions</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {data.sessions.map((session) => {
                    const isSelected = session.id === selectedSessionId
                    const dateStr = session.session_date || session.session_month || 'Undated'
                    
                    return (
                      <button
                        key={session.id}
                        onClick={() => selectSession(session)}
                        className={`w-full text-left p-3.5 rounded-lg border transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'bg-brand-50 border-brand-200 shadow-sm'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold ${isSelected ? 'text-brand-800' : 'text-text-primary'}`}>
                            Session #{session.session_number}
                          </p>
                          <p className="text-xs text-text-tertiary mt-0.5">{dateStr}</p>
                          <p className="text-xs text-text-secondary mt-1 flex items-center gap-2">
                            {session.files.filter(f => f.file_type === 'dcm').length > 0 && (
                              <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">DCM</span>
                            )}
                            {session.files.filter(f => f.file_type === 'pdf').length > 0 && (
                              <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">PDF</span>
                            )}
                          </p>
                        </div>
                        <ChevronRight className={`w-4 h-4 self-center text-text-tertiary transition-transform ${
                          isSelected ? 'transform translate-x-0.5 text-brand-500' : ''
                        }`} />
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Right Viewport Panel (70% width) */}
              <div className="flex-1 flex flex-col bg-white">
                {/* File Selector Tabs */}
                {selectedSession && (
                  <div className="border-b border-gray-200 px-6 py-3 bg-gray-50/30 flex items-center gap-3 overflow-x-auto">
                    <span className="text-xs font-bold text-text-tertiary uppercase mr-2">Files:</span>
                    {selectedSession.files.map((file) => {
                      const isFileActive = activeFile?.id === file.id
                      const Icon = file.file_type === 'dcm' ? ImageIcon : FileText
                      const typeLabel = file.file_type === 'dcm' ? 'CXR Image' : 'PDF Report'
                      
                      return (
                        <button
                          key={file.id}
                          onClick={() => setActiveFile(file)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all ${
                            isFileActive
                              ? 'bg-brand-500 text-white border-brand-500 shadow-md'
                              : 'bg-white border-gray-200 text-text-secondary hover:border-gray-300'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{file.filename.length > 25 ? `${file.filename.slice(0, 22)}...` : file.filename}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Viewer Panel */}
                <div className="flex-1 relative overflow-hidden bg-gray-900/5">
                  {activeFile ? (
                    <div className="w-full h-full flex flex-col">
                      {activeFile.file_type === 'dcm' ? (
                        <div className="flex-1 bg-black text-white relative">
                          <DicomViewer fileUrl={getFileUrl(activeFile)} filename={activeFile.filename} />
                        </div>
                      ) : activeFile.file_type === 'pdf' ? (
                        <div className="flex-1 bg-gray-100 flex flex-col p-4">
                          {/* PDF Viewer with Error Handling */}
                          <div className="w-full h-full bg-white rounded-lg shadow-inner border border-gray-200 overflow-hidden flex items-center justify-center">
                            <object
                              data={getFileUrl(activeFile)}
                              type="application/pdf"
                              className="w-full h-full"
                            >
                              <div className="p-8 text-center">
                                <FileText className="w-16 h-16 mx-auto mb-4 text-red-500" />
                                <p className="text-text-primary font-semibold mb-2">Unable to display PDF in browser</p>
                                <p className="text-text-secondary text-sm mb-4">Your browser may not support inline PDF viewing</p>
                                <a
                                  href={getFileUrl(activeFile)}
                                  download={activeFile.filename}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors font-semibold text-sm"
                                >
                                  <FileText className="w-4 h-4" />
                                  Download PDF
                                </a>
                              </div>
                            </object>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 bg-gray-100 flex items-center justify-center">
                          <div className="text-center text-text-tertiary">
                            <FileText className="w-12 h-12 mx-auto mb-2" />
                            <p className="font-semibold">Unsupported file type</p>
                            <a
                              href={getFileUrl(activeFile)}
                              download={activeFile.filename}
                              className="mt-3 inline-block text-brand-600 hover:underline text-sm font-semibold"
                            >
                              Download file
                            </a>
                          </div>
                        </div>
                      )}
                      
                      {/* File Metadata Overlay/Panel */}
                      <div className="bg-white border-t border-gray-200 px-6 py-3.5 flex items-center justify-between text-xs text-text-secondary">
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-text-primary">Filename:</span>
                          <span>{activeFile.filename}</span>
                          <span className="text-gray-300">|</span>
                          <span className="font-semibold text-text-primary">Size:</span>
                          <span>{activeFile.size_bytes ? `${(activeFile.size_bytes / (1024 * 1024)).toFixed(2)} MB` : 'N/A'}</span>
                          {activeFile.modality && (
                            <>
                              <span className="text-gray-300">|</span>
                              <span className="font-semibold text-text-primary">Modality:</span>
                              <span className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-[10px] font-bold">{activeFile.modality}</span>
                            </>
                          )}
                        </div>
                        {activeFile.series_description && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-text-primary">Description:</span>
                            <span>{activeFile.series_description}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-text-tertiary">
                      <Activity className="w-12 h-12 mb-2 animate-pulse" />
                      <p className="font-semibold">Select a file from the session menu to preview</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
