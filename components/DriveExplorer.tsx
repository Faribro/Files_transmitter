'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Folder, FolderOpen, FileText, Image as ImageIcon, Search, ChevronRight,
  HardDrive, Download, ExternalLink, ArrowLeft, RefreshCw, CheckCircle,
  AlertTriangle, LayoutGrid, List, SortAsc, FolderPlus, Upload,
  ChevronDown, File, X, Eye
} from 'lucide-react'
import DicomViewer from './DicomViewer'
import PdfReportViewer from './PdfReportViewer'
import AsciiFireEffect from './AsciiFireEffect'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PatientFolder {
  patient_id: string
  dcm_count:  number
  pdf_count:  number
  total_size: number
  dcm_url:    string | null
  pdf_url:    string | null
  dcm_name:   string | null
  pdf_name:   string | null
}

interface MonthConfig {
  key: string
  label: string
  desc: string
}

interface DriveExplorerProps {
  facility:        'AKROSS' | 'DAVO'
  initialMonth?:   string
  onMonthSelect?:  (month: string) => void
}

// ─── Real month configs per facility (no more fake fallback) ─────────────────

const FACILITY_MONTHS: Record<string, MonthConfig[]> = {
  AKROSS: [
    { key: '2026-01', label: 'Jan 2026', desc: 'January 2026' },
    { key: '2026-02', label: 'Feb 2026', desc: 'February 2026' },
    { key: '2026-03', label: 'Mar 2026', desc: 'March 2026' },
    { key: '2026-04', label: 'Apr 2026', desc: 'April 2026' },
  ],
  DAVO: [
    { key: '2026-01', label: 'Jan 2026', desc: 'January 2026' },
    { key: '2026-02', label: 'Feb 2026', desc: 'February 2026' },
    { key: '2026-03', label: 'Mar 2026', desc: 'March 2026' },
    { key: '2026-04', label: 'Apr 2026', desc: 'April 2026' },
    { key: '2026-05', label: 'May 2026', desc: 'May 2026' },
    { key: '2026-06', label: 'Jun 2026', desc: 'June 2026' },
    { key: '2026-07', label: 'Jul 2026', desc: 'July 2026' },
  ],
}

// Real file counts per facility/month (confirmed from DB)
const MONTH_STATS: Record<string, Record<string, { dcm: number; pdf: number; patients: number }>> = {
  AKROSS: {
    '2026-01': { dcm: 7356,  pdf: 6098, patients: 8361  },
    '2026-02': { dcm: 27589, pdf: 3050, patients: 24183 },
    '2026-03': { dcm: 2900,  pdf: 750,  patients: 750   },
    '2026-04': { dcm: 32,    pdf: 3010, patients: 3004  },
  },
  DAVO: {
    '2026-01': { dcm: 75,   pdf: 77,   patients: 152   },
    '2026-02': { dcm: 3751, pdf: 3678, patients: 7079  },
    '2026-03': { dcm: 4834, pdf: 4955, patients: 8477  },
    '2026-04': { dcm: 6655, pdf: 6809, patients: 10951 },
    '2026-05': { dcm: 9102, pdf: 9540, patients: 15257 },
    '2026-06': { dcm: 9319, pdf: 9574, patients: 18893 },
    '2026-07': { dcm: 184,  pdf: 165,  patients: 349   },
  },
}

function fmtBytes(b: number) {
  if (b >= 1073741824) return `${(b / 1073741824).toFixed(1)} GB`
  if (b >= 1048576)    return `${(b / 1048576).toFixed(1)} MB`
  if (b >= 1024)       return `${(b / 1024).toFixed(1)} KB`
  return `${b} B`
}
function fmtNum(n: number) { return n.toLocaleString() }

// ─── Component ───────────────────────────────────────────────────────────────

