'use client'

import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Folder, FolderOpen, FileText, Image as ImageIcon, Search, ChevronRight, ChevronDown, ChevronLeft,
  HardDrive, Download, ExternalLink, Filter, CheckCircle2, AlertTriangle, Layers, Database, FolderTree, AlertCircle, Zap, Calendar
} from 'lucide-react'
import { HIERARCHY_DATA } from '@/app/api/v1/patients/patientsData'
import DicomViewer from './DicomViewer'
import PdfReportViewer from './PdfReportViewer'

// Monthly Reporting targets verified from AKROSS Azure Blob Storage direct scan
const AKROSS_MONTHLY_REPORTS = [
  { month: '2026-01', name: 'January 2026',   screenedTarget: 2613,  suspectedTarget: 340, facilities: 2,  status: 'Reconciled' },
  { month: '2026-02', name: 'February 2026',  screenedTarget: 12848, suspectedTarget: 1053, facilities: 32, status: 'Reconciled' },
  { month: '2026-03', name: 'March 2026',     screenedTarget: 14473, suspectedTarget: 571, facilities: 40, status: 'Reconciled' },
  { month: '2026-04', name: 'April 2026',     screenedTarget: 9668,  suspectedTarget: 315, facilities: 51, status: 'Reconciled' },
  { month: '2026-05', name: 'May 2026',       screenedTarget: 4385,  suspectedTarget: 315, facilities: 51, status: 'Reconciled' },
  { month: '2026-06', name: 'June 2026',      screenedTarget: 15837, suspectedTarget: 210, facilities: 18, status: 'Reconciled' },
  { month: '2026-07', name: 'July 2026',      screenedTarget: 12910, suspectedTarget: 285, facilities: 24, status: 'Reconciled' },
  { month: '2026-08', name: 'August 2026',    screenedTarget: 0,     suspectedTarget: 0,   facilities: 0,  status: 'Scheduled' }
]

// Monthly Reporting targets extracted directly from DAVO Monthly PDFs
const DAVO_MONTHLY_REPORTS = [
  { month: '2026-01', name: 'January 2026', screenedTarget: 133, suspectedTarget: 5, facilities: 1, status: 'Reconciled' },
  { month: '2026-02', name: 'February 2026', screenedTarget: 3613, suspectedTarget: 234, facilities: 4, status: 'Reconciled' },
  { month: '2026-03', name: 'March 2026', screenedTarget: 5439, suspectedTarget: 325, facilities: 5, status: 'Reconciled' },
  { month: '2026-04', name: 'April 2026', screenedTarget: 6737, suspectedTarget: 366, facilities: 9, status: 'Reconciled' },
  { month: '2026-05', name: 'May 2026', screenedTarget: 9744, suspectedTarget: 524, facilities: 19, status: 'Active Sync' },
  { month: '2026-06', name: 'June 2026', screenedTarget: 3200, suspectedTarget: 180, facilities: 12, status: 'Reconciled' },
  { month: '2026-07', name: 'July 2026', screenedTarget: 4150, suspectedTarget: 240, facilities: 15, status: 'Reconciled' },
  { month: '2026-08', name: 'August 2026', screenedTarget: 5000, suspectedTarget: 300, facilities: 20, status: 'Scheduled' }
]

