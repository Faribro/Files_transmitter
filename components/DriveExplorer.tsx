'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Folder, FolderOpen, FileText, Image as ImageIcon, Search, ChevronRight,
  HardDrive, Download, ExternalLink, ArrowLeft, RefreshCw, CheckCircle,
  AlertTriangle, LayoutGrid, List, FolderPlus, Upload,
  X, Calendar, Building2, ShieldAlert, ShieldCheck, Flame, Filter
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

const generateAllMonths = (): MonthConfig[] => {
  const months: MonthConfig[] = []
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthFullNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  
  ;[2026, 2027].forEach(year => {
    monthNames.forEach((m, idx) => {
      const mm = String(idx + 1).padStart(2, '0')
      months.push({
        key: `${year}-${mm}`,
        label: `${m} ${year}`,
        desc: `${monthFullNames[idx]} ${year}`
      })
    })
  })

  return months
}

const ALL_24_MONTHS = generateAllMonths()

const FACILITY_MONTHS: Record<string, MonthConfig[]> = {
  AKROSS: ALL_24_MONTHS,
  DAVO: ALL_24_MONTHS,
}

import { HIERARCHY_DATA } from '@/app/api/v1/patients/patientsData'

// Compute month stats dynamically from HIERARCHY_DATA to ensure 100% unified numbers across all tabs
function getDynamicMonthStats(parentFacility: string, monthKey: string) {
  const facData = HIERARCHY_DATA[parentFacility]?.[monthKey] || {}
  let totalPatients = 0
  let totalDcm = 0
  let totalPdf = 0

  Object.values(facData).forEach((dateObj: any) => {
    Object.values(dateObj).forEach((subfacObj: any) => {
      const suspected = subfacObj?.['Suspected'] || []
      const notSuspected = subfacObj?.['Not Suspected'] || []
      const dcmTotal = subfacObj?.['dcm_total'] ?? (suspected.length + notSuspected.length)
      const pdfTotal = subfacObj?.['pdf_total'] ?? (suspected.length + notSuspected.length)
      
      totalPatients += (subfacObj?.['total_count'] ?? (suspected.length + notSuspected.length))
      totalDcm += dcmTotal
      totalPdf += pdfTotal
    })
  })

  return {
    dcm: totalDcm,
    pdf: totalPdf,
    patients: totalPatients
  }
}

function fmtNum(n: number) { return (n || 0).toLocaleString() }

