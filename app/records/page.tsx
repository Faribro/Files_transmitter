'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, Filter, Database, FileText, Image as ImageIcon, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import PatientDetailModal from '@/components/PatientDetailModal'
import { apiUrl } from '@/lib/api'

interface FileRecord {
  id: number
  filename: string
  file_type: string
  size_bytes?: number
  facility?: string
  inmate_name?: string
  inmate_id?: string
  scan_date?: string
  migration_status: string
  target_path?: string
  target_file_id?: string
}

function RecordsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const facilityParam = searchParams.get('facility')
  const patientParam = searchParams.get('patient')

  const [files, setFiles] = useState<FileRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(patientParam || '')
  
  const [facilityFilter, setFacilityFilter] = useState<string>(facilityParam || 'all')
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all')
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  
  const [totalStats, setTotalStats] = useState({ total: 0, akross: 0, davo: 0 })

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    fetchFiles()
  }, [page, limit, facilityFilter, fileTypeFilter, searchQuery])

  const fetchStats = async () => {
    try {
      // Get dashboard stats to display totals
      const response = await fetch(apiUrl('/api/v1/stats/dashboard'))
      if (response.ok) {
        const data = await response.json()
        setTotalStats({
          total: data.total_files || 0,
          akross: data.by_facility?.AKROSS || 0,
          davo: data.by_facility?.DAVO || 0
        })
      }
    } catch (error) {
      console.error('Failed to fetch file stats:', error)
    }
  }

  const fetchFiles = async () => {
    try {
      setLoading(true)
      let url = `/api/v1/files?page=${page}&limit=${limit}&status=completed`
      
      if (facilityFilter !== 'all') {
        url += `&facility=${facilityFilter}`
      }
      
      if (fileTypeFilter !== 'all') {
        url += `&file_type=${fileTypeFilter}`
      }
      
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`
      }
      
      const response = await fetch(apiUrl(url))
      if (response.ok) {
        const data = await response.json()
        setFiles(data.files || [])
        setTotal(data.total || 0)
      }
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch files:', error)
      setLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) {
      setPage(newPage)
    }
  }

  const handleFacilityFilterChange = (val: string) => {
    setFacilityFilter(val)
    setPage(1)
  }

  const handleFileTypeFilterChange = (val: string) => {
    setFileTypeFilter(val)
    setPage(1)
  }

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setPage(1)
  }

  const totalPages = Math.ceil(total / limit)
  const showingFrom = total === 0 ? 0 : (page - 1) * limit + 1
  const showingTo = Math.min(page * limit, total)

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-surface-page lg:ml-64">
        {/* Header */}
        <div className="glass-luxury border-b border-white/50 px-6 py-4 shadow-luxury">
          <div className="container-dashboard flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-display font-bold text-text-primary">
                Migrated File Inventory
              </h1>
              <p className="text-sm text-text-tertiary mt-1">
                A physical listing of all DCM and PDF files transferred to Azure Cloud
              </p>
            </div>
            <div className="text-xs text-text-tertiary font-semibold uppercase tracking-widest bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full">
              {total.toLocaleString()} Files Found
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="container-dashboard py-6 px-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="glass-luxury rounded-lg p-4 shadow-luxury">
              <p className="text-xs font-semibold text-text-tertiary uppercase">Total Migrated Files</p>
              <p className="text-3xl font-display font-bold text-text-primary mt-2">
                {totalStats.total.toLocaleString()}
              </p>
            </div>
            <div className="glass-luxury rounded-lg p-4 shadow-luxury">
              <p className="text-xs font-semibold text-text-tertiary uppercase">AKROSS Files</p>
              <p className="text-3xl font-display font-bold text-brand-700 mt-2">
                {totalStats.akross.toLocaleString()}
              </p>
            </div>
            <div className="glass-luxury rounded-lg p-4 shadow-luxury">
              <p className="text-xs font-semibold text-text-tertiary uppercase">DAVO Files</p>
              <p className="text-3xl font-display font-bold text-purple-700 mt-2">
                {totalStats.davo.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="glass-luxury rounded-lg p-4 shadow-luxury mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex items-center gap-3">
                <Search className="w-5 h-5 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search by Patient ID or Filename..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder:text-text-tertiary"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-text-tertiary" />
                <select
                  value={facilityFilter}
                  onChange={(e) => handleFacilityFilterChange(e.target.value)}
                  className="bg-surface-sunken border border-gray-300 rounded-lg px-4 py-2 text-sm font-semibold text-text-primary"
                >
                  <option value="all">All Facilities</option>
                  <option value="AKROSS">AKROSS</option>
                  <option value="DAVO">DAVO (All)</option>
                  <option value="DAVO_Feb">DAVO (Feb)</option>
                  <option value="DAVO_Mar">DAVO (Mar)</option>
                  <option value="DAVO_Apr">DAVO (Apr)</option>
                  <option value="DAVO_May">DAVO (May)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={fileTypeFilter}
                  onChange={(e) => handleFileTypeFilterChange(e.target.value)}
                  className="bg-surface-sunken border border-gray-300 rounded-lg px-4 py-2 text-sm font-semibold text-text-primary"
                >
                  <option value="all">All File Types</option>
                  <option value="dcm">DICOM Images (.dcm)</option>
                  <option value="pdf">PDF Reports (.pdf)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Records Grid */}
          {loading ? (
            <div className="p-24 text-center">
              <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-text-secondary font-semibold">Loading file inventory...</p>
            </div>
          ) : (
            <>
              <div className="glass-luxury rounded-lg shadow-luxury overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-brand-500 to-brand-600 text-white">
                      <tr>
                        <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider">File ID</th>
                        <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Filename</th>
                        <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Patient ID</th>
                        <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Facility</th>
                        <th className="px-6 py-3.5 text-center text-xs font-bold uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-wider">Size</th>
                        <th className="px-6 py-3.5 text-center text-xs font-bold uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {files.map((file, index) => {
                        const Icon = file.file_type === 'dcm' ? ImageIcon : FileText
                        return (
                          <tr
                            key={file.id}
                            className={`hover:bg-brand-50/40 transition-colors ${
                              index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                            }`}
                          >
                            <td className="px-6 py-4 text-sm text-text-primary">#{file.id}</td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-semibold text-text-primary block truncate max-w-xs">
                                {file.filename}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {file.inmate_id ? (
                                <button
                                  onClick={() => setSelectedPatientId(file.inmate_id!)}
                                  className="text-sm font-bold text-brand-700 hover:underline hover:text-brand-900"
                                >
                                  {file.inmate_id}
                                </button>
                              ) : (
                                <span className="text-text-tertiary text-sm italic">Unknown</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold ${
                                file.facility?.startsWith('AKROSS')
                                  ? 'bg-brand-50 text-brand-700 border border-brand-200'
                                  : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}>
                                {file.facility}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold ${
                                file.file_type === 'dcm' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                              }`}>
                                <Icon className="w-3.5 h-3.5" />
                                {file.file_type.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-text-secondary">
                              {file.size_bytes ? `${(file.size_bytes / (1024 * 1024)).toFixed(2)} MB` : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {file.inmate_id && (
                                  <button
                                    onClick={() => setSelectedPatientId(file.inmate_id!)}
                                    className="p-1.5 text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                                    title="View Patient Sessions"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </button>
                                )}
                                <a
                                  href={apiUrl(`/api/v1/files/${file.id}/download`)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-text-secondary hover:bg-gray-100 rounded-lg transition-colors text-xs font-bold"
                                  title="Download File"
                                >
                                  Download
                                </a>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {files.length === 0 && (
                  <div className="p-16 text-center">
                    <p className="text-text-tertiary text-lg font-semibold">No files matched search parameters</p>
                    <p className="text-text-disabled text-sm mt-2">
                      Try updating search keywords or filter criteria
                    </p>
                  </div>
                )}
                
                {/* Pagination Controls */}
                {total > 0 && (
                  <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-xs text-text-secondary">
                      Showing <span className="font-semibold text-text-primary">{showingFrom}</span> to{' '}
                      <span className="font-semibold text-text-primary">{showingTo}</span> of{' '}
                      <span className="font-semibold text-text-primary">{total.toLocaleString()}</span> files
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                        className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      
                      <div className="text-sm font-semibold text-text-secondary">
                        Page <span className="text-text-primary">{page}</span> of {totalPages}
                      </div>
                      
                      <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages}
                        className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Patient Detail Modal */}
      {selectedPatientId && (
        <PatientDetailModal
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
        />
      )}
    </>
  )
}

export default function RecordsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface-page flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary font-semibold">Loading records...</p>
        </div>
      </div>
    }>
      <RecordsContent />
    </Suspense>
  )
}
