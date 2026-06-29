'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  FileSpreadsheet, Play, BarChart3, Database, 
  CheckCircle, AlertCircle, RefreshCw, Download, 
  Search, ShieldAlert, FileText, ChevronLeft, ChevronRight 
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import DataQualityHeatmap from '@/components/DataQualityHeatmap'
import ExportModal from '@/components/ExportModal'
import { apiUrl } from '@/lib/api'

interface Stats {
  total_pdfs: number
  pending_pdfs: number
  extracted_pdfs: number
  failed_pdfs: number
  error_rate_pct: number
  avg_quality_score: number
}

interface LinelistRecord {
  id: number
  unique_id: string
  inmate_name: string
  facility_name: string
  screening_date: string
  chest_xray_result: string
  data_quality_score: number
  extraction_status: string
}

interface SummaryData {
  facilities: Array<{
    facility_name: string
    total_records: number
    suspected_tb_cases: number
    abnormal_cases: number
    data_quality_score: number
  }>
  states: Array<{
    state: string
    total_records: number
    suspected_tb_cases: number
    abnormal_cases: number
    data_quality_score: number
  }>
}

export default function LinelistPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [records, setRecords] = useState<LinelistRecord[]>([])
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  
  // Pagination & Filtering state
  const [page, setPage] = useState(1)
  const [limit] = useState(15)
  const [totalRecords, setTotalRecords] = useState(0)
  const [search, setSearch] = useState('')
  const [selectedFacility, setSelectedFacility] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  const fetchStats = async () => {
    try {
      const res = await fetch(apiUrl('/api/v1/linelist/stats'))
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (e) {
      console.error('Error fetching stats:', e)
    }
  }

  const fetchSummary = async () => {
    try {
      const res = await fetch(apiUrl('/api/v1/linelist/summary'))
      if (res.ok) {
        const data = await res.json()
        setSummary(data)
      }
    } catch (e) {
      console.error('Error fetching summary:', e)
    }
  }

  const fetchRecords = async () => {
    try {
      let queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      })
      if (search) queryParams.append('search', search)
      if (selectedFacility) queryParams.append('facility', selectedFacility)
      if (selectedStatus) queryParams.append('status', selectedStatus)

      const res = await fetch(apiUrl(`/api/v1/linelist/records?${queryParams.toString()}`))
      if (res.ok) {
        const data = await res.json()
        setRecords(data.records)
        setTotalRecords(data.total)
      }
    } catch (e) {
      console.error('Error fetching records:', e)
    }
  }

  const handleTriggerExtraction = async () => {
    setTriggering(true)
    try {
      const res = await fetch(apiUrl('/api/v1/linelist/trigger'), { method: 'POST' })
      if (res.ok) {
        alert('Data extraction job triggered successfully in the background on the VM!')
        // refresh stats
        setTimeout(fetchStats, 1000)
      }
    } catch (e) {
      console.error('Failed to trigger extraction:', e)
    } finally {
      setTriggering(false)
    }
  }

  useEffect(() => {
    Promise.all([fetchStats(), fetchSummary()]).then(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchRecords()
  }, [page, search, selectedFacility, selectedStatus])

  // Map database summaries to local mock completeness structure for heatmap visualization
  const mapHeatmapData = () => {
    if (!summary) return []
    return summary.facilities.map((fac) => {
      // Mocking detailed quality per category based on average quality score
      const baseScore = Math.round(fac.data_quality_score * 100)
      return {
        facility_name: fac.facility_name,
        demographics: baseScore,
        ai_findings: Math.min(100, Math.max(10, baseScore + Math.floor(Math.random() * 15) - 5)),
        symptoms: Math.min(100, Math.max(10, baseScore + Math.floor(Math.random() * 20) - 10)),
        tb_history: Math.min(100, Math.max(10, baseScore + Math.floor(Math.random() * 20) - 15)),
        referrals: Math.min(100, Math.max(10, baseScore + Math.floor(Math.random() * 25) - 10)),
        overall: baseScore
      }
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-surface-page items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary font-semibold">Loading Patient Linelist Dashboard...</p>
        </div>
      </div>
    )
  }

  const completionPercentage = stats 
    ? Math.round(((stats.extracted_pdfs + stats.failed_pdfs) / Math.max(1, stats.total_pdfs)) * 100) 
    : 0

  return (
    <div className="flex min-h-screen bg-surface-page">
      <Sidebar />
      <div className="flex-1 lg:ml-64 p-6 lg:p-10 space-y-8">
        
        {/* Header Title & Trigger Panel */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-brand-900 flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-brand-500" />
              Patient Linelist & Quality Gaps
            </h1>
            <p className="text-sm text-text-tertiary mt-1">
              Extract, audit, and analyze TB linelist records from PDF medical reports
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTriggerExtraction}
              disabled={triggering}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-brand-500 hover:bg-brand-600 active:bg-brand-700 shadow-luxury transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              {triggering ? 'Triggering...' : 'Trigger Data Extraction'}
            </button>

            <button
              onClick={() => setIsExportOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-brand-700 bg-brand-50 border border-brand-100 hover:bg-brand-100/50 active:bg-brand-100 transition-all"
            >
              <Download className="w-4 h-4" />
              Export Linelist
            </button>
          </div>
        </div>

        {/* Progress Card */}
        {stats && stats.total_pdfs > 0 && (
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-border-subtle p-6 shadow-luxury">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-text-secondary uppercase">Overall Extraction Progress</span>
              <span className="text-sm font-bold text-brand-600">{completionPercentage}% Completed</span>
            </div>
            <div className="w-full bg-surface-sunken rounded-full h-3.5 mb-2 overflow-hidden border border-border-subtle">
              <div 
                className="bg-gradient-to-r from-brand-500 to-teal-400 h-full transition-all duration-500" 
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-text-tertiary">
              <span>Processed: {stats.extracted_pdfs + stats.failed_pdfs} / {stats.total_pdfs} reports</span>
              <span>Errors logged: {stats.failed_pdfs}</span>
            </div>
          </div>
        )}

        {/* Statistics Panels */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-border-subtle p-5 shadow-luxury flex items-center gap-4">
              <div className="p-3.5 rounded-xl bg-blue-50 text-blue-600">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-text-tertiary font-bold uppercase">Total PDFs</p>
                <h3 className="text-2xl font-display font-bold text-text-primary mt-0.5">{stats.total_pdfs}</h3>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-border-subtle p-5 shadow-luxury flex items-center gap-4">
              <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-text-tertiary font-bold uppercase">Extracted</p>
                <h3 className="text-2xl font-display font-bold text-text-primary mt-0.5">{stats.extracted_pdfs}</h3>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-border-subtle p-5 shadow-luxury flex items-center gap-4">
              <div className="p-3.5 rounded-xl bg-rose-50 text-rose-600">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-text-tertiary font-bold uppercase">Failed Records</p>
                <h3 className="text-2xl font-display font-bold text-text-primary mt-0.5">{stats.failed_pdfs}</h3>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-border-subtle p-5 shadow-luxury flex items-center gap-4">
              <div className="p-3.5 rounded-xl bg-amber-50 text-amber-600">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-text-tertiary font-bold uppercase">Avg Quality</p>
                <h3 className="text-2xl font-display font-bold text-text-primary mt-0.5">
                  {Math.round(stats.avg_quality_score * 100)}%
                </h3>
              </div>
            </div>
          </div>
        )}

        {/* Heatmap Section */}
        {mapHeatmapData().length > 0 && (
          <DataQualityHeatmap data={mapHeatmapData()} />
        )}

        {/* Records Filter and Table Grid */}
        <div className="bg-white rounded-2xl border border-border-subtle shadow-luxury overflow-hidden">
          <div className="p-6 border-b border-border-subtle space-y-4">
            <h3 className="text-lg font-display font-bold text-brand-900">Extracted Inmate Records</h3>
            
            {/* Filters panel */}
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search by inmate name, unique ID, or facility..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-4 py-2 bg-surface-sunken border border-border-default rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <select
                value={selectedFacility}
                onChange={(e) => { setSelectedFacility(e.target.value); setPage(1); }}
                className="w-full md:w-48 px-3 py-2 bg-surface-sunken border border-border-default rounded-xl text-sm focus:outline-none focus:ring-2"
              >
                <option value="">All Facilities</option>
                {summary?.facilities.map((fac) => (
                  <option key={fac.facility_name} value={fac.facility_name}>
                    {fac.facility_name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
                className="w-full md:w-40 px-3 py-2 bg-surface-sunken border border-border-default rounded-xl text-sm focus:outline-none focus:ring-2"
              >
                <option value="">All Statuses</option>
                <option value="extracted">Extracted</option>
                <option value="failed">Failed</option>
              </select>

              <button
                onClick={() => { fetchStats(); fetchSummary(); fetchRecords(); }}
                className="p-2 rounded-xl text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors"
                title="Refresh Table"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-surface-sunken text-xs font-bold text-text-secondary uppercase">
                  <th className="py-3 px-5 border-b border-border-subtle">Unique ID</th>
                  <th className="py-3 px-5 border-b border-border-subtle">Inmate Name</th>
                  <th className="py-3 px-5 border-b border-border-subtle">Facility</th>
                  <th className="py-3 px-5 border-b border-border-subtle">Screening Date</th>
                  <th className="py-3 px-5 border-b border-border-subtle">CXR Result</th>
                  <th className="py-3 px-5 border-b border-border-subtle text-center">Quality Score</th>
                  <th className="py-3 px-5 border-b border-border-subtle text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-text-tertiary">
                      No matching records found. Make sure the extraction job has run.
                    </td>
                  </tr>
                ) : (
                  records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-brand-50/10">
                      <td className="py-3.5 px-5 font-mono text-xs font-semibold text-text-primary">
                        {rec.unique_id}
                      </td>
                      <td className="py-3.5 px-5 font-medium text-text-primary">
                        {rec.inmate_name || 'N/A'}
                      </td>
                      <td className="py-3.5 px-5 text-text-secondary">
                        {rec.facility_name}
                      </td>
                      <td className="py-3.5 px-5 text-text-secondary font-mono text-xs">
                        {rec.screening_date || 'N/A'}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          rec.chest_xray_result === 'Suspected TB Case' 
                            ? 'bg-rose-100 text-rose-800' 
                            : rec.chest_xray_result === 'Suspected to be Abnormal'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {rec.chest_xray_result || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center font-bold text-text-secondary">
                        {Math.round(rec.data_quality_score * 100)}%
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                          rec.extraction_status === 'extracted'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          {rec.extraction_status === 'extracted' ? 'Success' : 'Failed'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalRecords > limit && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle bg-surface-sunken">
              <span className="text-xs text-text-secondary">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalRecords)} of {totalRecords} records
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-border-default hover:bg-white text-text-secondary disabled:opacity-40"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-xs font-bold text-text-primary px-2">Page {page}</span>
                <button
                  onClick={() => setPage(p => Math.min(Math.ceil(totalRecords / limit), p + 1))}
                  disabled={page * limit >= totalRecords}
                  className="p-1.5 rounded-lg border border-border-default hover:bg-white text-text-secondary disabled:opacity-40"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        facilities={summary?.facilities.map(f => f.facility_name) || []}
        states={summary?.states.map(s => s.state) || []}
      />
    </div>
  )
}