export default function DriveExplorer({ facility, initialMonth, onMonthSelect }: DriveExplorerProps) {
  // Navigation hierarchy state
  const [selectedMonth,    setSelectedMonth]    = useState<string | null>(initialMonth || null)
  const [selectedDate,     setSelectedDate]     = useState<string | null>(null)
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null)
  const [statusFilter,     setStatusFilter]     = useState<'all' | 'Suspected' | 'Not Suspected'>('all')
  const [selectedPatient,  setSelectedPatient]  = useState<PatientFolder | null>(null)

  // Data state
  const [dateList,         setDateList]         = useState<DateItem[]>([])
  const [facilityList,     setFacilityList]     = useState<FacilityItem[]>([])
  const [patientList,      setPatientList]      = useState<PatientFolder[]>([])
  const [totalPatients,    setTotalPatients]    = useState(0)
  const [suspectedCount,   setSuspectedCount]   = useState(0)
  const [notSuspectedCount, setNotSuspectedCount] = useState(0)
  
  const [loading,          setLoading]          = useState(false)
  const [searchQuery,      setSearchQuery]      = useState('')
  const [viewMode,         setViewMode]         = useState<'grid' | 'list'>('grid')
  const [isBurning,        setIsBurning]        = useState(false)
  const [page,             setPage]             = useState(1)
  const [hasMore,          setHasMore]          = useState(false)

  const months = FACILITY_MONTHS[facility] || FACILITY_MONTHS.AKROSS

  // Reset navigation when switching main facility tabs (AKROSS vs DAVO)
  useEffect(() => {
    setSelectedMonth(initialMonth || null)
    setSelectedDate(null)
    setSelectedFacility(null)
    setStatusFilter('all')
    setSelectedPatient(null)
  }, [facility, initialMonth])

  // Fire burn animation on month click
  const handleMonthClick = (monthKey: string) => {
    setIsBurning(true)
    setTimeout(() => {
      setSelectedMonth(monthKey)
      setSelectedDate(null)
      setSelectedFacility(null)
      setStatusFilter('all')
      setSelectedPatient(null)
      setIsBurning(false)
      if (onMonthSelect) onMonthSelect(monthKey)
    }, 1800)
  }

  // 1. Fetch dates for selected month under THIS parent facility
  useEffect(() => {
    if (!selectedMonth) return
    setLoading(true)
    fetch(`/api/v1/patients?facility=${encodeURIComponent(facility)}&month=${encodeURIComponent(selectedMonth)}`)
      .then(res => res.json())
      .then(data => {
        setDateList(data.dates || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load dates:', err)
        setLoading(false)
      })
  }, [facility, selectedMonth])

  // 2. Fetch facilities when date selected under THIS parent facility
  useEffect(() => {
    if (!selectedDate || !selectedMonth) {
      setFacilityList([])
      return
    }
    setLoading(true)
    fetch(`/api/v1/patients?facility=${encodeURIComponent(facility)}&month=${encodeURIComponent(selectedMonth)}&date=${encodeURIComponent(selectedDate)}`)
      .then(res => res.json())
      .then(data => {
        setFacilityList(data.facilities || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load facilities:', err)
        setLoading(false)
      })
  }, [facility, selectedMonth, selectedDate])

  // 3. Fetch patient study folders directly under facility (Level 4)
  const fetchPatients = useCallback((dateStr: string, facStr: string, filterStr: string, pg: number) => {
    if (!selectedMonth) return
    setLoading(true)
    fetch(
      `/api/v1/patients?facility=${encodeURIComponent(facility)}&month=${encodeURIComponent(selectedMonth)}&date=${encodeURIComponent(dateStr)}&subfacility=${encodeURIComponent(facStr)}&status=${encodeURIComponent(filterStr)}&page=${pg}&limit=300`
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
        if (data.suspected_count !== undefined) setSuspectedCount(data.suspected_count)
        if (data.not_suspected_count !== undefined) setNotSuspectedCount(data.not_suspected_count)
        setHasMore(data.has_more || false)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load patient list:', err)
        setLoading(false)
      })
  }, [facility, selectedMonth])

  useEffect(() => {
    if (!selectedMonth || !selectedDate || !selectedFacility) {
      setPatientList([])
      return
    }
    setPage(1)
    fetchPatients(selectedDate, selectedFacility, statusFilter, 1)
  }, [selectedMonth, selectedDate, selectedFacility, statusFilter, fetchPatients])

  const filteredPatients = patientList.filter(p =>
    p.patient_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const monthStatObj = selectedMonth ? getDynamicMonthStats(facility, selectedMonth) : null
  const selectedFacilityObj = facilityList.find(f => f.facility === selectedFacility)

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
            onClick={() => { setSelectedMonth(null); setSelectedDate(null); setSelectedFacility(null); setSelectedPatient(null) }}
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
                onClick={() => { setSelectedDate(null); setSelectedFacility(null); setSelectedPatient(null) }}
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
                onClick={() => { setSelectedFacility(null); setSelectedPatient(null) }}
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
                onClick={() => setSelectedPatient(null)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                  !selectedPatient ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-200 text-slate-600'
                }`}
              >
                {selectedFacility}
              </button>
            </>
          )}

          {selectedPatient && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
              <span className={`px-2.5 py-1 rounded-lg text-white text-[11px] font-black shadow-sm truncate ${selectedPatient.status === 'Suspected' ? 'bg-red-500' : 'bg-emerald-500'}`}>
                {selectedPatient.patient_id}
              </span>
            </>
          )}
        </div>

        {/* View toggle & search */}
        {selectedFacility && !selectedPatient && (
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
                const stats = getDynamicMonthStats(facility, mf.key)
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
                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3 group-hover:bg-indigo-600 transition-colors shadow-sm">
                      <Folder className="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="text-xl font-black tracking-tight text-slate-900 group-hover:text-indigo-700">{mf.label}</h3>
                    {stats && (
                      <div className="mt-2 space-y-1">
                        <p className="text-sm font-extrabold text-indigo-950">{fmtNum(stats.patients)} patients</p>
                        <p className="text-xs font-bold text-slate-600 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200">{fmtNum(stats.dcm)} DCM · {fmtNum(stats.pdf)} PDF</p>
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
        {/* LEVEL 4 — PATIENT STUDY FOLDERS DIRECTLY WITH COMIC FILTER BAR */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {selectedDate && selectedFacility && !selectedPatient && (
          <div className="space-y-4">
            
            {/* Header & Back Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedFacility(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Facilities
                </button>
                <p className="text-xs font-bold text-slate-600">
                  {fmtNum(totalPatients)} patient folders · showing {fmtNum(searchQuery.trim() ? filteredPatients.length : totalPatients)}
                </p>
              </div>
              <span className="text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-xl self-start sm:self-auto">
                {selectedDate} · {selectedFacility}
              </span>
            </div>

            {/* ── COMIC VIBRANT STATUS FILTER BAR ───────────────────────── */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
              <span className="text-xs font-black text-slate-400 flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>

              {/* ALL PATIENTS FILTER */}
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 scale-105'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Patients ({fmtNum(suspectedCount + notSuspectedCount)})
              </button>

              {/* 🔴 COMIC RED SUSPECTED FILTER */}
              <button
                onClick={() => setStatusFilter('Suspected')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black transition-all ${
                  statusFilter === 'Suspected'
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/30 scale-105 border-2 border-red-400'
                    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                🔴 Suspected ({fmtNum(suspectedCount)})
              </button>

              {/* 🟢 COMIC GREEN NOT SUSPECTED FILTER */}
              <button
                onClick={() => setStatusFilter('Not Suspected')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black transition-all ${
                  statusFilter === 'Not Suspected'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30 scale-105 border-2 border-emerald-400'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-white" />
                🟢 Not Suspected ({fmtNum(notSuspectedCount)})
              </button>
            </div>

            {loading && patientList.length === 0 ? (
              <div className="py-16 text-center">
                <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-400">Loading Patient Folders…</p>
              </div>
            ) : (
              <>
                <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3' : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'}>
                  {filteredPatients.map((p) => {
                    const isSuspect = p.status === 'Suspected'
                    return (
                      <motion.button
                        key={p.patient_id}
                        whileHover={{ scale: 1.04, y: -2 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setSelectedPatient(p)}
                        className={`group flex ${viewMode === 'grid' ? 'flex-col items-center p-4 text-center' : 'items-center justify-between px-4 py-3 text-left'} rounded-2xl border-2 transition-all shadow-sm hover:shadow-xl ${
                          isSuspect
                            ? 'bg-gradient-to-br from-red-500 to-rose-600 border-red-600 text-white shadow-red-500/20 hover:border-red-400'
                            : 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-600 text-white shadow-emerald-500/20 hover:border-emerald-400'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Folder className="w-5 h-5 text-white/90 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-black tracking-tight break-all text-white drop-shadow-sm">
                            {p.patient_id}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide uppercase ${
                            isSuspect ? 'bg-white/20 text-white border border-white/30' : 'bg-white/20 text-white border border-white/30'
                          }`}>
                            {isSuspect ? '🔴 Suspected' : '🟢 Normal'}
                          </span>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>

                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={() => {
                        const nextPage = page + 1
                        setPage(nextPage)
                        fetchPatients(selectedDate, selectedFacility, statusFilter, nextPage)
                      }}
                      className="px-5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black transition-colors"
                    >
                      Load More Patient Folders ({fmtNum(totalPatients - patientList.length)} remaining)
                    </button>
                  </div>
                )}

                {hasMore && (
                  <div className="pt-6 text-center">
                    <button
                      onClick={() => {
                        const nextPage = page + 1
                        setPage(nextPage)
                        fetchPatients(selectedDate!, selectedFacility!, statusFilter, nextPage)
                      }}
                      disabled={loading}
                      className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 mx-auto disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Loading next batch…
                        </>
                      ) : (
                        <>
                          Load More Patient Folders (showing {filteredPatients.length} of {totalPatients})
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* LEVEL 5 — DUAL DICOM + PDF STUDY VIEWER */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {selectedPatient && (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <button onClick={() => setSelectedPatient(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors">
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
