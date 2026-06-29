'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, AlertCircle, CheckCircle, FileSpreadsheet, Loader2 } from 'lucide-react'
import { apiUrl } from '@/lib/api'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  facilities: string[]
  states: string[]
}

export default function ExportModal({ isOpen, onClose, facilities, states }: ExportModalProps) {
  const [selectedState, setSelectedState] = useState<string>('')
  const [selectedFacility, setSelectedFacility] = useState<string>('')
  const [isExporting, setIsExporting] = useState(false)
  const [exportComplete, setExportComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)
    setExportComplete(false)

    try {
      let queryParams = new URLSearchParams()
      if (selectedState) queryParams.append('state', selectedState)
      if (selectedFacility) queryParams.append('facility', selectedFacility)

      const url = `/api/v1/linelist/export?${queryParams.toString()}`
      
      // We will perform a direct window location redirect or fetch blob
      const response = await fetch(apiUrl(url))
      if (!response.ok) {
        throw new Error('Failed to generate export file. Check VM backend.')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      
      // Get filename from header or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'Patient_Linelist.xlsx'
      if (contentDisposition) {
        const matches = /filename="?([^"]+)"?/.exec(contentDisposition)
        if (matches && matches[1]) {
          filename = matches[1]
        }
      }
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      
      setExportComplete(true)
      setTimeout(() => {
        onClose()
        setExportComplete(false)
      }, 2000)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to download spreadsheet')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/45 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative w-full max-w-lg overflow-hidden bg-white rounded-2xl border border-border-subtle shadow-luxury z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border-subtle bg-brand-50/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-brand-500 text-white">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold text-brand-900">Export Patient Linelist</h3>
                  <p className="text-xs text-text-tertiary">Generate standardized National TB Linelist format</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-surface-sunken text-text-tertiary hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {error && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {exportComplete ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <CheckCircle className="w-14 h-14 text-emerald-500 mb-3 animate-bounce" />
                  <h4 className="text-base font-bold text-text-primary">Export Successful!</h4>
                  <p className="text-xs text-text-tertiary mt-1">Standardized excel file downloading now...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {/* State Selector */}
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase mb-2">Filter by State</label>
                      <select
                        value={selectedState}
                        onChange={(e) => {
                          setSelectedState(e.target.value)
                          setSelectedFacility('') // reset facility if state changes
                        }}
                        className="w-full px-4 py-2.5 bg-surface-sunken rounded-xl border border-border-default text-sm text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      >
                        <option value="">All States</option>
                        {states.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>

                    {/* Facility Selector */}
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase mb-2">Filter by Facility</label>
                      <select
                        value={selectedFacility}
                        onChange={(e) => setSelectedFacility(e.target.value)}
                        className="w-full px-4 py-2.5 bg-surface-sunken rounded-xl border border-border-default text-sm text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      >
                        <option value="">All Facilities</option>
                        {facilities.map((fac) => (
                          <option key={fac} value={fac}>{fac}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="rounded-xl bg-amber-50 border border-amber-200/50 p-4">
                    <h5 className="text-xs font-bold text-amber-900 uppercase">Spreadsheet Features:</h5>
                    <ul className="text-xs text-amber-800 list-disc pl-4 mt-2 space-y-1">
                      <li>Frozen headers to make scrolling easier.</li>
                      <li>Standard column structure matching national reporting metrics.</li>
                      <li>Soft color highlights for positive/abnormal findings.</li>
                      <li>Auto-fitted columns for cleaner text alignments.</li>
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
                    <button
                      onClick={onClose}
                      disabled={isExporting}
                      className="px-4 py-2.5 text-sm font-semibold rounded-xl text-text-secondary hover:bg-surface-sunken transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleExport}
                      disabled={isExporting}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl text-white bg-brand-500 hover:bg-brand-600 active:bg-brand-700 shadow-luxury transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Download Excel
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
