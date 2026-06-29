'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, Filter, FileText, Image as ImageIcon, AlertCircle, CheckCircle, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import PatientDetailModal from '@/components/PatientDetailModal'
import { apiUrl } from '@/lib/api'

interface PatientRecord {
  patient_id: string
  facility: string
  total_sessions: number
  total_dcm_files: number
  total_pdf_files: number
  total_files: number
  first_scan_date?: string
  last_scan_date?: string
  has_complete_set: boolean
}

function PatientsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const facilityParam = searchParams.get('facility')
  
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [facilityFilter, setFacilityFilter] = useState<string>(facilityParam || 'all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  
  const [stats, setStats] = useState({
    total_patients: 0,
    akross_patients: 0,
    davo_patients: 0,
    complete_sets: 0,
    incomplete_sets: 0,
    with_dcm_only: 0,
    with_pdf_only: 0
  })

  // Synchronize URL facility param
  useEffect(() => {
    if (facilityParam) {
      setFacilityFilter(facilityParam)
    }
  }, [facilityParam])

  // Fetch stats once on load
  useEffect(() => {
    fetchStats()
  }, [])

  // Fetch patients when filter/page/search changes
  useEffect(() => {
    fetchPatients()
  }, [page, limit, facilityFilter, statusFilter, searchQuery])

  const fetchStats = async () => {
    try {
      const response = await fetch(apiUrl('/api/v1/patients/stats'))
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch patient stats:', error)
    }
  }

  const fetchPatients = async () => {
    try {
      setLoading(true)
      let url = `/api/v1/patients?page=${page}&limit=${limit}`
      
      if (facilityFilter !== 'all') {
        url += `&facility=${facilityFilter}`
      }
      
      if (statusFilter === 'complete') {
        url += `&has_complete_set=true`
      } else if (statusFilter === 'incomplete') {
        url += `&has_complete_set=false`
      }
      
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`
      }
      
      const response = await fetch(apiUrl(url))
      if (response.ok) {
        const data = await response.json()
        setPatients(data.patients || [])
        setTotal(data.total || 0)
      }
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch patients:', error)
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
    
    // Update URL query parameters for consistency
    const params = new URLSearchParams()
    if (val !== 'all') {
      params.set('facility', val)
    }
    router.push(`/patients?${params.toString()}`)
  }

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val)
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
    <div className="flex min-h-screen bg-surface-page">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        {/* Header */}
        <div className="glass-luxury border-b border-white/50 px-6 py-4 shadow-luxury">
          <div className="container-dashboard flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-display font-bold text-text-primary">
                Patient Index - {facilityFilter === 'all' ? 'All Facilities' : facilityFilter}
              </h1>
              <p className="text-sm text-text-tertiary mt-1">
                Patient-centric repository for AKROSS and DAVO screening datasets
              </p>
            </div>
            <div className="text-xs text-text-tertiary font-semibold uppercase tracking-widest bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full">
              {total.toLocaleString()} Patients Listed
            </div>
          </div>
        </div>

        <main className="container-dashboard py-6 px-6">
          {/* Stats Summary Panel */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            <div className="glass-luxury rounded-lg p-4 shadow-luxury">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-brand-500" />
                <p className="text-[10px] font-semibold text-text-tertiary uppercase">Total Patients</p>
              </div>
              <p className="text-xl font-display font-bold text-text-primary">
                {stats.total_patients.toLocaleString()}
              </p>
            </div>

            <div className="glass-luxury rounded-lg p-4 shadow-luxury">
              <p className="text-[10px] font-semibold text-text-tertiary uppercase mb-2">AKROSS</p>
              <p className="text-xl font-display font-bold text-brand-700">
                {stats.akross_patients.toLocaleString()}
              </p>
            </div>

            <div className="glass-luxury rounded-lg p-4 shadow-luxury">
              <p className="text-[10px] font-semibold text-text-tertiary uppercase mb-2">DAVO</p>
              <p className="text-xl font-display font-bold text-purple-700">
                {stats.davo_patients.toLocaleString()}
              </p>
            </div>

            <div className="glass-luxury rounded-lg p-4 shadow-luxury">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-[10px] font-semibold text-text-tertiary uppercase">Complete Set</p>
              </div>
              <p className="text-xl font-display font-bold text-green-600">
                {stats.complete_sets.toLocaleString()}
              </p>
            </div>

            <div className="glass-luxury rounded-lg p-4 shadow-luxury">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <p className="text-[10px] font-semibold text-text-tertiary uppercase">Incomplete Set</p>
              </div>
              <p className="text-xl font-display font-bold text-amber-600">
                {stats.incomplete_sets.toLocaleString()}
              </p>
            </div>

            <div className="glass-luxury rounded-lg p-4 shadow-luxury">
              <p className="text-[10px] font-semibold text-text-tertiary uppercase mb-2">DCM Only</p>
              <p className="text-xl font-display font-bold text-blue-700">
                {stats.with_dcm_only.toLocaleString()}
              </p>
            </div>

            <div className="glass-luxury rounded-lg p-4 shadow-luxury">
              <p className="text-[10px] font-semibold text-text-tertiary uppercase mb-2">PDF Only</p>
              <p className="text-xl font-display font-bold text-red-700">
                {stats.with_pdf_only.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Filtering Panel */}
          <div className="glass-luxury rounded-lg p-4 shadow-luxury mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex items-center gap-3">
                <Search className="w-5 h-5 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search by Patient ID (e.g. AS02IND00100031)..."
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
                  <option value="DAVO_Feb">DAVO (February)</option>
                  <option value="DAVO_Mar">DAVO (March)</option>
                  <option value="DAVO_Apr">DAVO (April)</option>
                  <option value="DAVO_May">DAVO (May)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="bg-surface-sunken border border-gray-300 rounded-lg px-4 py-2 text-sm font-semibold text-text-primary"
                >
                  <option value="all">All Statuses</option>
                  <option value="complete">Complete Set (DCM + PDF)</option>
                  <option value="incomplete">Incomplete Set</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Panel */}
          <div className="glass-luxury rounded-lg shadow-luxury overflow-hidden">
            {loading ? (
              <div className="p-24 text-center">
                <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-text-secondary font-semibold">Loading patient records...</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-brand-500 to-brand-600 text-white">
                      <tr>
                        <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Patient ID</th>
                        <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Facility</th>
                        <th className="px-6 py-3.5 text-center text-xs font-bold uppercase tracking-wider">DCM Files</th>
                        <th className="px-6 py-3.5 text-center text-xs font-bold uppercase tracking-wider">PDF Files</th>
                        <th className="px-6 py-3.5 text-center text-xs font-bold uppercase tracking-wider">Total Files</th>
                        <th className="px-6 py-3.5 text-center text-xs font-bold uppercase tracking-wider">Sessions</th>
                        <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Scan Date Range</th>
                        <th className="px-6 py-3.5 text-center text-xs font-bold uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {patients.map((patient, index) => (
                        <tr
                          key={patient.patient_id}
                          onClick={() => setSelectedPatientId(patient.patient_id)}
                          className={`hover:bg-brand-50/40 cursor-pointer transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-brand-700 hover:underline">
                              {patient.patient_id}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold ${
                              patient.facility === 'AKROSS'
                                ? 'bg-brand-50 text-brand-700 border border-brand-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}>
                              {patient.facility}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <ImageIcon className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-semibold text-text-primary">
                                {patient.total_dcm_files}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <FileText className="w-4 h-4 text-red-600" />
                              <span className="text-sm font-semibold text-text-primary">
                                {patient.total_pdf_files}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-bold text-text-primary">
                            {patient.total_files}
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-text-secondary">
                            {patient.total_sessions}
                          </td>
                          <td className="px-6 py-4 text-sm text-text-secondary">
                            {patient.first_scan_date
                              ? `${patient.first_scan_date} to ${patient.last_scan_date || 'N/A'}`
                              : 'No scans recorded'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {patient.has_complete_set ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-200">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Complete
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Incomplete
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {patients.length === 0 && (
                  <div className="p-16 text-center">
                    <p className="text-text-tertiary text-lg font-semibold">No patient records matched search parameters</p>
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
                      <span className="font-semibold text-text-primary">{total.toLocaleString()}</span> patients
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
              </>
            )}
          </div>
        </main>
      </div>

      {/* Patient Detail Modal */}
      {selectedPatientId && (
        <PatientDetailModal
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
        />
      )}
    </div>
  )
}

export default function PatientsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-surface-page items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary font-semibold">Loading Patients...</p>
        </div>
      </div>
    }>
      <PatientsContent />
    </Suspense>
  )
}
