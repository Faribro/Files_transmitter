'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Folder, FolderOpen, FileText, Image as ImageIcon, Search, ChevronRight,
  HardDrive, Download, ExternalLink, ArrowLeft, RefreshCw, CheckCircle,
  AlertTriangle, LayoutGrid, List, FolderPlus, Upload,
  X, Calendar, Building2, ShieldAlert, ShieldCheck, Flame
} from 'lucide-react'
import DicomViewer from './DicomViewer'
import PdfReportViewer from './PdfReportViewer'
import AsciiFireEffect from './AsciiFireEffect'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PatientFolder {
  patient_id: string
  date:       string
  facility:   string
  status:     'Suspected' | 'Not Suspected'
  dcm_count:  number
  pdf_count:  number
  total_size: number
  dcm_url:    string
  pdf_url:    string
  dcm_name:   string
  pdf_name:   string
}

interface MonthConfig {
  key: string
  label: string
  desc: string
}

interface DateItem {
  date: string
  total_patients: number
  suspected_count: number
  not_suspected_count: number
  facility_count: number
}

interface FacilityItem {
  facility: string
  total_patients: number
  suspected_count: number
  not_suspected_count: number
}

interface DriveExplorerProps {
  facility:        'AKROSS' | 'DAVO'
  initialMonth?:   string
  onMonthSelect?:  (month: string) => void
}

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

const MONTH_STATS: Record<string, Record<string, { dcm: number; pdf: number; patients: number }>> = {
  AKROSS: {
    '2026-01': { dcm: 7356,  pdf: 6098, patients: 7356 },
    '2026-02': { dcm: 27698, pdf: 3050, patients: 27698 },
    '2026-03': { dcm: 2900,  pdf: 750,  patients: 2900  },
    '2026-04': { dcm: 32,    pdf: 3010, patients: 3010  },
  },
  DAVO: {
    '2026-01': { dcm: 75,   pdf: 77,   patients: 152   },
    '2026-02': { dcm: 3751, pdf: 3678, patients: 3751  },
    '2026-03': { dcm: 4834, pdf: 4955, patients: 4834  },
    '2026-04': { dcm: 6655, pdf: 6809, patients: 6655  },
    '2026-05': { dcm: 9102, pdf: 9540, patients: 9102  },
    '2026-06': { dcm: 9319, pdf: 9574, patients: 9319  },
    '2026-07': { dcm: 184,  pdf: 165,  patients: 349   },
  },
}

function fmtNum(n: number) { return (n || 0).toLocaleString() }