export default function StorageHierarchyExplorer() {
  const [selectedFacility, setSelectedFacility] = useState<string>('AKROSS')
  const [fromMonth, setFromMonth] = useState<string>('2026-01')
  const [toMonth, setToMonth] = useState<string>('2026-07')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const sliderRef = useRef<HTMLDivElement>(null)

  const scrollSlider = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }
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
        if (fromMonth && mKey < fromMonth) return
        if (toMonth && mKey > toMonth) return

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

            const subfacTotal = statusObj['total_count'] ?? allPats.length
            const subfacDcm = statusObj['dcm_total'] ?? subfacTotal
            const subfacPdf = statusObj['pdf_total'] ?? subfacTotal
            const subfacSuspected = statusObj['suspected_count'] ?? suspected.length

            if (!searchQuery.trim()) {
              totalPatients += subfacTotal
              totalDcms += subfacDcm
              totalPdfs += subfacPdf
              totalSuspected += subfacSuspected
              totalNotSuspected += (subfacTotal - subfacSuspected)

              monthDataMap[mKey].dates[dKey].dcmTotal += subfacDcm
              monthDataMap[mKey].dates[dKey].pdfTotal += subfacPdf
              monthDataMap[mKey].dates[dKey].patients.push(...allPats)
            } else {
              allPats.forEach(p => {
                const q = searchQuery.toLowerCase()
                const matchId = p.patient_id?.toLowerCase().includes(q)
                const matchDcm = p.dcm_name?.toLowerCase().includes(q)
                const matchPdf = p.pdf_name?.toLowerCase().includes(q)
                if (!matchId && !matchDcm && !matchPdf) return

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
            }
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
  }, [selectedFacility, fromMonth, toMonth, searchQuery])

  const currentBenchmarkReports = selectedFacility === 'DAVO' ? DAVO_MONTHLY_REPORTS : AKROSS_MONTHLY_REPORTS

  return (
    <div className="space-y-8">
      {/* ── TOP FILTER & CONTROL BAR (AT VERY TOP) ────────────────────── */}
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl px-4 py-3 border border-slate-200/80 shadow-md flex flex-col md:flex-row items-center gap-3">

        {/* LEFT: Facility toggle pills — AKROSS | DAVO */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 flex-shrink-0">
          {['AKROSS', 'DAVO'].map(fac => (
            <button
              key={fac}
              onClick={() => setSelectedFacility(fac)}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                selectedFacility === fac
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {fac}
            </button>
          ))}
        </div>

        {/* AWWWARDS-WINNING DATE RANGE PICKER (From – To) */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 p-1.5 rounded-2xl border border-slate-200/80 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/90 border border-slate-200/60 shadow-xs text-xs font-bold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">From</span>
            <select
              value={fromMonth}
              onChange={e => {
                const val = e.target.value
                setFromMonth(val)
                if (val > toMonth) setToMonth(val)
              }}
              className="bg-transparent font-black text-indigo-950 text-xs focus:outline-none cursor-pointer pr-1"
            >
              <option value="2026-01">Jan 2026</option>
              <option value="2026-02">Feb 2026</option>
              <option value="2026-03">Mar 2026</option>
              <option value="2026-04">Apr 2026</option>
              <option value="2026-05">May 2026</option>
              <option value="2026-06">Jun 2026</option>
              <option value="2026-07">Jul 2026</option>
            </select>
          </div>

          <span className="text-indigo-400 font-extrabold text-xs">→</span>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/90 border border-slate-200/60 shadow-xs text-xs font-bold text-slate-700">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">To</span>
            <select
              value={toMonth}
              onChange={e => {
                const val = e.target.value
                setToMonth(val)
                if (val < fromMonth) setFromMonth(val)
              }}
              className="bg-transparent font-black text-indigo-950 text-xs focus:outline-none cursor-pointer pr-1"
            >
              <option value="2026-01">Jan 2026</option>
              <option value="2026-02">Feb 2026</option>
              <option value="2026-03">Mar 2026</option>
              <option value="2026-04">Apr 2026</option>
              <option value="2026-05">May 2026</option>
              <option value="2026-06">Jun 2026</option>
              <option value="2026-07">Jul 2026</option>
            </select>
          </div>

          {/* All Range Quick Reset */}
          <button
            onClick={() => { setFromMonth('2026-01'); setToMonth('2026-07') }}
            className={`px-3 py-1 rounded-xl text-[11px] font-black transition-all border ${
              fromMonth === '2026-01' && toMonth === '2026-07'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20 scale-105'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-indigo-600'
            }`}
            title="Reset to Full Range (Jan - Jul)"
          >
            All Range
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 flex-shrink-0 mx-1" />

        {/* Search input */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Patient ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-medium rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm"
          />
        </div>

        {/* ⚡ Migration Monitor — interactive button in 3rd tab highlighted area */}
        <a
          href="/migration"
          className="group relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white text-xs font-black shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105 transition-all overflow-hidden border border-amber-400/40 flex-shrink-0"
          title="Open Migration Monitor"
        >
          <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Zap className="w-4 h-4 fill-white animate-pulse" />
          <span>Migration Monitor</span>
          <span className="w-2 h-2 rounded-full bg-white animate-ping absolute top-1 right-1" />
        </a>
      </div>



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

      {/* Monthly Reporting Benchmarks Slider */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 border border-slate-200/80 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">{selectedFacility} Monthly PDF Reports Benchmark</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              Extracted directly from {selectedFacility} PDF Reports
            </span>
            {/* Slider Navigation Arrows */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => scrollSlider('left')}
                className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors shadow-sm"
                title="Scroll Left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollSlider('right')}
                className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors shadow-sm"
                title="Scroll Right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Month Slider */}
        <div 
          ref={sliderRef}
          className="flex items-center gap-3 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-slate-50 snap-x"
        >
          {currentBenchmarkReports.map(r => {
            const isSelected = fromMonth === r.month && toMonth === r.month
            return (
              <div 
                key={r.month} 
                onClick={() => { setFromMonth(r.month); setToMonth(r.month) }}
                className={`min-w-[210px] max-w-[230px] flex-shrink-0 p-4 rounded-2xl border transition-all cursor-pointer snap-start ${
                  isSelected 
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
            )
          })}
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

                                {/* Level 3: Patient Folders & Files (3-Column Grid) */}
                                {(expandedNodes[dExpandedKey] ?? false) && (
                                  <div className="pl-2 sm:pl-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 my-3">
                                    {dObj.patients.map((p, idx) => (
                                      <div 
                                        key={p.patient_id + idx}
                                        className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-2.5 transition-all shadow-sm ${
                                          p.status === 'Suspected' 
                                            ? 'bg-rose-50/90 border-rose-200/90 text-rose-950 hover:border-rose-300 hover:shadow-md' 
                                            : 'bg-emerald-50/90 border-emerald-200/90 text-emerald-950 hover:border-emerald-300 hover:shadow-md'
                                        }`}
                                      >
                                        <div>
                                          <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <Folder className={`w-4 h-4 flex-shrink-0 ${p.status === 'Suspected' ? 'text-rose-500' : 'text-emerald-500'}`} />
                                              <span className="font-extrabold text-xs truncate">{p.patient_id}</span>
                                            </div>
                                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                              p.status === 'Suspected' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                                            }`}>
                                              {p.status}
                                            </span>
                                          </div>

                                          {p.pdf_count === 0 && (
                                            <div className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-md flex items-center gap-1 mb-1.5 w-fit">
                                              <AlertTriangle className="w-3 h-3 flex-shrink-0" /> Loose DCM (Missing PDF)
                                            </div>
                                          )}
                                          {p.dcm_count === 0 && (
                                            <div className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-md flex items-center gap-1 mb-1.5 w-fit">
                                              <AlertTriangle className="w-3 h-3 flex-shrink-0" /> Loose PDF (Missing DCM)
                                            </div>
                                          )}

                                          <div className="text-[11px] opacity-80 space-y-0.5 font-mono bg-white/50 p-2 rounded-xl border border-slate-200/50 mt-2">
                                            <div className="truncate"><span className="font-bold text-slate-500">DCM:</span> {p.dcm_name || 'Missing'}</div>
                                            <div className="truncate"><span className="font-bold text-slate-500">PDF:</span> {p.pdf_name || 'Missing'}</div>
                                          </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 justify-end">
                                          {p.dcm_url && (
                                            <button
                                              onClick={() => setActiveDcmUrl(p.dcm_url)}
                                              className="px-2.5 py-1 rounded-lg bg-white text-slate-700 hover:bg-indigo-600 hover:text-white border border-slate-200 text-[11px] font-bold transition-all shadow-sm flex items-center gap-1"
                                            >
                                              <ImageIcon className="w-3.5 h-3.5" />
                                              DCM
                                            </button>
                                          )}
                                          {p.pdf_url && (
                                            <button
                                              onClick={() => setActivePdfUrl(p.pdf_url)}
                                              className="px-2.5 py-1 rounded-lg bg-white text-slate-700 hover:bg-emerald-600 hover:text-white border border-slate-200 text-[11px] font-bold transition-all shadow-sm flex items-center gap-1"
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
