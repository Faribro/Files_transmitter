'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend 
} from 'recharts'
import { 
  CheckCircle, AlertCircle, Clock, XCircle, ChevronRight,
  ChevronDown, Filter, RefreshCw, Download, Search, 
  Building2, Calendar, FileText, Users, HardDrive, Shield
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────
interface MonthCell {
  month: string
  facility: string
  status: string
  file_count: number
  size_bytes: number
  patient_count: number
}

interface PatientRow {
  patient_id: string
  patient_name: string
  status: string
  file_count: number
  size_bytes: number
  first_scan: string
  last_scan: string
  file_types: string
}

interface AnalyticsData {
  summary: MonthCell[]
  monthlyGrid: MonthCell[]
  patientDrilldown: PatientRow[]
  fileTypes: any[]
  verificationGaps: {
    missing: number; size_mismatch: number; ok: number; total: number; passed: boolean
  }
  reorganization: {
    canonical_paths: number; total_completed: number; percent_reorganized: number
  }
  filters: { facility: string | null; month: string | null }
  generated_at: string
}

// ── Constants ───────────────────────────────────────────────────────────────
const FACILITIES = ['ALL', 'AKROSS', 'DAVO']
const MONTHS_2026 = [
  '2026-01','2026-02','2026-03','2026-04','2026-05','2026-06',
  '2026-07','2026-08','2026-09','2026-10','2026-11','2026-12',
]
const MONTH_LABELS: Record<string, string> = {
  '2026-01':'Jan 2026','2026-02':'Feb 2026','2026-03':'Mar 2026',
  '2026-04':'Apr 2026','2026-05':'May 2026','2026-06':'Jun 2026',
  '2026-07':'Jul 2026','2026-08':'Aug 2026','2026-09':'Sep 2026',
  '2026-10':'Oct 2026','2026-11':'Nov 2026','2026-12':'Dec 2026',
}
const STATUS_COLORS: Record<string, string> = {
  completed: '#10b981', pending: '#f59e0b', failed: '#ef4444',
  processing: '#6366f1', skipped_shortcut: '#94a3b8',
}
const FACILITY_COLORS: Record<string, string> = {
  AKROSS: '#f97316', DAVO: '#1d4ed8', UNKNOWN: '#6b7280',
}

function fmtBytes(b: number) {
  if (!b) return '0 B'
  if (b < 1024) return `${b} B`
  if (b < 1024**2) return `${(b/1024).toFixed(1)} KB`
  if (b < 1024**3) return `${(b/1024**2).toFixed(1)} MB`
  return `${(b/1024**3).toFixed(2)} GB`
}

function fmtNum(n: number) { return n?.toLocaleString() ?? '0' }

// ── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { color: string; icon: any; label: string }> = {
    completed:        { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, label: 'Completed' },
    pending:          { color: 'bg-amber-100 text-amber-700',    icon: Clock,        label: 'Pending'   },
    failed:           { color: 'bg-red-100 text-red-700',        icon: XCircle,      label: 'Failed'    },
    processing:       { color: 'bg-indigo-100 text-indigo-700',  icon: RefreshCw,    label: 'Processing'},
    skipped_shortcut: { color: 'bg-slate-100 text-slate-500',    icon: AlertCircle,  label: 'Skipped'   },
  }
  const c = cfg[status] || { color: 'bg-gray-100 text-gray-500', icon: AlertCircle, label: status }
  const Icon = c.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.color}`}>
      <Icon className="w-3 h-3" />{c.label}
    </span>
  )
}

// ── Monthly heat-map grid cell ───────────────────────────────────────────────
function GridCell({ cells, month, facility, onClick, selected }: {
  cells: MonthCell[]; month: string; facility: string; 
  onClick: () => void; selected: boolean
}) {
  const relevant = cells.filter(c => c.month === month && c.facility === facility)
  const total    = relevant.reduce((s, c) => s + c.file_count, 0)
  const completed = relevant.find(c => c.status === 'completed')?.file_count || 0
  const pct      = total > 0 ? Math.round((completed / total) * 100) : null

  const bg = pct === null ? 'bg-slate-50 border-slate-200 text-slate-300'
    : pct === 100 ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
    : pct > 50    ? 'bg-amber-50 border-amber-300 text-amber-700'
    : pct > 0     ? 'bg-orange-50 border-orange-300 text-orange-700'
    :               'bg-red-50 border-red-300 text-red-700'

  return (
    <button
      onClick={total > 0 ? onClick : undefined}
      className={`
        w-full border rounded-lg p-2 text-left transition-all duration-150
        ${bg} ${selected ? 'ring-2 ring-offset-1 ring-brand-500 shadow-md' : ''}
        ${total > 0 ? 'hover:shadow cursor-pointer' : 'cursor-default opacity-40'}
      `}
    >
      <div className="text-[10px] font-medium leading-none mb-1">{MONTH_LABELS[month] || month}</div>
      {pct !== null ? (
        <>
          <div className="text-sm font-bold">{pct}%</div>
          <div className="text-[10px] mt-0.5">{fmtNum(completed)}/{fmtNum(total)}</div>
        </>
      ) : (
        <div className="text-[10px]">No data</div>
      )}
    </button>
  )
}

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

// ── Main content wrapper ──────────────────────────────────────────────────────
function AnalyticsContent() {
  const [data, setData]           = useState<AnalyticsData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [facilityFilter, setFacilityFilter] = useState<string>('ALL')
  const [selectedMonth, setSelectedMonth]   = useState<string | null>(null)
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'grid'|'chart'|'types'|'patients'|'verify'>('grid')
  const [searchPat, setSearchPat] = useState('')
  const [error, setError]         = useState<string | null>(null)

  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')

  // Set active tab based on query param
  useEffect(() => {
    if (tabParam && ['grid', 'chart', 'types', 'patients', 'verify'].includes(tabParam)) {
      setActiveTab(tabParam as any)
    }
  }, [tabParam])

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams()
      if (facilityFilter !== 'ALL') params.set('facility', facilityFilter)
      if (selectedMonth)            params.set('month',    selectedMonth)
      const res  = await fetch(`/api/v1/migration/analytics?${params}`)
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [facilityFilter, selectedMonth])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Derived: summary KPIs ─────────────────────────────────────────────────
  const kpis = (() => {
    if (!data) return null
    const all = data.summary
    const completed = all.filter(r => r.status === 'completed')
    const pending   = all.filter(r => r.status === 'pending')
    const failed    = all.filter(r => r.status === 'failed')
    return {
      total:     all.reduce((s,r)=>s+r.file_count, 0),
      completed: completed.reduce((s,r)=>s+r.file_count, 0),
      pending:   pending.reduce((s,r)=>s+r.file_count, 0),
      failed:    failed.reduce((s,r)=>s+r.file_count, 0),
      size:      all.reduce((s,r)=>s+r.size_bytes, 0),
      patients:  [...new Set(all.map(r=>r.facility))].length,
    }
  })()

  // ── Derived: chart data ───────────────────────────────────────────────────
  const chartData = (() => {
    if (!data) return []
    const map: Record<string, any> = {}
    MONTHS_2026.forEach(m => { map[m] = { month: MONTH_LABELS[m], AKROSS:0, DAVO:0, 'AKROSS_pending':0, 'DAVO_pending':0 } })
    data.monthlyGrid.forEach(r => {
      if (!map[r.month]) return
      const fac = r.facility.includes('AKROSS') ? 'AKROSS' : r.facility.includes('DAVO') ? 'DAVO' : null
      if (!fac) return
      if (r.status === 'completed') map[r.month][fac] = (map[r.month][fac]||0) + r.file_count
      else map[r.month][`${fac}_pending`] = (map[r.month][`${fac}_pending`]||0) + r.file_count
    })
    return Object.values(map)
  })()

  // ── Patient search ─────────────────────────────────────────────────────────
  const filteredPatients = (data?.patientDrilldown || []).filter(p =>
    !searchPat || p.patient_id.toLowerCase().includes(searchPat.toLowerCase()) ||
    p.patient_name.toLowerCase().includes(searchPat.toLowerCase())
  )

  const handleCellClick = (month: string, facility: string) => {
    setSelectedMonth(month)
    setSelectedFacility(facility)
    setActiveTab('patients')
  }

  const TABS = [
    { id: 'grid',     label: '📅 Monthly Grid' },
    { id: 'chart',    label: '📊 Trend Chart'  },
    { id: 'types',    label: '📁 File Types'   },
    { id: 'patients', label: `👥 Patient Drill-Down${selectedMonth ? ` · ${MONTH_LABELS[selectedMonth]}` : ''}` },
    { id: 'verify',   label: `🛡️ Verification${data?.verificationGaps.passed ? ' ✅' : ' ⚠️'}` },
  ]

  return (
    <div className="p-6 space-y-6 min-h-screen bg-surface-page">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">
            Migration Analytics & Drill-Down
          </h1>
          <p className="text-sm text-text-tertiary mt-1">
            TB/HIV Programme · AKROSS & DAVO · Prison and OCS Intervention
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Facility filter */}
          {FACILITIES.map(f => (
            <button
              key={f}
              onClick={() => { setFacilityFilter(f); setSelectedMonth(null) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                facilityFilter === f
                  ? f === 'AKROSS' ? 'bg-orange-500 text-white border-orange-500'
                  : f === 'DAVO'   ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-text-secondary border-border-default hover:border-brand-400'
              }`}
            >{f}</button>
          ))}
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-border-default hover:bg-surface-sunken transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* ── KPI Row ────────────────────────────────────────────────────────── */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Files',  value: fmtNum(kpis.total),     color: 'text-text-primary', icon: FileText     },
            { label: 'Completed',    value: fmtNum(kpis.completed),  color: 'text-emerald-600',  icon: CheckCircle  },
            { label: 'Pending',      value: fmtNum(kpis.pending),    color: 'text-amber-600',    icon: Clock        },
            { label: 'Failed',       value: fmtNum(kpis.failed),     color: 'text-red-500',      icon: XCircle      },
            { label: 'Total Size',   value: fmtBytes(kpis.size),     color: 'text-indigo-600',   icon: HardDrive    },
            { label: 'Verification', value: data?.verificationGaps.passed ? 'PASSED ✅' : `${data?.verificationGaps.missing} gaps`, 
              color: data?.verificationGaps.passed ? 'text-emerald-600' : 'text-red-500', icon: Shield },
          ].map(k => {
            const Icon = k.icon
            return (
              <div key={k.label} className="bg-white rounded-xl border border-border-default p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${k.color}`} />
                  <span className="text-xs text-text-tertiary">{k.label}</span>
                </div>
                <div className={`text-xl font-bold font-display ${k.color}`}>{k.value}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Reorganization progress bar ─────────────────────────────────────── */}
      {data?.reorganization && (
        <div className="bg-white rounded-xl border border-border-default p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-text-primary">
              🗂️ Canonical Path Reorganization
            </span>
            <span className="text-xs text-text-tertiary">
              {fmtNum(data.reorganization.canonical_paths)} / {fmtNum(data.reorganization.total_completed)} files · {data.reorganization.percent_reorganized}%
            </span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 rounded-full transition-all"
              style={{ width: `${data.reorganization.percent_reorganized}%` }}
            />
          </div>
          <p className="text-xs text-text-tertiary mt-1.5">
            Target: <code className="bg-slate-100 px-1 rounded">Prison_and_OCS_Intervention/Medical_Files/&#123;FACILITY&#125;/&#123;Month&#125;/&#123;Date&#125;/&#123;PatientID&#125;/</code>
          </p>
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-border-default shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-border-subtle">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors
                ${activeTab === t.id
                  ? 'border-b-2 border-brand-500 text-brand-700 bg-brand-50'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-sunken'
                }`}
            >{t.label}</button>
          ))}
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12 text-text-tertiary gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              Loading analytics data…
            </div>
          )}

          {/* ── Tab: Monthly Grid ─────────────────────────────────────────── */}
          {!loading && activeTab === 'grid' && data && (
            <div>
              <p className="text-xs text-text-tertiary mb-4">
                Click any cell to drill into patient records. Green = fully migrated, Amber = partial, Red = gaps.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-semibold text-text-tertiary pb-2 pr-3">Facility</th>
                      {MONTHS_2026.map(m => (
                        <th key={m} className="text-center text-xs font-semibold text-text-tertiary pb-2 px-1 min-w-[80px]">
                          {MONTH_LABELS[m]?.split(' ')[0]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {['AKROSS','DAVO'].map(fac => (
                      <tr key={fac}>
                        <td className="pr-3 py-1">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${
                            fac === 'AKROSS' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                          }`}>{fac}</span>
                        </td>
                        {MONTHS_2026.map(m => (
                          <td key={m} className="px-1 py-1">
                            <GridCell
                              cells={data.monthlyGrid}
                              month={m} facility={fac}
                              onClick={() => handleCellClick(m, fac)}
                              selected={selectedMonth === m && selectedFacility === fac}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 text-xs text-text-tertiary">
                {[
                  { color: 'bg-emerald-100 border-emerald-300', label: '100% migrated' },
                  { color: 'bg-amber-100 border-amber-300',     label: '>50% migrated'  },
                  { color: 'bg-orange-100 border-orange-300',   label: '<50% migrated'  },
                  { color: 'bg-red-100 border-red-300',         label: '0% migrated'    },
                  { color: 'bg-slate-50 border-slate-200',      label: 'No data'        },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded border ${l.color}`} />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab: Trend Chart ──────────────────────────────────────────── */}
          {!loading && activeTab === 'chart' && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-4">
                Monthly File Migration by Facility
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData} margin={{ top:5, right:20, left:10, bottom:5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize:11 }} />
                  <YAxis tick={{ fontSize:11 }} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v} />
                  <Tooltip formatter={(v) => fmtNum(Number(v ?? 0))} />
                  <Legend />
                  <Bar dataKey="AKROSS"         name="AKROSS Completed"  fill="#f97316" radius={[3,3,0,0]} stackId="a" />
                  <Bar dataKey="AKROSS_pending" name="AKROSS Pending"    fill="#fed7aa" radius={[3,3,0,0]} stackId="a" />
                  <Bar dataKey="DAVO"           name="DAVO Completed"    fill="#1d4ed8" radius={[3,3,0,0]} stackId="b" />
                  <Bar dataKey="DAVO_pending"   name="DAVO Pending"      fill="#bfdbfe" radius={[3,3,0,0]} stackId="b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Tab: File Types ───────────────────────────────────────────── */}
          {!loading && activeTab === 'types' && data && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">File Type Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      {['Type','Facility','Status','Count','Size'].map(h => (
                        <th key={h} className="text-left py-2 pr-4 text-xs font-semibold text-text-tertiary">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.fileTypes.map((row,i) => (
                      <tr key={i} className="border-b border-border-subtle/50 hover:bg-surface-sunken">
                        <td className="py-2 pr-4">
                          <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{row.file_type}</span>
                        </td>
                        <td className="py-2 pr-4 text-xs">{row.facility}</td>
                        <td className="py-2 pr-4"><StatusBadge status={row.status} /></td>
                        <td className="py-2 pr-4 font-medium">{fmtNum(row.count)}</td>
                        <td className="py-2 text-text-tertiary text-xs">{fmtBytes(row.size_bytes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Tab: Patient Drill-Down ───────────────────────────────────── */}
          {!loading && activeTab === 'patients' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    Patient-Level Drill-Down
                    {selectedMonth && selectedFacility && (
                      <span className="ml-2 text-xs font-normal text-text-tertiary">
                        {selectedFacility} · {MONTH_LABELS[selectedMonth]}
                      </span>
                    )}
                  </h3>
                  {!selectedMonth && (
                    <p className="text-xs text-text-tertiary mt-1">
                      Select a cell in the Monthly Grid to drill into patient records.
                    </p>
                  )}
                </div>
                {/* Month + facility selectors */}
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={selectedFacility || ''}
                    onChange={e => setSelectedFacility(e.target.value || null)}
                    className="text-xs border border-border-default rounded-lg px-2 py-1.5 bg-white"
                  >
                    <option value="">All Facilities</option>
                    <option value="AKROSS">AKROSS</option>
                    <option value="DAVO">DAVO</option>
                  </select>
                  <select
                    value={selectedMonth || ''}
                    onChange={e => setSelectedMonth(e.target.value || null)}
                    className="text-xs border border-border-default rounded-lg px-2 py-1.5 bg-white"
                  >
                    <option value="">All Months</option>
                    {MONTHS_2026.map(m => <option key={m} value={m}>{MONTH_LABELS[m]}</option>)}
                  </select>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <input
                      value={searchPat}
                      onChange={e => setSearchPat(e.target.value)}
                      placeholder="Search patient ID…"
                      className="pl-7 pr-3 py-1.5 text-xs border border-border-default rounded-lg bg-white w-44"
                    />
                  </div>
                </div>
              </div>

              {filteredPatients.length === 0 ? (
                <div className="text-center py-10 text-text-tertiary text-sm">
                  {selectedMonth ? 'No patient records found for this filter.' : 'Select a month and facility above to view patient records.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-subtle">
                        {['Patient ID','Name','Status','Files','Size','First Scan','Last Scan','Types'].map(h => (
                          <th key={h} className="text-left py-2 pr-4 text-xs font-semibold text-text-tertiary">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map((p,i) => (
                        <tr key={i} className="border-b border-border-subtle/50 hover:bg-surface-sunken">
                          <td className="py-2 pr-4 font-mono text-xs">{p.patient_id}</td>
                          <td className="py-2 pr-4 text-xs text-text-secondary">{p.patient_name}</td>
                          <td className="py-2 pr-4"><StatusBadge status={p.status} /></td>
                          <td className="py-2 pr-4 font-semibold">{fmtNum(p.file_count)}</td>
                          <td className="py-2 pr-4 text-xs text-text-tertiary">{fmtBytes(p.size_bytes)}</td>
                          <td className="py-2 pr-4 text-xs text-text-tertiary">{p.first_scan?.slice(0,10)}</td>
                          <td className="py-2 pr-4 text-xs text-text-tertiary">{p.last_scan?.slice(0,10)}</td>
                          <td className="py-2 text-xs">
                            {p.file_types?.split(',').map(t => (
                              <span key={t} className="inline-block bg-slate-100 text-slate-600 text-[10px] px-1 rounded mr-1 mb-0.5">{t}</span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-text-tertiary mt-2">
                    Showing {filteredPatients.length} of {data?.patientDrilldown.length} patients (top 500)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Verification ────────────────────────────────────────── */}
          {!loading && activeTab === 'verify' && data && (
            <div className="space-y-6">
              <div className={`rounded-xl border p-5 ${
                data.verificationGaps.passed
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <div className="flex items-center gap-3">
                  {data.verificationGaps.passed
                    ? <CheckCircle className="w-8 h-8 text-emerald-600" />
                    : <AlertCircle className="w-8 h-8 text-amber-600" />
                  }
                  <div>
                    <h3 className={`text-base font-bold ${
                      data.verificationGaps.passed ? 'text-emerald-800' : 'text-amber-800'
                    }`}>
                      {data.verificationGaps.passed
                        ? 'All files verified — safe to reorganize'
                        : 'Verification gaps found — do not reorganize yet'
                      }
                    </h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Last checked via <code>scripts/verify_all_blobs.py</code>
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Checked',   value: fmtNum(data.verificationGaps.total),         color: 'text-text-primary'  },
                  { label: '✅ OK in Azure',   value: fmtNum(data.verificationGaps.ok),            color: 'text-emerald-600'   },
                  { label: '❌ Missing',       value: fmtNum(data.verificationGaps.missing),       color: 'text-red-600'       },
                  { label: '⚠️ Size Mismatch', value: fmtNum(data.verificationGaps.size_mismatch), color: 'text-amber-600'     },
                ].map(k => (
                  <div key={k.label} className="bg-white rounded-xl border border-border-default p-4">
                    <div className="text-xs text-text-tertiary mb-1">{k.label}</div>
                    <div className={`text-2xl font-bold font-display ${k.color}`}>{k.value}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl border border-border-default p-4">
                <h4 className="text-sm font-semibold text-text-primary mb-3">Next Steps</h4>
                <ol className="space-y-2 text-sm text-text-secondary list-none">
                  {[
                    { done: data.verificationGaps.total > 0,   text: 'Run verify_all_blobs.py to check all 118k files' },
                    { done: data.verificationGaps.missing === 0, text: 'Zero missing files confirmed' },
                    { done: false, text: 'Run remigrate_missing.py to fix gaps' },
                    { done: data.reorganization.percent_reorganized > 0, text: 'Run reorganize_blobs.py --dry-run preview' },
                    { done: data.reorganization.percent_reorganized === 100, text: 'Run reorganize_blobs.py --live for canonical paths' },
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      {step.done
                        ? <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        : <div className="w-4 h-4 rounded-full border-2 border-slate-300 mt-0.5 shrink-0" />
                      }
                      <span className={step.done ? 'text-text-tertiary line-through' : ''}>{step.text}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>

      {data && (
        <p className="text-center text-xs text-text-tertiary">
          Last updated: {new Date(data.generated_at).toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}

export default function MigrationAnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-text-tertiary">Loading analytics…</div>}>
      <AnalyticsContent />
    </Suspense>
  )
}