export default function DriveExplorer({ facility, initialMonth, onMonthSelect }: DriveExplorerProps) {
  // Navigation hierarchy state
  const [selectedMonth,    setSelectedMonth]    = useState<string | null>(initialMonth || null)
  const [selectedDate,     setSelectedDate]     = useState<string | null>(null)
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null)
  const [selectedStatus,   setSelectedStatus]   = useState<'Suspected' | 'Not Suspected' | null>(null)
  const [selectedPatient,  setSelectedPatient]  = useState<PatientFolder | null>(null)

  // Data state
  const [dateList,         setDateList]         = useState<DateItem[]>([])
  const [facilityList,     setFacilityList]     = useState<FacilityItem[]>([])
  const [patientList,      setPatientList]      = useState<PatientFolder[]>([])
  const [totalPatients,    setTotalPatients]    = useState(0)
  
  const [loading,          setLoading]          = useState(false)
  const [searchQuery,      setSearchQuery]      = useState('')
  const [viewMode,         setViewMode]         = useState<'grid' | 'list'>('grid')
  const [isBurning,        setIsBurning]        = useState(false)
  const [page,             setPage]             = useState(1)
  const [hasMore,          setHasMore]          = useState(false)

  const months = FACILITY_MONTHS[facility] || FACILITY_MONTHS.AKROSS

  // Fire burn animation on month click
  const handleMonthClick = (monthKey: string) => {
    setIsBurning(true)
    setTimeout(() => {
      setSelectedMonth(monthKey)
      setSelectedDate(null)
      setSelectedFacility(null)
      setSelectedStatus(null)
      setSelectedPatient(null)
      setIsBurning(false)
      if (onMonthSelect) onMonthSelect(monthKey)
    }, 1800)
  }

  // 1. Fetch dates for selected month (Level 2)
  useEffect(() => {
    if (!selectedMonth) return
    setLoading(true)
    fetch(`/api/v1/patients?month=${encodeURIComponent(selectedMonth)}`)
      .then(res => res.json())
      .then(data => {
        setDateList(data.dates || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load dates:', err)
        setLoading(false)
      })
  }, [selectedMonth])

  // 2. Fetch facilities when date selected (Level 3)
  useEffect(() => {
    if (!selectedDate) {
      setFacilityList([])
      return
    }
    setLoading(true)
    fetch(`/api/v1/patients?date=${encodeURIComponent(selectedDate)}`)
      .then(res => res.json())
      .then(data => {
        setFacilityList(data.facilities || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load facilities:', err)
        setLoading(false)
      })
  }, [selectedDate])

  // 3. Fetch patients when status category selected (Level 5)
  const fetchPatients = useCallback((dateStr: string, facStr: string, statusStr: string, pg: number) => {
    setLoading(true)
    fetch(
      `/api/v1/patients?date=${encodeURIComponent(dateStr)}&facility=${encodeURIComponent(facStr)}&status=${encodeURIComponent(statusStr)}&page=${pg}&limit=60`
    )
      .then(res => res.json())
      .then(data => {
        const batch = data.patients || []
        if (pg === 1) {
          setPatientList(batch)
        } else {
          setPatientList(prev => [...prev, ...batch])
        }
        setTotalPatients(data.total || batch.length)
        setHasMore(data.has_more || false)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load patient list:', err)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!selectedDate || !selectedFacility || !selectedStatus) {
      setPatientList([])
      return
    }
    setPage(1)
    fetchPatients(selectedDate, selectedFacility, selectedStatus, 1)
  }, [selectedDate, selectedFacility, selectedStatus, fetchPatients])

  const filteredPatients = patientList.filter(p =>
    p.patient_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const monthStatObj = selectedMonth ? MONTH_STATS[facility]?.[selectedMonth] : null

  return (
    <div className="bg-white/80 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-2xl shadow-indigo-500/10 overflow-hidden">
      
      {/* ── FIRE BURN ANIMATION EFFECT ─────────────────────────────────── */}
      <AnimatePresence>
        {isBurning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-6 pt-4">
            <AsciiFireEffect durationMs={1800} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BREADCRUMB TOOLBAR ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 overflow-x-auto flex-1 min-w-0">
          <HardDrive className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          
          <button
            onClick={() => { setSelectedMonth(null); setSelectedDate(null); setSelectedFacility(null); setSelectedStatus(null); setSelectedPatient(null) }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
              !selectedMonth ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            {facility}
          </button>

          {selectedMonth && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
              <button
                onClick={() => { setSelectedDate(null); setSelectedFacility(null); setSelectedStatus(null); setSelectedPatient(null) }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                  !selectedDate ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-200 text-slate-600'
                }`}
              >
                {selectedMonth}
              </button>
            </>
          )}

          {selectedDate && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
              <button
                onClick={() => { setSelectedFacility(null); setSelectedStatus(null); setSelectedPatient(null) }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                  !selectedFacility ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-200 text-slate-600'
                }`}
              >
                {selectedDate}
              </button>
            </>
          )}

          {selectedFacility && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
              <button
                onClick={() => { setSelectedStatus(null); setSelectedPatient(null) }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                  !selectedStatus ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-200 text-slate-600'
                }`}
              >
                {selectedFacility}
              </button>
            </>
          )}

          {selectedStatus && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
              <button
                onClick={() => setSelectedPatient(null)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                  !selectedPatient
                    ? selectedStatus === 'Suspected' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                    : 'hover:bg-slate-200 text-slate-600'
                }`}
              >
                {selectedStatus === 'Suspected' ? '🔴 Suspected' : '🟢 Not Suspected'}
              </button>
            </>
          )}

          {selectedPatient && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
              <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-black shadow-sm truncate">
                {selectedPatient.patient_id}
              </span>
            </>
          )}
        </div>

        {/* View toggle & search */}
        {selectedStatus && !selectedPatient && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search patient ID…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-white text-slate-900 text-[11px] font-bold pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-44"
              />
            </div>
            <div className="flex items-center rounded-xl border border-slate-200 overflow-hidden">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500'}`}>
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500'}`}>
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-6">

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* LEVEL 1 — MONTH DIRECTORIES */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {!selectedMonth && (
          <div className="space-y-4">
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
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* LEVEL 2 — DATE DIRECTORIES */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {selectedMonth && !selectedDate && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedMonth(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Months
                </button>
                <p className="text-xs font-bold text-slate-600">
                  {fmtNum(dateList.reduce((a, b) => a + b.total_patients, 0))} patient folders · showing {fmtNum(dateList.length)} date directories
                  {monthStatObj && ` · ${fmtNum(monthStatObj.dcm)} DCM · ${fmtNum(monthStatObj.pdf)} PDF`}
                </p>
              </div>
              <span className="text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-xl self-start sm:self-auto">
                Month: {selectedMonth}
              </span>
            </div>

            {loading ? (
              <div className="py-16 text-center">
                <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-400">Loading Date Directories…</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {dateList.map((d) => (
                  <motion.button
                    key={d.date}
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedDate(d.date)}
                    className="group flex flex-col items-start p-4 rounded-2xl bg-white hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 border border-slate-200/80 hover:border-indigo-300 shadow-sm hover:shadow-md transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3 group-hover:bg-indigo-600 transition-colors">
                      <Calendar className="w-5 h-5 text-indigo-600 group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-700">{d.date}</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">{fmtNum(d.total_patients)} patients</p>
                    <div className="flex gap-2 text-[9px] font-bold mt-2">
                      <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded">🔴 {d.suspected_count}</span>
                      <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">🟢 {d.not_suspected_count}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* LEVEL 3 — FACILITY DIRECTORIES */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {selectedDate && !selectedFacility && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedDate(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Dates
                </button>
                <p className="text-xs font-bold text-slate-600">
                  {fmtNum(facilityList.reduce((a, b) => a + b.total_patients, 0))} patient folders · showing {fmtNum(facilityList.length)} facilities
                </p>
              </div>
              <span className="text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-xl self-start sm:self-auto">
                Date: {selectedDate}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {facilityList.map(f => (
                <motion.button
                  key={f.facility}
                  whileHover={{ scale: 1.03 }}
                  onClick={() => setSelectedFacility(f.facility)}
                  className="group flex flex-col p-5 rounded-2xl bg-white hover:bg-sky-50 border border-slate-200/80 hover:border-sky-300 shadow-sm hover:shadow-md transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center mb-3 group-hover:bg-sky-600 transition-colors">
                    <Building2 className="w-5 h-5 text-sky-600 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-sky-700">{f.facility}</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">{fmtNum(f.total_patients)} patients</p>
                  <div className="flex gap-2 text-[9px] font-bold mt-2">
                    <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded">🔴 {f.suspected_count} Suspected</span>
                    <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">🟢 {f.not_suspected_count} Normal</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* LEVEL 4 — CLINICAL STATUS CATEGORY (Suspected vs Not Suspected) */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {selectedDate && selectedFacility && !selectedStatus && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <button onClick={() => setSelectedFacility(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Facilities
              </button>
              <p className="text-xs font-bold text-slate-600">
                {selectedDate} · {selectedFacility}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* 🔴 SUSPECTED FOLDER */}
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                onClick={() => setSelectedStatus('Suspected')}
                className="flex items-center gap-4 p-6 rounded-3xl bg-gradient-to-br from-red-50 to-amber-50 border border-red-200 hover:border-red-400 shadow-lg shadow-red-500/10 text-left transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-md shadow-red-500/30 group-hover:scale-110 transition-transform">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 group-hover:text-red-600">🔴 Suspected (TB / Lesion Detected)</h3>
                  <p className="text-xs font-bold text-slate-500 mt-1">High-priority radiological findings requiring medical follow-up</p>
                </div>
              </motion.button>

              {/* 🟢 NOT SUSPECTED FOLDER */}
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                onClick={() => setSelectedStatus('Not Suspected')}
                className="flex items-center gap-4 p-6 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 hover:border-emerald-400 shadow-lg shadow-emerald-500/10 text-left transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 group-hover:text-emerald-600">🟢 Not Suspected (Normal Examination)</h3>
                  <p className="text-xs font-bold text-slate-500 mt-1">Unremarkable radiological examination with no lesions detected</p>
                </div>
              </motion.button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* LEVEL 5 — PATIENT STUDY FOLDERS */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {selectedDate && selectedFacility && selectedStatus && !selectedPatient && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedStatus(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Categories
                </button>
                <p className="text-xs font-bold text-slate-600">
                  {fmtNum(totalPatients)} patient folders · showing {fmtNum(filteredPatients.length)}
                </p>
              </div>
              <p className="text-xs font-bold text-slate-500">
                {selectedDate} · {selectedFacility} · {selectedStatus === 'Suspected' ? '🔴 Suspected' : '🟢 Not Suspected'}
              </p>
            </div>

            {loading && patientList.length === 0 ? (
              <div className="py-16 text-center">
                <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-400">Loading Patient Folders…</p>
              </div>
            ) : (
              <>
                <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3' : 'space-y-1'}>
                  {filteredPatients.map((p) => (
                    <motion.button
                      key={p.patient_id}
                      whileHover={{ scale: 1.03 }}
                      onClick={() => setSelectedPatient(p)}
                      className={`group flex ${viewMode === 'grid' ? 'flex-col items-center p-4 text-center' : 'items-center justify-between px-4 py-2.5 text-left'} rounded-2xl bg-white border border-slate-100 hover:border-indigo-300 shadow-sm hover:shadow-md transition-all`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Folder className={`w-5 h-5 ${p.status === 'Suspected' ? 'text-red-500' : 'text-emerald-500'}`} />
                        <span className="text-xs font-black text-slate-800 break-all">{p.patient_id}</span>
                      </div>
                      <div className="flex gap-1.5 text-[9px] font-bold text-slate-400 mt-1">
                        <span className="bg-cyan-50 text-cyan-600 px-1.5 py-0.5 rounded">1 DCM</span>
                        <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">1 PDF</span>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={() => {
                        const nextPage = page + 1
                        setPage(nextPage)
                        fetchPatients(selectedDate, selectedFacility, selectedStatus, nextPage)
                      }}
                      className="px-5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black transition-colors"
                    >
                      Load More Patient Folders ({fmtNum(totalPatients - patientList.length)} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* LEVEL 6 — DUAL DICOM + PDF STUDY VIEWER */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {selectedPatient && (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <button onClick={() => setSelectedPatient(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Patient Folders
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Patient ID:</span>
                <span className={`px-3 py-1 rounded-xl text-white text-xs font-black ${selectedPatient.status === 'Suspected' ? 'bg-red-500' : 'bg-emerald-500'}`}>
                  {selectedPatient.patient_id} ({selectedPatient.status})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* DICOM SCAN CARD */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xl flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">DICOM Image Scan (.dcm)</h4>
                      <p className="text-[10px] font-bold text-slate-400">Radiological X-Ray</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-200">
                    <CheckCircle className="w-3 h-3 inline mr-1" /> Available
                  </span>
                </div>
                <DicomViewer fileUrl={selectedPatient.dcm_url} filename={selectedPatient.dcm_name} />
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex justify-between">
                  <span className="text-slate-500 font-bold">Filename:</span>
                  <span className="font-black text-slate-800 truncate">{selectedPatient.dcm_name}</span>
                </div>
              </div>

              {/* PDF DIAGNOSTIC REPORT CARD */}
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
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-200">
                    <CheckCircle className="w-3 h-3 inline mr-1" /> Available
                  </span>
                </div>
                <PdfReportViewer fileUrl={selectedPatient.pdf_url} filename={selectedPatient.pdf_name} />
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex justify-between">
                  <span className="text-slate-500 font-bold">Filename:</span>
                  <span className="font-black text-slate-800 truncate">{selectedPatient.pdf_name}</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
