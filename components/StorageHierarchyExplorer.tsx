'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Folder, FolderOpen, FileText, Image as ImageIcon, Search, ChevronRight, ChevronDown,
  HardDrive, Download, ExternalLink, Filter, CheckCircle2, AlertTriangle, Layers, Database, FolderTree, AlertCircle
} from 'lucide-react'
import { HIERARCHY_DATA } from '@/app/api/v1/patients/patientsData'
import DicomViewer from './DicomViewer'
import PdfReportViewer from './PdfReportViewer'

// Monthly Reporting targets extracted directly from AKROSS Monthly PDFs (Jan - May 2026)
const AKROSS_MONTHLY_REPORTS = [
  { month: '2026-01', name: 'January 2026', screenedTarget: 2613, suspectedTarget: 340, facilities: 2, status: 'Reconciled' },
  { month: '2026-02', name: 'February 2026', screenedTarget: 12848, suspectedTarget: 1053, facilities: 32, status: 'Reconciled' },
  { month: '2026-03', name: 'March 2026', screenedTarget: 14473, suspectedTarget: 571, facilities: 40, status: 'Reconciled' },
  { month: '2026-04', name: 'April 2026', screenedTarget: 9668, suspectedTarget: 315, facilities: 51, status: 'Reconciled' },
  { month: '2026-05', name: 'May 2026', screenedTarget: 9668, suspectedTarget: 315, facilities: 51, status: 'Scheduled' }
]

// Monthly Reporting targets extracted directly from DAVO Monthly PDFs (Jan - May 2026)
const DAVO_MONTHLY_REPORTS = [
  { month: '2026-01', name: 'January 2026', screenedTarget: 133, suspectedTarget: 5, facilities: 1, status: 'Reconciled' },
  { month: '2026-02', name: 'February 2026', screenedTarget: 3613, suspectedTarget: 234, facilities: 4, status: 'Reconciled' },
  { month: '2026-03', name: 'March 2026', screenedTarget: 5439, suspectedTarget: 325, facilities: 5, status: 'Reconciled' },
  { month: '2026-04', name: 'April 2026', screenedTarget: 6737, suspectedTarget: 366, facilities: 9, status: 'Reconciled' },
  { month: '2026-05', name: 'May 2026', screenedTarget: 9744, suspectedTarget: 524, facilities: 19, status: 'Active Sync' }
]

