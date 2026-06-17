'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, Filter } from 'lucide-react'
import RecordCard from '@/components/RecordCard'
import RecordModal from '@/components/RecordModal'

function RecordsContent() {
  const searchParams = useSearchParams()
  const facilityFilter = searchParams.get('facility')

  const [records, setRecords] = useState<any[]>([])
  const [filteredRecords, setFilteredRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'akross' | 'davo'>(
    facilityFilter === 'akross' ? 'akross' : facilityFilter === 'davo' ? 'davo' : 'all'
  )
  const [totalStats, setTotalStats] = useState({ total: 0, akross: 0, davo: 0 })

  useEffect(() => {
    // Fetch real data from backend API with pagination
    const fetchRecords = async () => {
      try {
        // First, get total stats from dashboard endpoint
        const statsResponse = await fetch('/api/v1/stats/dashboard')
        const statsData = await statsResponse.json()
        
        // Calculate stats
        const akrossCount = statsData.by_facility?.AKROSS || 0
        const davoCount = Object.entries(statsData.by_facility || {})
          .filter(([key]) => key.startsWith('DAVO'))
          .reduce((sum, [, count]) => sum + (count as number), 0)
        
        setTotalStats({
          total: statsData.total_files || 0,
          akross: akrossCount,
          davo: davoCount
        })
        
        // Fetch paginated records (limit 500 for display)
        const response = await fetch('/api/v1/files?limit=500')
        const data = await response.json()
        
        // Transform API response to component format
        const transformedRecords = data.files.map((file: any) => {
          // Normalize facility name (DAVO_Feb, DAVO_Mar, DAVO_Apr -> DAVO)
          const facility = file.facility?.startsWith('DAVO') ? 'DAVO' : file.facility
          
          return {
            id: file.inmate_id || `FILE${file.id}`,
            name: file.inmate_name || file.filename || 'Unknown',
            age: 0, // Not in current schema
            tb_status: file.migration_status === 'completed' ? 'Completed' : 
                      file.migration_status === 'pending' ? 'Pending' : 
                      file.migration_status || 'Unknown',
            facility: facility || 'Unknown',
            date: file.scan_date?.split('T')[0] || file.discovered_at?.split('T')[0] || '',
            pdf_path: file.file_type === 'pdf' ? `/api/v1/files/${file.id}/download` : null,
            dcm_path: (file.file_type === 'dcm' || file.file_type === 'png' || file.file_type === 'jpg') ? `/api/v1/files/${file.id}/download` : null,
            fileType: file.file_type,
            originalFacility: file.facility,
            fileId: file.id,
          }
        })
        
        setRecords(transformedRecords)
      } catch (error) {
        console.error('Failed to fetch records:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchRecords()
  }, [])

  useEffect(() => {
    let filtered = records

    // Filter by facility tab
    if (activeTab === 'akross') {
      filtered = filtered.filter(r => r.facility.toLowerCase() === 'akross')
    } else if (activeTab === 'davo') {
      filtered = filtered.filter(r => r.facility.toLowerCase() === 'davo')
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredRecords(filtered)
  }, [records, activeTab, searchQuery])

  const akrossCount = totalStats.akross
  const davoCount = totalStats.davo

  const handleViewDetails = (record: any) => {
    setSelectedRecord(record)
    setModalOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-page flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary font-semibold">Loading records...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-page">
      {/* Header */}
      <div className="glass-luxury border-b border-white/50 px-6 py-4 shadow-luxury">
        <div className="container-dashboard">
          <h1 className="text-2xl font-display font-bold text-text-primary">
            Patient Records
          </h1>
          <p className="text-sm text-text-tertiary mt-1">
            View and manage medical records from AKROSS and DAVO facilities
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="container-dashboard py-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="glass-luxury rounded-lg p-4 shadow-luxury">
            <p className="text-xs font-semibold text-text-tertiary uppercase">Total Records</p>
            <p className="text-3xl font-display font-bold text-text-primary mt-2">
              {totalStats.total.toLocaleString()}
            </p>
            <p className="text-xs text-text-tertiary mt-1">Showing {records.length} on page</p>
          </div>
          <div className="glass-luxury rounded-lg p-4 shadow-luxury">
            <p className="text-xs font-semibold text-text-tertiary uppercase">AKROSS Files</p>
            <p className="text-3xl font-display font-bold text-brand-700 mt-2">
              {akrossCount.toLocaleString()}
            </p>
          </div>
          <div className="glass-luxury rounded-lg p-4 shadow-luxury">
            <p className="text-xs font-semibold text-text-tertiary uppercase">DAVO Files</p>
            <p className="text-3xl font-display font-bold text-brand-700 mt-2">
              {davoCount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="glass-luxury rounded-lg p-1 shadow-luxury mb-6 inline-flex">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-brand-500 text-white shadow-luxury'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            All Records
          </button>
          <button
            onClick={() => setActiveTab('akross')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'akross'
                ? 'bg-brand-500 text-white shadow-luxury'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            AKROSS ({akrossCount})
          </button>
          <button
            onClick={() => setActiveTab('davo')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'davo'
                ? 'bg-brand-500 text-white shadow-luxury'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            DAVO ({davoCount})
          </button>
        </div>

        {/* Search Bar */}
        <div className="glass-luxury rounded-lg p-4 shadow-luxury mb-6">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder:text-text-tertiary"
            />
            <Filter className="w-5 h-5 text-text-tertiary" />
          </div>
        </div>

        {/* Records Grid */}
        {filteredRecords.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecords.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        ) : (
          <div className="glass-luxury rounded-lg p-12 text-center shadow-luxury">
            <p className="text-text-tertiary text-lg">No records found</p>
            <p className="text-text-disabled text-sm mt-2">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </main>

      {/* Modal */}
      <RecordModal
        record={selectedRecord}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
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
