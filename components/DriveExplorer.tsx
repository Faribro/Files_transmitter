'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Folder, FileText, Image as ImageIcon, Search, ChevronRight, HardDrive, Download, ExternalLink, ArrowLeft, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react'
import DicomViewer from './DicomViewer'

interface DriveItem {
  id: string
  name: string
  mime_type: string
  file_type: 'dcm' | 'pdf' | 'png' | 'zip' | 'folder'
  size_bytes: number
  patient_id?: string
  month?: string
  azure_url?: string
  source_url?: string
  discovered_at?: string
}

interface DriveExplorerProps {
  facility: 'AKROSS' | 'DAVO'
  initialMonth?: string
}

const MONTH_FOLDERS = [
  { key: '2026-01', label: 'Jan 2026', desc: 'January Records' },
  { key: '2026-02', label: 'Feb 2026', desc: 'February Records' },
  { key: '2026-03', label: 'Mar 2026', desc: 'March Records' },
  { key: '2026-04', label: 'Apr 2026', desc: 'April Records' },
  { key: '2026-05', label: 'May 2026', desc: 'May Records' },
]

export default function DriveExplorer({ facility, initialMonth }: DriveExplorerProps) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(initialMonth || null)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [patientFiles, setPatientFiles] = useState<{ dcm?: DriveItem; pdf?: DriveItem }>({})
  const [loadingPatient, setLoadingPatient] = useState(false)
  const [itemList, setItemList] = useState<DriveItem[]>([])
  const [loadingList, setLoadingList] = useState(false)

  // Fetch list of files for current facility & month
  useEffect(() => {
    if (!selectedMonth) return

    setLoadingList(true)
    fetch(`/api/v1/files?facility=${facility}&month=${selectedMonth}&limit=100`)
      .then(res => res.json())
      .then(data => {
        const files: DriveItem[] = (data.files || data.items || []).map((f: any) => ({
          id: f.id || f.source_file_id,
          name: f.filename || f.name,
          mime_type: f.mime_type || 'application/octet-stream',
          file_type: (f.file_type || 'other').toLowerCase(),
          size_bytes: f.size_bytes || 0,
          patient_id: f.patient_id,
          month: f.month,
          azure_url: f.target_file_id || f.azure_url,
          discovered_at: f.discovered_at
        }))
        setItemList(files)
        setLoadingList(false)
      })
      .catch(err => {
        console.error('Failed to fetch folder list:', err)
        setLoadingList(false)
      })
  }, [facility, selectedMonth])

  // Fetch side-by-side study files when a patient ID is selected
  useEffect(() => {
    if (!selectedPatientId) return

    setLoadingPatient(true)
    fetch(`/api/v1/files?facility=${facility}&patient_id=${selectedPatientId}`)
      .then(res => res.json())
      .then(data => {
        const files: DriveItem[] = (data.files || data.items || []).map((f: any) => ({
          id: f.id || f.source_file_id,
          name: f.filename || f.name,
          mime_type: f.mime_type || 'application/octet-stream',
          file_type: (f.file_type || 'other').toLowerCase(),
          size_bytes: f.size_bytes || 0,
          patient_id: f.patient_id,
          azure_url: f.target_file_id || f.azure_url,
        }))

        const dcm = files.find(f => f.file_type === 'dcm')
        const pdf = files.find(f => f.file_type === 'pdf')

        setPatientFiles({ dcm, pdf })
        setLoadingPatient(false)
      })
      .catch(err => {
        console.error('Failed to load patient study:', err)
        setLoadingPatient(false)
      })
  }, [facility, selectedPatientId])

  // Extract unique patient IDs from item list for folder view
  const uniquePatientIds = Array.from(new Set(
    itemList
      .map(i => {
        const m = (i.name || '').match(/AS\d{2}[A-Z]{3}\d{8,12}/i)
        return m ? m[0].toUpperCase() : i.patient_id
      })
      .filter(Boolean)
  )) as string[]

  const filteredPatientIds = uniquePatientIds.filter(pid =>
    pid.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-2xl">
      
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* BREADCRUMB NAVIGATION & SEARCH */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        {/* Breadcrumb Path */}
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 overflow-x-auto max-w-full">
          <HardDrive className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span className="text-slate-400">Prison_and_OCS_Intervention</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-slate-400">Medical_Files</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          
          {/* Facility Button */}
          <button
            onClick={() => { setSelectedMonth(null); setSelectedPatientId(null) }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              !selectedMonth ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'hover:text-white text-slate-400'
            }`}
          >
            {facility}
          </button>

          {/* Month Subfolder */}
          {selectedMonth && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <button
                onClick={() => setSelectedPatientId(null)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  !selectedPatientId ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'hover:text-white text-slate-400'
                }`}
              >
                {selectedMonth}
              </button>
            </>
          )}

          {/* Patient ID Subfolder */}
          {selectedPatientId && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                {selectedPatientId}
              </span>
            </>
          )}
        </div>

        {/* Instant Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Patient ID (e.g. AS01UJJ...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 text-slate-200 text-xs font-medium pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* LEVEL 1: MONTH FOLDERS VIEW */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {!selectedMonth && (
        <div className="pt-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Select Month Directory
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {MONTH_FOLDERS.map((mf) => (
              <motion.button
                key={mf.key}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedMonth(mf.key)}
                className="group flex flex-col items-start p-5 rounded-2xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 hover:border-indigo-500/50 transition-all text-left shadow-lg hover:shadow-indigo-500/10"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 transition-colors">
                  <Folder className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {mf.label}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{mf.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Explore Directory</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* LEVEL 2: PATIENT FOLDERS LIST */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {selectedMonth && !selectedPatientId && (
        <div className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setSelectedMonth(null)}
              className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Months</span>
            </button>
            <p className="text-xs font-medium text-slate-400">
              Showing {filteredPatientIds.length} patient folders in {selectedMonth}
            </p>
          </div>

          {loadingList ? (
            <div className="py-16 text-center">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-400">Loading patient directories...</p>
            </div>
          ) : filteredPatientIds.length === 0 ? (
            <div className="py-16 text-center bg-slate-950/40 rounded-2xl border border-slate-800/80">
              <Folder className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">No Patient Folders Found</p>
              <p className="text-xs text-slate-400 mt-1">No matching patient study directories exist for this filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredPatientIds.map((pid) => (
                <button
                  key={pid}
                  onClick={() => setSelectedPatientId(pid)}
                  className="group flex items-center gap-3 p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-emerald-500/50 transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Folder className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 truncate">
                      {pid}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Study Folder</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* LEVEL 3: SIDE-BY-SIDE DUAL PATIENT STUDY VIEWER */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {selectedPatientId && (
        <div className="pt-6">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800/80">
            <button
              onClick={() => setSelectedPatientId(null)}
              className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Patient Directories</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Patient ID:</span>
              <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                {selectedPatientId}
              </span>
            </div>
          </div>

          {loadingPatient ? (
            <div className="py-20 text-center">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-400">Loading Patient Study Files (DCM + PDF)...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* LEFT COLUMN: DICOM IMAGE PREVIEW */}
              <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">DICOM Image Scan (.dcm)</h4>
                        <p className="text-[10px] text-slate-400">X-Ray Radiological Scan</p>
                      </div>
                    </div>
                    {patientFiles.dcm ? (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                        <CheckCircle className="w-3 h-3" /> Available
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                        <AlertTriangle className="w-3 h-3" /> Missing DCM Scan
                      </span>
                    )}
                  </div>

                  {patientFiles.dcm ? (
                    <div className="space-y-4">
                      {/* Interactive Canvas Viewer */}
                      <DicomViewer 
                        fileUrl={patientFiles.dcm.azure_url || `/api/v1/files/${patientFiles.dcm.id}/content`} 
                        filename={patientFiles.dcm.name} 
                      />
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 text-xs space-y-1.5">
                        <div className="flex justify-between"><span className="text-slate-400">Filename:</span><span className="font-semibold text-slate-200 truncate max-w-[200px]">{patientFiles.dcm.name}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">File Size:</span><span className="font-semibold text-slate-200">{(patientFiles.dcm.size_bytes / (1024*1024)).toFixed(2)} MB</span></div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-16 text-center text-slate-400">
                      <ImageIcon className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-400">No DICOM File Available</p>
                    </div>
                  )}
                </div>

                {patientFiles.dcm?.azure_url && (
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <a
                      href={patientFiles.dcm.azure_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <span>Open in Azure Storage</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: DIAGNOSTIC PDF REPORT PREVIEW */}
              <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Diagnostic Report (.pdf)</h4>
                        <p className="text-[10px] text-slate-400">AI Medical Report</p>
                      </div>
                    </div>
                    {patientFiles.pdf ? (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                        <CheckCircle className="w-3 h-3" /> Available
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                        <AlertTriangle className="w-3 h-3" /> Missing Report
                      </span>
                    )}
                  </div>

                  {patientFiles.pdf ? (
                    <div className="space-y-4">
                      {/* PDF Embed / Preview Container */}
                      <div className="h-64 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
                        {patientFiles.pdf.azure_url ? (
                          <iframe
                            src={patientFiles.pdf.azure_url}
                            className="w-full h-full border-0"
                            title="Diagnostic Report"
                          />
                        ) : (
                          <div className="text-center">
                            <FileText className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                            <p className="text-xs font-semibold text-slate-200">{patientFiles.pdf.name}</p>
                          </div>
                        )}
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 text-xs space-y-1.5">
                        <div className="flex justify-between"><span className="text-slate-400">Filename:</span><span className="font-semibold text-slate-200 truncate max-w-[200px]">{patientFiles.pdf.name}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">File Size:</span><span className="font-semibold text-slate-200">{(patientFiles.pdf.size_bytes / 1024).toFixed(1)} KB</span></div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-16 text-center text-slate-400">
                      <FileText className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-400">No PDF Report Available</p>
                    </div>
                  )}
                </div>

                {patientFiles.pdf?.azure_url && (
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <a
                      href={patientFiles.pdf.azure_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      <span>Open Report PDF</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  )
}