export default function DriveExplorer({ facility, initialMonth, onMonthSelect }: DriveExplorerProps) {
  const [selectedMonth,     setSelectedMonth]     = useState<string | null>(initialMonth || null)
  const [selectedPatient,   setSelectedPatient]   = useState<PatientFolder | null>(null)
  const [patients,          setPatients]          = useState<PatientFolder[]>([])
  const [loadingPatients,   setLoadingPatients]   = useState(false)
  const [loadError,         setLoadError]         = useState('')
  const [searchQuery,       setSearchQuery]       = useState('')
  const [viewMode,          setViewMode]          = useState<'grid' | 'list'>('grid')
  const [sortBy,            setSortBy]            = useState<'id' | 'size' | 'dcm' | 'pdf'>('id')
  const [isBurning,         setIsBurning]         = useState(false)
  const [page,              setPage]              = useState(1)
  const [totalPatients,     setTotalPatients]     = useState(0)
  const PAGE_SIZE = 120

  const months = FACILITY_MONTHS[facility] || FACILITY_MONTHS.AKROSS

  // ── Fire burn transition ──────────────────────────────────────────────────
  const handleMonthClick = (monthKey: string) => {
    setIsBurning(true)
    setTimeout(() => {
      setSelectedMonth(monthKey)
      setSelectedPatient(null)
      setPatients([])
      setPage(1)
      setIsBurning(false)
      if (onMonthSelect) onMonthSelect(monthKey)
    }, 1800)
  }

  // ── Fetch real patient folders from API ───────────────────────────────────
  const fetchPatients = useCallback(async (month: string, pg: number) => {
    setLoadingPatients(true)
    setLoadError('')
    try {
      const res = await fetch(
        `/api/v1/patients?facility=${facility}&month=${month}&page=${pg}&limit=${PAGE_SIZE}`
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'API error')
      if (pg === 1) {
        setPatients(data.patients || [])
      } else {
        setPatients(prev => [...prev, ...(data.patients || [])])
      }
      setTotalPatients(data.total || 0)
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load patient directories')
    } finally {
      setLoadingPatients(false)
    }
  }, [facility])

  useEffect(() => {
    if (!selectedMonth) return
    fetchPatients(selectedMonth, 1)
    setPage(1)
  }, [facility, selectedMonth, fetchPatients])

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filtered = patients.filter(p =>
    p.patient_id.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'id')   return a.patient_id.localeCompare(b.patient_id)
    if (sortBy === 'size') return b.total_size - a.total_size
    if (sortBy === 'dcm')  return b.dcm_count  - a.dcm_count
    if (sortBy === 'pdf')  return b.pdf_count  - a.pdf_count
    return 0
  })

  const monthStats = selectedMonth ? (MONTH_STATS[facility]?.[selectedMonth] || { dcm: 0, pdf: 0, patients: 0 }) : null

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="bg-white/80 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-2xl shadow-indigo-500/10 overflow-hidden">

      {/* ── Fire burn animation ─────────────────────────────────────────── */}
      <AnimatePresence>
        {isBurning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-6 pt-4">
            <AsciiFireEffect durationMs={1800} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Breadcrumb toolbar ──────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100/80 bg-slate-50/60">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 overflow-x-auto flex-1 min-w-0">
          <HardDrive className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          <span className="text-slate-400 text-[11px] flex-shrink-0">Medical_Files</span>
          <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />

          <button
            onClick={() => { setSelectedMonth(null); setSelectedPatient(null) }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all flex-shrink-0 ${
              !selectedMonth ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            {facility}
          </button>

          {selectedMonth && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
              <button
                onClick={() => setSelectedPatient(null)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all flex-shrink-0 ${
                  !selectedPatient ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30' : 'hover:bg-slate-200 text-slate-600'
                }`}
              >
                {selectedMonth}
              </button>
            </>
          )}

          {selectedPatient && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-[11px] font-extrabold shadow-sm shadow-emerald-500/30 flex-shrink-0 max-w-[180px] truncate">
                {selectedPatient.patient_id}
              </span>
            </>
          )}
        </div>

        {/* Right controls */}
        {selectedMonth && !selectedPatient && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search patient ID…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-white text-slate-900 text-[11px] font-bold pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all w-44 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>
            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="text-[11px] font-bold bg-white border border-slate-200 rounded-xl px-2 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="id">Sort: ID</option>
              <option value="size">Sort: Size</option>
              <option value="dcm">Sort: DCM</option>
              <option value="pdf">Sort: PDF</option>
            </select>
            {/* View toggle */}
            <div className="flex items-center rounded-xl border border-slate-200 overflow-hidden">
              <button onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-6">

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* LEVEL 1 — Month Folders (facility-specific) */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {!selectedMonth && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">
              Select Month Directory — {facility}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {months.map((mf, i) => {
                const stats = MONTH_STATS[facility]?.[mf.key]
                return (
                  <motion.button
                    key={mf.key}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.04, y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleMonthClick(mf.key)}
                    className="group flex flex-col items-start p-5 rounded-2xl bg-white hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 border border-slate-200/80 hover:border-indigo-300 shadow-sm hover:shadow-lg hover:shadow-indigo-500/10 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3 group-hover:bg-indigo-600 transition-colors">
                      <Folder className="w-5 h-5 text-indigo-600 group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-700">{mf.label}</h3>
                    {stats && (
                      <div className="mt-2 space-y-0.5">
                        <p className="text-[10px] font-bold text-slate-400">{fmtNum(stats.patients)} patients</p>
                        <p className="text-[10px] text-slate-400">{fmtNum(stats.dcm)} DCM · {fmtNum(stats.pdf)} PDF</p>
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-1 text-[10px] font-extrabold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Open</span><ChevronRight className="w-3 h-3" />
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* LEVEL 2 — Patient Folders */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {selectedMonth && !selectedPatient && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedMonth(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <div>
                  <p className="text-sm font-black text-slate-900">{selectedMonth}</p>
                  <p className="text-[10px] font-bold text-slate-400">
                    {loadingPatients ? 'Loading…' : `${fmtNum(totalPatients)} patient folders · showing ${fmtNum(sorted.length)}`}
                    {monthStats && ` · ${fmtNum(monthStats.dcm)} DCM · ${fmtNum(monthStats.pdf)} PDF`}
                  </p>
                </div>
              </div>
              {/* Action buttons (Google Drive-style) */}
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 text-[11px] font-bold transition-all">
                  <FolderPlus className="w-3.5 h-3.5" /> New Folder
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 text-[11px] font-bold transition-all">
                  <Upload className="w-3.5 h-3.5" /> Upload
                </button>
              </div>
            </div>

            {/* Error state */}
            {loadError && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-xs font-bold text-red-700">{loadError}</p>
                <button onClick={() => fetchPatients(selectedMonth!, 1)}
                  className="ml-auto px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold transition-colors">
                  Retry
                </button>
              </div>
            )}

            {/* Loading skeleton */}
            {loadingPatients && patients.length === 0 && (
              <div className={viewMode === 'grid'
                ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'
                : 'space-y-2'}>
                {Array.from({ length: 18 }).map((_, i) => (
                  <div key={i} className={`rounded-2xl bg-slate-100 animate-pulse ${viewMode === 'grid' ? 'h-24' : 'h-12'}`} />
                ))}
              </div>
            )}

            {/* ── Grid View ─────────────────────────────────────────────── */}
            {!loadingPatients && viewMode === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {sorted.map((p, i) => (
                  <motion.button
                    key={p.patient_id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Math.min(i * 0.01, 0.3) }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedPatient(p)}
                    className="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-white hover:bg-emerald-50 border border-slate-100 hover:border-emerald-300 shadow-sm hover:shadow-md transition-all text-center"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center group-hover:bg-emerald-500 transition-colors flex-shrink-0">
                      <Folder className="w-5 h-5 text-emerald-600 group-hover:text-white transition-colors" />
                    </div>
                    <p className="text-[10px] font-black text-slate-800 group-hover:text-emerald-700 break-all leading-tight">
                      {p.patient_id}
                    </p>
                    <div className="flex gap-1.5 text-[9px] font-bold text-slate-400">
                      {p.dcm_count > 0 && <span className="bg-cyan-50 text-cyan-600 px-1.5 py-0.5 rounded">{p.dcm_count} DCM</span>}
                      {p.pdf_count > 0 && <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{p.pdf_count} PDF</span>}
                    </div>
                  </motion.button>
                ))}
              </div>
            )}

            {/* ── List View ─────────────────────────────────────────────── */}
            {!loadingPatients && viewMode === 'list' && (
              <div className="space-y-1">
                {/* List header */}
                <div className="grid grid-cols-12 px-4 py-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <span className="col-span-5">Patient ID</span>
                  <span className="col-span-2 text-center">DCM</span>
                  <span className="col-span-2 text-center">PDF</span>
                  <span className="col-span-2 text-right">Size</span>
                  <span className="col-span-1"></span>
                </div>
                {sorted.map((p, i) => (
                  <motion.button
                    key={p.patient_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.005, 0.2) }}
                    onClick={() => setSelectedPatient(p)}
                    className="grid grid-cols-12 w-full items-center px-4 py-2.5 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 border border-transparent transition-all text-left group"
                  >
                    <div className="col-span-5 flex items-center gap-2.5">
                      <Folder className="w-4 h-4 text-emerald-500 group-hover:text-emerald-600 flex-shrink-0" />
                      <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 truncate">{p.patient_id}</span>
                    </div>
                    <span className="col-span-2 text-center text-[11px] font-bold text-cyan-600">{p.dcm_count || '—'}</span>
                    <span className="col-span-2 text-center text-[11px] font-bold text-indigo-600">{p.pdf_count || '—'}</span>
                    <span className="col-span-2 text-right text-[11px] font-bold text-slate-400">{p.total_size > 0 ? fmtBytes(p.total_size) : '—'}</span>
                    <span className="col-span-1 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-4 h-4 text-emerald-500" />
                    </span>
                  </motion.button>
                ))}
              </div>
            )}

            {/* Load more */}
            {!loadingPatients && totalPatients > patients.length && !searchQuery && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => {
                    const nextPage = page + 1
                    setPage(nextPage)
                    fetchPatients(selectedMonth!, nextPage)
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-extrabold transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Load more ({fmtNum(totalPatients - patients.length)} remaining)
                </button>
              </div>
            )}

            {/* Empty state */}
            {!loadingPatients && !loadError && sorted.length === 0 && (
              <div className="py-20 text-center">
                <FolderOpen className="w-14 h-14 text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-black text-slate-400">
                  {searchQuery ? `No results for "${searchQuery}"` : 'No patient directories found'}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* LEVEL 3 — Dual-panel DICOM + PDF Viewer */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {selectedPatient && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <button
                onClick={() => setSelectedPatient(null)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Patient Directories
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Patient ID:</span>
                <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-500/20">
                  {selectedPatient.patient_id}
                </span>
              </div>
            </div>

            {/* File list inside patient folder */}
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold bg-slate-50 rounded-xl px-4 py-2 border border-slate-100">
              <File className="w-3.5 h-3.5" />
              <span>Contains:</span>
              {selectedPatient.dcm_name && (
                <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-700 font-bold">{selectedPatient.dcm_name}</span>
              )}
              {selectedPatient.pdf_name && (
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold">{selectedPatient.pdf_name}</span>
              )}
            </div>

            {/* Dual viewer */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* LEFT: DICOM */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xl flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">DICOM Image (.dcm)</h4>
                      <p className="text-[10px] font-bold text-slate-400">Radiological X-Ray</p>
                    </div>
                  </div>
                  {selectedPatient.dcm_url ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-200">
                      <CheckCircle className="w-3 h-3" /> Available
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black border border-amber-200">
                      <AlertTriangle className="w-3 h-3" /> Missing
                    </span>
                  )}
                </div>

                {selectedPatient.dcm_url ? (
                  <>
                    <DicomViewer fileUrl={selectedPatient.dcm_url} filename={selectedPatient.dcm_name || 'scan.dcm'} />
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">Filename:</span>
                        <span className="font-black text-slate-800 truncate max-w-[200px]">{selectedPatient.dcm_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">Total DCM files:</span>
                        <span className="font-black text-slate-800">{selectedPatient.dcm_count}</span>
                      </div>
                    </div>
                    <a href={selectedPatient.dcm_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs font-extrabold text-cyan-600 hover:text-cyan-700 transition-colors mt-1">
                      <ExternalLink className="w-3.5 h-3.5" /> Open in Azure Storage
                    </a>
                  </>
                ) : (
                  <div className="py-14 text-center">
                    <ImageIcon className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-400">No DICOM file available for this patient</p>
                  </div>
                )}
              </div>

              {/* RIGHT: PDF */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xl flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Diagnostic Report (.pdf)</h4>
                      <p className="text-[10px] font-bold text-slate-400">AI Medical Report</p>
                    </div>
                  </div>
                  {selectedPatient.pdf_url ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-200">
                      <CheckCircle className="w-3 h-3" /> Available
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black border border-amber-200">
                      <AlertTriangle className="w-3 h-3" /> Missing
                    </span>
                  )}
                </div>

                {selectedPatient.pdf_url ? (
                  <>
                    <PdfReportViewer fileUrl={selectedPatient.pdf_url} filename={selectedPatient.pdf_name || 'report.pdf'} />
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">Filename:</span>
                        <span className="font-black text-slate-800 truncate max-w-[200px]">{selectedPatient.pdf_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">Total PDF files:</span>
                        <span className="font-black text-slate-800">{selectedPatient.pdf_count}</span>
                      </div>
                    </div>
                    <a href={selectedPatient.pdf_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs font-extrabold text-indigo-600 hover:text-indigo-700 transition-colors mt-1">
                      <ExternalLink className="w-3.5 h-3.5" /> Open Diagnostic Report
                    </a>
                  </>
                ) : (
                  <div className="py-14 text-center">
                    <FileText className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-400">No PDF report available for this patient</p>
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}

      </div>
    </div>
  )
}
