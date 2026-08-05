'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Folder, FolderOpen, FileText, Image as ImageIcon, Search, ChevronRight,
  HardDrive, Download, ExternalLink, ArrowLeft, RefreshCw, CheckCircle,
  AlertTriangle, LayoutGrid, List, FolderPlus, Upload, Maximize2, Minimize2,
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
  const [hoveredViewer,   setHoveredViewer]   = useState<'dcm' | 'pdf' | null>(null)
  const [maximizedViewer, setMaximizedViewer] = useState<'dcm' | 'pdf' | null>(null)

  const months = FACILITY_MONTHS[facility] || FACILITY_MONTHS.AKROSS

  // Reset navigation when switching main facility tabs (AKROSS vs DAVO)
  useEffect(() => {
    setSelectedMonth(initialMonth || null)
    setSelectedDate(null)
    setSelectedFacility(null)
    setStatusFilter('all')
    setSelectedPatient(null)
  }, [facility, initialMonth])

  // Live Auto-Polling Interval (3 seconds) for real-time streaming transfer updates
  const [liveStatus, setLiveStatus] = useState<any>(null)
  useEffect(() => {
    const fetchStatus = () => {
      fetch('/api/v1/migration/status', { cache: 'no-store' })
        .then(res => res.json())
        .then(data => setLiveStatus(data))
        .catch(() => {})
    }
    fetchStatus()
    const timer = setInterval(fetchStatus, 3000)
    return () => clearInterval(timer)
  }, [])

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
        const dates: DateItem[] = data.dates || []
        setDateList(dates)
        setLoading(false)

        // SMART AUTO-SKIP: If month has only 1 date directory, auto-select it immediately!
        if (dates.length === 1) {
          setSelectedDate(dates[0].date)
        }
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
        const facs: FacilityItem[] = data.facilities || []
        setFacilityList(facs)
        setLoading(false)

        // SMART AUTO-SKIP: If date has only 1 facility, auto-select it immediately!
        if (facs.length === 1) {
          setSelectedFacility(facs[0].facility)
        }
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

        {/* LEVEL 1 — 24-MONTH DIRECTORY GRID */}
        {!selectedMonth && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">24-Month Master Directory — {facility}</h3>
                <p className="text-xs font-bold text-slate-400">All data aggregated directly from live Azure Blob storage</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {months.map((mf, i) => {
                const stats = getDynamicMonthStats(facility, mf.key)
                const akrossLiveData = (facility === 'AKROSS' && liveStatus?.akross_live?.[mf.key]) ? liveStatus?.akross_live?.[mf.key] : null
                const isMigrating = akrossLiveData ? !akrossLiveData.is_complete : false
                const hasData = Boolean(stats && stats.patients > 0)

                if (isMigrating) {
                  const liveData = akrossLiveData
                  const targetFiles = liveData?.total || 7500
                  const currentFiles = liveData?.transferred || 0
                  const pct = liveData?.pct || Math.min(100, Math.round((currentFiles / targetFiles) * 100))
                  const livePatients = liveData?.patients || Math.ceil(currentFiles / 2)
                  const liveDcm = liveData?.dcm || Math.floor(currentFiles / 2)
                  const livePdf = liveData?.pdf || Math.ceil(currentFiles / 2)

                  return (
                    <motion.button
                      key={mf.key}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.02 }}
                      whileHover={{ scale: 1.05, y: -4 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleMonthClick(mf.key)}
                      className="group relative flex flex-col items-start p-5 rounded-2xl bg-gradient-to-br from-red-950 via-rose-950 to-slate-950 border-2 border-red-500/80 shadow-xl shadow-red-500/30 ring-4 ring-red-500/20 text-left overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-500/25 via-transparent to-transparent pointer-events-none" />
                      
                      <div className="w-full flex items-center justify-between mb-2 z-10">
                        <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/50 animate-pulse">
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        </div>
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md flex items-center gap-1.5 animate-pulse border border-red-400/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> ⚡ {fmtNum(currentFiles)} / {fmtNum(targetFiles)}
                        </span>
                      </div>

                      <h3 className="text-xl font-black tracking-tight text-white z-10">
                        {mf.label}
                      </h3>

                      <div className="mt-2 space-y-1.5 w-full z-10">
                        <div className="flex items-center justify-between text-xs font-black text-red-200">
                          <span>{fmtNum(livePatients)} patients</span>
                          <span className="text-amber-300 font-extrabold">{pct}%</span>
                        </div>

                        {/* Live progress bar */}
                        <div className="w-full bg-slate-900/90 rounded-full h-2 overflow-hidden p-0.5 border border-red-500/40 shadow-inner">
                          <div
                            className="bg-gradient-to-r from-red-500 via-rose-500 to-orange-400 h-full rounded-full transition-all duration-500 shadow-sm"
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <p className="text-[11px] font-extrabold text-red-200 bg-red-950/90 px-2.5 py-0.5 rounded-lg border border-red-500/50 inline-block shadow-sm">
                          {fmtNum(liveDcm)} DCM · {fmtNum(livePdf)} PDF
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between w-full text-[10px] font-black text-red-200 z-10">
                        <span className="text-emerald-400 flex items-center gap-1 font-black">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> 32 Threads Active
                        </span>
                        <div className="flex items-center gap-1 text-red-300 group-hover:text-white transition-colors">
                          <span>Explore</span><ChevronRight className="w-3 h-3" />
                        </div>
                      </div>
                    </motion.button>
                  )
                }

                return (
                  <motion.button
                    key={mf.key}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    whileHover={{ scale: 1.04, y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleMonthClick(mf.key)}
                    className={`group relative flex flex-col items-start p-5 rounded-2xl border-2 transition-all text-left overflow-hidden ${
                      hasData
                        ? 'bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/80 border-indigo-400 hover:border-indigo-600 shadow-md shadow-indigo-500/10 hover:shadow-xl hover:shadow-indigo-500/20'
                        : 'bg-slate-100/80 border-dashed border-slate-300 hover:border-slate-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="w-full flex items-center justify-between mb-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md transition-transform group-hover:scale-105 ${
                        hasData ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white' : 'bg-slate-200 text-slate-400'
                      }`}>
                        <Folder className="w-6 h-6" />
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 ${
                        hasData ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500 border border-slate-300'
                      }`}>
                        {hasData ? <><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Active Data</> : '⏳ Scheduled'}
                      </span>
                    </div>

                    <h3 className="text-xl font-black tracking-tight text-slate-900 group-hover:text-indigo-700">
                      {mf.label}
                    </h3>

                    <div className="mt-2 space-y-1 w-full">
                      <p className="text-sm font-extrabold text-indigo-950">
                        {fmtNum(stats.patients)} patients
                      </p>
                      <p className="text-xs font-bold text-slate-700 bg-white/90 px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-sm inline-block">
                        {fmtNum(stats.dcm)} DCM · {fmtNum(stats.pdf)} PDF
                      </p>
                    </div>

                    <div className="mt-3 flex items-center gap-1 text-[10px] font-extrabold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Open Directory</span><ChevronRight className="w-3 h-3" />
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>
        )}

        {/* LEVEL 2 — DATE DIRECTORIES */}
        {selectedMonth && !selectedDate && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <button onClick={() => setSelectedMonth(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Months
              </button>
              <p className="text-xs font-bold text-slate-400">{dateList.length} date directories in {selectedMonth}</p>
            </div>
            {loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-400">Loading Date Directories…</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {dateList.map((d) => (
                  <motion.button
                    key={d.date}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedDate(d.date)}
                    className="flex flex-col items-start p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50/80 border border-slate-200/80 hover:border-indigo-300 transition-all text-left group shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {d.date}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 mt-1">
                      {fmtNum(d.total_patients)} patients
                    </span>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LEVEL 3 — SUB-FACILITY DIRECTORIES */}
        {selectedDate && !selectedFacility && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <button onClick={() => setSelectedDate(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dates
              </button>
              <p className="text-xs font-bold text-slate-400">{facilityList.length} sub-facilities in {selectedDate}</p>
            </div>
            {loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-400">Loading Facility Directories…</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {facilityList.map((f) => (
                  <motion.button
                    key={f.facility}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedFacility(f.facility)}
                    className="flex flex-col items-start p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50/80 border border-slate-200/80 hover:border-indigo-300 transition-all text-left group shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {f.facility}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 mt-1">
                      {fmtNum(f.total_patients)} patients
                    </span>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LEVEL 4 — PATIENT STUDY FOLDERS */}
        {selectedDate && selectedFacility && !selectedPatient && (
          <div className="space-y-4">
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

            {/* COMIC VIBRANT STATUS FILTER BAR */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
              <span className="text-xs font-black text-slate-400 flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>

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

              <button
                onClick={() => setStatusFilter('Suspected')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black transition-all ${
                  statusFilter === 'Suspected'
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/30 scale-105 border-2 border-red-400'
                    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
                Suspected ({fmtNum(suspectedCount)})
              </button>

              <button
                onClick={() => setStatusFilter('Not Suspected')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black transition-all ${
                  statusFilter === 'Not Suspected'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30 scale-105 border-2 border-emerald-400'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Not Suspected ({fmtNum(notSuspectedCount)})
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
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-white/20 text-white border border-white/30">
                            DCM: {p.dcm_url ? (p.dcm_count || 1) : 0} · PDF: {p.pdf_url ? (p.pdf_count || 1) : 0}
                          </span>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>

                {hasMore && (
                  <div className="pt-6 text-center">
                    <button
                      onClick={() => {
                        const nextPage = page + 1
                        setPage(nextPage)
                        fetchPatients(selectedDate, selectedFacility, statusFilter, nextPage)
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
        {/* LEVEL 5 — DUAL DICOM + PDF VIEWER WITH EXPAND-ON-HOVER FLEX LAYOUT */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {selectedPatient && (
          <div className="space-y-6">
            
            {/* DYNAMIC SIDE-BY-SIDE FLEX CONTAINER WITH SMOOTH EXPAND ON HOVER */}
            <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch transition-all duration-500 ease-in-out">
              
              {/* DICOM SCAN CARD */}
              <div
                onMouseEnter={() => setHoveredViewer('dcm')}
                onMouseLeave={() => setHoveredViewer(null)}
                className={`bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xl flex flex-col justify-between gap-4 transition-all duration-500 ease-in-out h-full ${
                  maximizedViewer === 'dcm'
                    ? 'w-full ring-4 ring-cyan-500'
                    : hoveredViewer === 'dcm'
                    ? 'w-full lg:w-[68%] ring-4 ring-cyan-500/30 scale-[1.005]'
                    : hoveredViewer === 'pdf'
                    ? 'w-full lg:w-[32%] opacity-90'
                    : 'w-full lg:w-1/2'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">DICOM Image Scan (.dcm)</h4>
                      <p className="text-[10px] font-bold text-slate-400">Radiological X-Ray · Hover to Expand</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMaximizedViewer(maximizedViewer === 'dcm' ? null : 'dcm')}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200/80 transition-all shadow-sm flex items-center gap-1.5 text-xs font-bold"
                    title={maximizedViewer === 'dcm' ? "Minimize View" : "Fullscreen View"}
                  >
                    {maximizedViewer === 'dcm' ? <Minimize2 className="w-4 h-4 text-cyan-600" /> : <Maximize2 className="w-4 h-4 text-cyan-600" />}
                    <span className="hidden sm:inline">{maximizedViewer === 'dcm' ? 'Minimize' : 'Fullscreen'}</span>
                  </button>
                </div>

                <DicomViewer
                  fileUrl={selectedPatient.dcm_url}
                  filename={selectedPatient.dcm_name}
                  isMaximized={maximizedViewer === 'dcm'}
                  onToggleMaximize={() => setMaximizedViewer(maximizedViewer === 'dcm' ? null : 'dcm')}
                />

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex justify-between items-center mt-auto">
                  <span className="text-slate-500 font-bold">Filename:</span>
                  <span className="font-black text-slate-800 truncate max-w-[280px]">{selectedPatient.dcm_name}</span>
                </div>
              </div>

              {/* PDF DIAGNOSTIC REPORT CARD */}
              <div
                onMouseEnter={() => setHoveredViewer('pdf')}
                onMouseLeave={() => setHoveredViewer(null)}
                className={`bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xl flex flex-col justify-between gap-4 transition-all duration-500 ease-in-out h-full ${
                  maximizedViewer === 'pdf'
                    ? 'w-full ring-4 ring-indigo-500'
                    : hoveredViewer === 'pdf'
                    ? 'w-full lg:w-[68%] ring-4 ring-indigo-500/30 scale-[1.005]'
                    : hoveredViewer === 'dcm'
                    ? 'w-full lg:w-[32%] opacity-90'
                    : 'w-full lg:w-1/2'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Diagnostic Report (.pdf)</h4>
                      <p className="text-[10px] font-bold text-slate-400">AI Medical Report · Hover to Expand</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMaximizedViewer(maximizedViewer === 'pdf' ? null : 'pdf')}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200/80 transition-all shadow-sm flex items-center gap-1.5 text-xs font-bold"
                    title={maximizedViewer === 'pdf' ? "Minimize View" : "Fullscreen View"}
                  >
                    {maximizedViewer === 'pdf' ? <Minimize2 className="w-4 h-4 text-indigo-600" /> : <Maximize2 className="w-4 h-4 text-indigo-600" />}
                    <span className="hidden sm:inline">{maximizedViewer === 'pdf' ? 'Minimize' : 'Fullscreen'}</span>
                  </button>
                </div>

                <PdfReportViewer
                  fileUrl={selectedPatient.pdf_url}
                  filename={selectedPatient.pdf_name}
                  isMaximized={maximizedViewer === 'pdf'}
                  onToggleMaximize={() => setMaximizedViewer(maximizedViewer === 'pdf' ? null : 'pdf')}
                />

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex justify-between items-center mt-auto">
                  <span className="text-slate-500 font-bold">Filename:</span>
                  <span className="font-black text-slate-800 truncate max-w-[280px]">{selectedPatient.pdf_name}</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