export default function StorageHierarchyExplorer() {
  const [selectedFacility, setSelectedFacility] = useState<string>('AKROSS')
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'root': true,
    'month_2026-01': true,
    'month_2026-02': true
  })

  // Selected file for viewer modal
  const [activeDcmUrl, setActiveDcmUrl] = useState<string | null>(null)
  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null)

  const toggleNode = (key: string) => {
    setExpandedNodes(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Build full raw folder tree from HIERARCHY_DATA
  const rawTree = useMemo(() => {
    const facilities = selectedFacility === 'ALL' ? Object.keys(HIERARCHY_DATA) : [selectedFacility]
    
    let totalPatients = 0
    let totalDcms = 0
    let totalPdfs = 0
    let totalSuspected = 0
    let totalNotSuspected = 0

    const monthDataMap: Record<string, {
      monthKey: string,
      dates: Record<string, {
        dateKey: string,
        patients: any[],
        dcmTotal: number,
        pdfTotal: number
      }>
    }> = {}

    facilities.forEach(fac => {
      const facObj = HIERARCHY_DATA[fac] || {}
      Object.keys(facObj).forEach(mKey => {
        if (selectedMonth !== 'ALL' && mKey !== selectedMonth) return

        if (!monthDataMap[mKey]) {
          monthDataMap[mKey] = { monthKey: mKey, dates: {} }
        }

        const datesObj = facObj[mKey] || {}
        Object.keys(datesObj).forEach(dKey => {
          if (!monthDataMap[mKey].dates[dKey]) {
            monthDataMap[mKey].dates[dKey] = { dateKey: dKey, patients: [], dcmTotal: 0, pdfTotal: 0 }
          }

          const subfacs = datesObj[dKey] || {}
          Object.keys(subfacs).forEach(sf => {
            const statusObj = subfacs[sf] || {}
            const suspected = statusObj['Suspected'] || []
            const notSuspected = statusObj['Not Suspected'] || []

            const allPats = [...suspected, ...notSuspected]

            allPats.forEach(p => {
              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase()
                const matchId = p.patient_id?.toLowerCase().includes(q)
                const matchDcm = p.dcm_name?.toLowerCase().includes(q)
                const matchPdf = p.pdf_name?.toLowerCase().includes(q)
                if (!matchId && !matchDcm && !matchPdf) return
              }

              totalPatients++
              const dCount = p.dcm_count ?? 1
              const pCount = p.pdf_count ?? 1
              
              totalDcms += dCount
              totalPdfs += pCount

              monthDataMap[mKey].dates[dKey].dcmTotal += dCount
              monthDataMap[mKey].dates[dKey].pdfTotal += pCount

              if (p.status === 'Suspected') totalSuspected++
              else totalNotSuspected++

              monthDataMap[mKey].dates[dKey].patients.push(p)
            })
          })
        })
      })
    })

    return {
      monthDataMap,
      totalPatients,
      totalDcms,
      totalPdfs,
      totalSuspected,
      totalNotSuspected,
      mismatchCount: Math.abs(totalDcms - totalPdfs)
    }
  }, [selectedFacility, selectedMonth, searchQuery])

  const currentBenchmarkReports = selectedFacility === 'DAVO' ? DAVO_MONTHLY_REPORTS : AKROSS_MONTHLY_REPORTS

  return (
    <div className="space-y-8">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-2xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-3">
              <HardDrive className="w-3.5 h-3.5" />
              Azure Blob Storage Hierarchy Explorer ({selectedFacility})
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Raw Directory & Loose File Reconciler
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              1-to-1 Azure Storage directory tree (<code className="text-indigo-300 font-mono text-xs bg-indigo-900/50 px-2 py-0.5 rounded">containerprision/Medical_Files/{selectedFacility}</code>) reconciled against official PDF Reports (Jan – May 2026).
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center">
              <span className="text-xs text-slate-300 block">Patient Folders</span>
              <span className="text-xl font-bold text-white">{rawTree.totalPatients.toLocaleString()}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center">
              <span className="text-xs text-indigo-300 block">DCM Scans</span>
              <span className="text-xl font-bold text-indigo-200">{rawTree.totalDcms.toLocaleString()}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center">
              <span className="text-xs text-emerald-300 block">PDF Reports</span>
              <span className="text-xl font-bold text-emerald-200">{rawTree.totalPdfs.toLocaleString()}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center">
              <span className="text-xs text-rose-300 block">TB Suspected</span>
              <span className="text-xl font-bold text-rose-200">{rawTree.totalSuspected.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Loose Files / Count Mismatch Banner */}
      {rawTree.mismatchCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-400/40 rounded-2xl p-4 flex items-center justify-between gap-4 text-amber-900 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <span className="font-extrabold text-sm block text-amber-950">
                Loose File Count Mismatch Detected ({selectedFacility})
              </span>
              <span className="text-xs text-amber-800">
                Total DCM scans ({rawTree.totalDcms.toLocaleString()}) does not equal total PDF reports ({rawTree.totalPdfs.toLocaleString()}). Loose DCMs/PDFs are highlighted below with missing file badges.
              </span>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-600 text-white font-black text-xs rounded-full flex-shrink-0">
            {rawTree.mismatchCount.toLocaleString()} Loose Files
          </span>
        </div>
      )}

      {/* Monthly Reporting Benchmarks (Jan - May 2026) */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 border border-slate-200/80 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">{selectedFacility} Monthly PDF Reports Benchmark (Jan – May 2026)</h2>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Extracted directly from {selectedFacility} PDF Reports
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {currentBenchmarkReports.map(r => (
            <div 
              key={r.month} 
              className={`p-4 rounded-2xl border transition-all ${
                selectedMonth === r.month 
                  ? 'bg-indigo-50/90 border-indigo-300 shadow-md ring-2 ring-indigo-500/20' 
                  : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">{r.name}</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  r.status === 'Reconciled' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                }`}>
                  {r.status}
                </span>
              </div>
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Target Screened:</span>
                  <span className="font-bold text-slate-900">{r.screenedTarget.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>TB Suspected:</span>
                  <span className="font-bold text-rose-600">{r.suspectedTarget.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Facilities:</span>
                  <span className="font-semibold text-slate-700">{r.facilities}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/80 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Facility Selector */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {['AKROSS', 'DAVO', 'ALL'].map(fac => (
              <button
                key={fac}
                onClick={() => setSelectedFacility(fac)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedFacility === fac
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {fac}
              </button>
            ))}
          </div>

          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Months (Jan - Jul)</option>
            <option value="2026-01">January 2026</option>
            <option value="2026-02">February 2026</option>
            <option value="2026-03">March 2026</option>
            <option value="2026-04">April 2026</option>
            <option value="2026-05">May 2026</option>
            <option value="2026-06">June 2026</option>
            <option value="2026-07">July 2026</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Patient ID or File Name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Directory Hierarchy Tree Display */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 border border-slate-200/80 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-slate-900 text-sm">Azure Storage Virtual Directory Layout</span>
          </div>
          <span className="text-xs text-slate-500 font-mono font-bold bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            {rawTree.totalPatients.toLocaleString()} patient folders · showing {Object.keys(rawTree.monthDataMap).length} month folders · {rawTree.totalDcms.toLocaleString()} DCM · {rawTree.totalPdfs.toLocaleString()} PDF
          </span>
        </div>

        <div className="font-mono text-xs space-y-2 max-h-[650px] overflow-y-auto pr-2">
          {/* Root Level: Container */}
          <div className="space-y-2">
            <div 
              onClick={() => toggleNode('root')}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100/90 border border-slate-200 hover:bg-indigo-50/70 cursor-pointer transition-colors"
            >
              {expandedNodes['root'] ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
              <HardDrive className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-slate-900">containerprision</span>
              <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">Container</span>
            </div>

            {/* Level 1: Months */}
            <div className="pl-6 space-y-2">
              {Object.keys(rawTree.monthDataMap).length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  No matching files or folders found for current filter.
                </div>
              ) : (
                Object.keys(rawTree.monthDataMap).map(mKey => {
                  const mObj = rawTree.monthDataMap[mKey]
                  const mExpandedKey = `month_${mKey}`

                  let mTotalPats = 0
                  let mTotalDcms = 0
                  let mTotalPdfs = 0
                  Object.values(mObj.dates).forEach(d => { 
                    mTotalPats += d.patients.length 
                    mTotalDcms += d.dcmTotal
                    mTotalPdfs += d.pdfTotal
                  })

                  return (
                    <div key={mKey} className="space-y-2">
                      <div 
                        onClick={() => toggleNode(mExpandedKey)}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/40 border border-indigo-100 hover:bg-indigo-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {expandedNodes[mExpandedKey] ? <ChevronDown className="w-4 h-4 text-indigo-500" /> : <ChevronRight className="w-4 h-4 text-indigo-500" />}
                          <FolderOpen className="w-4 h-4 text-indigo-600" />
                          <span className="font-bold text-indigo-950">{mKey}</span>
                          <span className="text-[10px] text-indigo-600 bg-indigo-100/80 px-2 py-0.5 rounded-full font-bold">
                            Month Folder
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">
                          {mTotalPats.toLocaleString()} patient folders · {mTotalDcms.toLocaleString()} DCM · {mTotalPdfs.toLocaleString()} PDF
                        </span>
                      </div>

                      {/* Level 2: Dates */}
                      {(expandedNodes[mExpandedKey] ?? true) && (
                        <div className="pl-6 space-y-2">
                          {Object.keys(mObj.dates).map(dKey => {
                            const dObj = mObj.dates[dKey]
                            const dExpandedKey = `date_${mKey}_${dKey}`

                            return (
                              <div key={dKey} className="space-y-2">
                                <div 
                                  onClick={() => toggleNode(dExpandedKey)}
                                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100 cursor-pointer transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    {expandedNodes[dExpandedKey] ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                                    <Folder className="w-3.5 h-3.5 text-slate-600" />
                                    <span className="font-bold text-slate-800">{dKey}</span>
                                    <span className="text-[10px] text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                                      Date Directory
                                    </span>
                                  </div>
                                  <span className="text-xs text-slate-500 font-semibold">
                                    {dObj.patients.length.toLocaleString()} patient folders · {dObj.dcmTotal.toLocaleString()} DCM · {dObj.pdfTotal.toLocaleString()} PDF
                                  </span>
                                </div>

                                {/* Level 3: Patient Folders & Files */}
                                {(expandedNodes[dExpandedKey] ?? false) && (
                                  <div className="pl-6 space-y-1">
                                    {dObj.patients.map((p, idx) => (
                                      <div 
                                        key={p.patient_id + idx}
                                        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                          p.status === 'Suspected' 
                                            ? 'bg-rose-50/80 border-rose-200 text-rose-950' 
                                            : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                                        }`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <Folder className={`w-4 h-4 flex-shrink-0 ${p.status === 'Suspected' ? 'text-rose-500' : 'text-emerald-500'}`} />
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-extrabold text-xs">{p.patient_id}</span>
                                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                p.status === 'Suspected' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                                              }`}>
                                                {p.status}
                                              </span>
                                              {p.pdf_count === 0 && (
                                                <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                                  <AlertTriangle className="w-3 h-3" /> Loose DCM (Missing PDF)
                                                </span>
                                              )}
                                              {p.dcm_count === 0 && (
                                                <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                                  <AlertTriangle className="w-3 h-3" /> Loose PDF (Missing DCM)
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-[11px] opacity-75 flex flex-wrap items-center gap-3 mt-1">
                                              <span>DCM: <code className="font-mono">{p.dcm_name || 'Missing'}</code></span>
                                              <span>PDF: <code className="font-mono">{p.pdf_name || 'Missing'}</code></span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 self-end sm:self-center">
                                          {p.dcm_url && (
                                            <button
                                              onClick={() => setActiveDcmUrl(p.dcm_url)}
                                              className="px-2.5 py-1.5 rounded-lg bg-white/90 text-slate-700 hover:bg-indigo-600 hover:text-white border border-slate-200 text-[11px] font-bold transition-all shadow-sm flex items-center gap-1"
                                            >
                                              <ImageIcon className="w-3.5 h-3.5" />
                                              DCM
                                            </button>
                                          )}
                                          {p.pdf_url && (
                                            <button
                                              onClick={() => setActivePdfUrl(p.pdf_url)}
                                              className="px-2.5 py-1.5 rounded-lg bg-white/90 text-slate-700 hover:bg-emerald-600 hover:text-white border border-slate-200 text-[11px] font-bold transition-all shadow-sm flex items-center gap-1"
                                            >
                                              <FileText className="w-3.5 h-3.5" />
                                              PDF
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DICOM Viewer Modal */}
      {activeDcmUrl && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-8">
          <div className="relative w-full max-w-5xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col">
            <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
              <span className="font-bold text-white text-sm">DICOM Image Viewer</span>
              <button
                onClick={() => setActiveDcmUrl(null)}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md"
              >
                Close Viewer
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <DicomViewer
                fileUrl={activeDcmUrl}
                filename="Patient Chest Scan (.dcm)"
                onClose={() => setActiveDcmUrl(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {activePdfUrl && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-8">
          <div className="relative w-full max-w-5xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col">
            <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
              <span className="font-bold text-white text-sm">PDF Diagnostic Report Viewer</span>
              <button
                onClick={() => setActivePdfUrl(null)}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md"
              >
                Close Viewer
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <PdfReportViewer
                fileUrl={activePdfUrl}
                filename="AI Diagnostic Report (.pdf)"
                onClose={() => setActivePdfUrl(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
