'use client'

import { useEffect, useState } from 'react'
import { IndianRupee, FileText, Download, Edit2, Check, RefreshCw, BarChart2, Calendar, ShieldAlert } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { apiUrl } from '@/lib/api'

interface ScreeningReport {
  id: number
  facility_id: number
  facility_name: string
  state: string
  report_month: string
  male_screened: number
  female_screened: number
  tg_screened: number
  total_screened: number
  male_suspected: number
  female_suspected: number
  tg_suspected: number
  total_suspected: number
  rate_applied?: number
  total_cost?: number
  screening_days: number
  man_days: number
  status: string
}

interface StateSummary {
  state: string
  facilities_count: number
  screenings: number
  rate: number
  subtotal: number
}

interface FinanceSummary {
  report_month: string
  total_screenings: number
  total_cost: number
  by_state: StateSummary[]
  by_facility: ScreeningReport[]
}

export default function FinancePage() {
  const [month, setMonth] = useState('2026-05')
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null)
  const [generatedInvoiceUrl, setGeneratedInvoiceUrl] = useState<string | null>(null)
  
  // Inline editing state
  const [editingReportId, setEditingReportId] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<Partial<ScreeningReport> | null>(null)

  useEffect(() => {
    fetchSummary()
  }, [month])

  const fetchSummary = async () => {
    try {
      setLoading(true)
      const res = await fetch(apiUrl(`/api/v1/finance/summary?month=${month}`))
      if (!res.ok) throw new Error('Failed to fetch finance summary')
      const json = await res.json()
      
      // Sort reports by state, then facility name to match paper layout
      if (json.by_facility) {
        json.by_facility.sort((a: any, b: any) => {
          if (a.state !== b.state) return a.state.localeCompare(b.state)
          return a.facility_name.localeCompare(b.facility_name)
        })
      }
      
      setSummary(json)
      setLoading(false)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const startEditing = (report: ScreeningReport) => {
    setEditingReportId(report.id)
    setEditValues({
      male_screened: report.male_screened,
      female_screened: report.female_screened,
      tg_screened: report.tg_screened,
      male_suspected: report.male_suspected,
      female_suspected: report.female_suspected,
      tg_suspected: report.tg_suspected,
      screening_days: report.screening_days,
      man_days: report.man_days
    })
  }

  const saveEdit = async (reportId: number) => {
    if (!editValues) return
    try {
      const originalReport = summary?.by_facility.find(r => r.id === reportId)
      if (!originalReport) return
      
      const payload = {
        facility_id: originalReport.facility_id,
        report_month: originalReport.report_month,
        ...editValues
      }
      
      const res = await fetch(apiUrl('/api/v1/finance/reports'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (res.ok) {
        setEditingReportId(null)
        setEditValues(null)
        fetchSummary() // Refresh all data to update aggregates
      }
    } catch (err) {
      console.error('Failed to save report changes:', err)
    }
  }

  const handleInvoiceGeneration = async (stateFilter?: string) => {
    const key = stateFilter || 'ALL'
    try {
      setGeneratingInvoice(key)
      setGeneratedInvoiceUrl(null)
      
      const payload = {
        report_month: month,
        state: stateFilter
      }
      
      const res = await fetch(apiUrl('/api/v1/finance/generate-invoice'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (res.ok) {
        const data = await res.json()
        setGeneratedInvoiceUrl(data.pdf_path)
      }
    } catch (err) {
      console.error('Failed to generate invoice:', err)
    } finally {
      setGeneratingInvoice(null)
    }
  }

  const mhSummary = summary?.by_state.find(s => s.state === 'Maharashtra')
  const guSummary = summary?.by_state.find(s => s.state === 'Gujarat')

  return (
    <div className="flex min-h-screen bg-surface-page">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        {/* Header */}
        <div className="glass-luxury border-b border-white/50 px-6 py-4 shadow-luxury">
          <div className="container-dashboard flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-display font-bold text-text-primary">
                Screening Finance Dashboard
              </h1>
              <p className="text-sm text-text-tertiary mt-1">
                Contractual screening calculations and official receipt generation
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-text-tertiary" />
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="bg-surface-sunken border border-gray-300 rounded-lg px-4 py-2 text-sm font-semibold text-text-primary"
              >
                <option value="2026-05">May 2026</option>
                <option value="2026-06">June 2026</option>
              </select>
            </div>
          </div>
        </div>

        <main className="container-dashboard py-6 px-6">
          {/* Summary Cards */}
          {loading ? (
            <div className="p-24 text-center">
              <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-text-secondary font-semibold">Loading monthly calculations...</p>
            </div>
          ) : (
            <>
              {/* Financial KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="glass-luxury rounded-lg p-5 shadow-luxury border-l-4 border-brand-500">
                  <p className="text-xs font-semibold text-text-tertiary uppercase">Grand Total (Inclusive GST)</p>
                  <p className="text-3xl font-display font-black text-text-primary mt-2">
                    ₹{(summary?.total_cost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-text-tertiary mt-1">
                    {(summary?.total_screenings ?? 0).toLocaleString()} Total Screenings
                  </p>
                </div>

                <div className="glass-luxury rounded-lg p-5 shadow-luxury border-l-4 border-teal-500">
                  <p className="text-xs font-semibold text-text-tertiary uppercase">Maharashtra Subtotal</p>
                  <p className="text-2xl font-display font-bold text-teal-800 mt-2">
                    ₹{mhSummary?.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    {mhSummary?.screenings.toLocaleString() || 0} screenings @ ₹225
                  </p>
                </div>

                <div className="glass-luxury rounded-lg p-5 shadow-luxury border-l-4 border-amber-500">
                  <p className="text-xs font-semibold text-text-tertiary uppercase">Gujarat Subtotal</p>
                  <p className="text-2xl font-display font-bold text-amber-800 mt-2">
                    ₹{guSummary?.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    {guSummary?.screenings.toLocaleString() || 0} screenings @ ₹300
                  </p>
                </div>

                <div className="glass-luxury rounded-lg p-5 shadow-luxury bg-gradient-to-br from-brand-600 to-brand-700 text-white flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-bold text-white/80 uppercase">Invoicing Actions</p>
                    <p className="text-[10px] text-white/70 mt-1">Clause 5 - GST Inclusive standard rates</p>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleInvoiceGeneration()}
                      disabled={generatingInvoice !== null}
                      className="flex-1 bg-white text-brand-700 hover:bg-brand-50 font-bold py-2 px-3 rounded text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {generatingInvoice === 'ALL' ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                      Bill All
                    </button>
                    <button
                      onClick={() => handleInvoiceGeneration('Maharashtra')}
                      disabled={generatingInvoice !== null}
                      className="bg-brand-500 hover:bg-brand-800 text-white font-bold py-2 px-3 rounded text-xs flex items-center justify-center gap-1.5 border border-white/20 transition-colors disabled:opacity-50"
                    >
                      MH
                    </button>
                    <button
                      onClick={() => handleInvoiceGeneration('Gujarat')}
                      disabled={generatingInvoice !== null}
                      className="bg-brand-500 hover:bg-brand-800 text-white font-bold py-2 px-3 rounded text-xs flex items-center justify-center gap-1.5 border border-white/20 transition-colors disabled:opacity-50"
                    >
                      GUJ
                    </button>
                  </div>
                </div>
              </div>

              {/* PDF Download Notice */}
              {generatedInvoiceUrl && (
                <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 flex items-center justify-between text-green-800">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>Invoice PDF successfully generated and saved!</span>
                  </div>
                  <a
                    href={generatedInvoiceUrl}
                    download
                    className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF Receipt
                  </a>
                </div>
              )}

              {/* Data Table */}
              <div className="glass-luxury rounded-lg shadow-luxury overflow-hidden bg-white">
                <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                    Official Screening Cost Sheet - {month}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-text-tertiary font-semibold">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <span>Editable cells are inline saved. Rates based on state agreements.</span>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gradient-to-r from-brand-600 to-brand-700 text-white font-bold uppercase tracking-wider">
                        <th className="px-4 py-3 text-left w-12">Sr. No.</th>
                        <th className="px-4 py-3 text-left w-56">Facility</th>
                        <th className="px-4 py-3 text-left w-24">State</th>
                        <th className="px-4 py-3 text-center">Male</th>
                        <th className="px-4 py-3 text-center">Female</th>
                        <th className="px-4 py-3 text-center">TG</th>
                        <th className="px-4 py-3 text-center font-bold">Total</th>
                        <th className="px-4 py-3 text-center">Male (Susp.)</th>
                        <th className="px-4 py-3 text-center">Female (Susp.)</th>
                        <th className="px-4 py-3 text-center">TG (Susp.)</th>
                        <th className="px-4 py-3 text-center font-bold">Total Susp.</th>
                        <th className="px-4 py-3 text-center">Rate</th>
                        <th className="px-4 py-3 text-right">Cost</th>
                        <th className="px-4 py-3 text-center w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {summary?.by_facility.map((report, idx) => {
                        const isEditing = editingReportId === report.id
                        const stateColor = report.state === 'Maharashtra' ? 'text-teal-700 bg-teal-50' : 'text-amber-700 bg-amber-50'
                        
                        return (
                          <tr
                            key={report.id}
                            className={`hover:bg-brand-50/20 transition-colors ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                            }`}
                          >
                            <td className="px-4 py-3 text-text-secondary">{idx + 1}</td>
                            <td className="px-4 py-3 font-semibold text-text-primary">{report.facility_name}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full font-bold ${stateColor}`}>
                                {report.state}
                              </span>
                            </td>
                            
                            {/* Male Screened */}
                            <td className="px-4 py-3 text-center">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editValues?.male_screened || 0}
                                  onChange={(e) => setEditValues({ ...editValues, male_screened: parseInt(e.target.value) || 0 })}
                                  className="w-16 bg-surface-sunken border border-gray-300 rounded text-center py-1"
                                />
                              ) : (
                                report.male_screened
                              )}
                            </td>

                            {/* Female Screened */}
                            <td className="px-4 py-3 text-center">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editValues?.female_screened || 0}
                                  onChange={(e) => setEditValues({ ...editValues, female_screened: parseInt(e.target.value) || 0 })}
                                  className="w-16 bg-surface-sunken border border-gray-300 rounded text-center py-1"
                                />
                              ) : (
                                report.female_screened
                              )}
                            </td>

                            {/* TG Screened */}
                            <td className="px-4 py-3 text-center">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editValues?.tg_screened || 0}
                                  onChange={(e) => setEditValues({ ...editValues, tg_screened: parseInt(e.target.value) || 0 })}
                                  className="w-16 bg-surface-sunken border border-gray-300 rounded text-center py-1"
                                />
                              ) : (
                                report.tg_screened
                              )}
                            </td>

                            {/* Total Screened */}
                            <td className="px-4 py-3 text-center font-bold text-text-primary">
                              {isEditing 
                                ? ((editValues?.male_screened || 0) + (editValues?.female_screened || 0) + (editValues?.tg_screened || 0))
                                : report.total_screened
                              }
                            </td>

                            {/* Male Suspected */}
                            <td className="px-4 py-3 text-center">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editValues?.male_suspected || 0}
                                  onChange={(e) => setEditValues({ ...editValues, male_suspected: parseInt(e.target.value) || 0 })}
                                  className="w-16 bg-surface-sunken border border-gray-300 rounded text-center py-1"
                                />
                              ) : (
                                report.male_suspected
                              )}
                            </td>

                            {/* Female Suspected */}
                            <td className="px-4 py-3 text-center">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editValues?.female_suspected || 0}
                                  onChange={(e) => setEditValues({ ...editValues, female_suspected: parseInt(e.target.value) || 0 })}
                                  className="w-16 bg-surface-sunken border border-gray-300 rounded text-center py-1"
                                />
                              ) : (
                                report.female_suspected
                              )}
                            </td>

                            {/* TG Suspected */}
                            <td className="px-4 py-3 text-center">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editValues?.tg_suspected || 0}
                                  onChange={(e) => setEditValues({ ...editValues, tg_suspected: parseInt(e.target.value) || 0 })}
                                  className="w-16 bg-surface-sunken border border-gray-300 rounded text-center py-1"
                                />
                              ) : (
                                report.tg_suspected
                              )}
                            </td>

                            {/* Total Suspected */}
                            <td className="px-4 py-3 text-center font-bold text-text-primary">
                              {isEditing 
                                ? ((editValues?.male_suspected || 0) + (editValues?.female_suspected || 0) + (editValues?.tg_suspected || 0))
                                : report.total_suspected
                              }
                            </td>

                            {/* Rate */}
                            <td className="px-4 py-3 text-center text-text-secondary">
                              ₹{report.rate_applied || 0}
                            </td>

                            {/* Cost */}
                            <td className="px-4 py-3 text-right font-bold text-text-primary">
                              ₹{isEditing
                                ? (((editValues?.male_screened || 0) + (editValues?.female_screened || 0) + (editValues?.tg_screened || 0)) * (report.rate_applied || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : (report.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              }
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 text-center">
                              {isEditing ? (
                                <button
                                  onClick={() => saveEdit(report.id)}
                                  className="p-1 rounded-md bg-green-100 hover:bg-green-200 text-green-700 transition-colors"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => startEditing(report)}
                                  className="p-1 rounded-md bg-gray-100 hover:bg-gray-200 text-text-secondary hover:text-text-primary transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                      
                      {/* Summary Autotal Row */}
                      <tr className="bg-gray-100 font-bold text-text-primary border-t-2 border-gray-300">
                        <td className="px-4 py-4" colSpan={3}>GRAND TOTALS</td>
                        <td className="px-4 py-4 text-center">
                          {summary?.by_facility.reduce((sum, r) => sum + r.male_screened, 0)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {summary?.by_facility.reduce((sum, r) => sum + r.female_screened, 0)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {summary?.by_facility.reduce((sum, r) => sum + r.tg_screened, 0)}
                        </td>
                        <td className="px-4 py-4 text-center font-black text-brand-700">
                          {summary?.total_screenings ?? 0}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {summary?.by_facility.reduce((sum, r) => sum + r.male_suspected, 0)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {summary?.by_facility.reduce((sum, r) => sum + r.female_suspected, 0)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {summary?.by_facility.reduce((sum, r) => sum + r.tg_suspected, 0)}
                        </td>
                        <td className="px-4 py-4 text-center font-black text-amber-700">
                          {summary?.by_facility.reduce((sum, r) => sum + r.total_suspected, 0)}
                        </td>
                        <td className="px-4 py-4 text-center">-</td>
                        <td className="px-4 py-4 text-right font-black text-brand-850">
                          ₹{(summary?.total_cost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-4 text-center">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
