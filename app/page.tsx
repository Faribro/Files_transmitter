'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Database, Layers, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import MigrationMonitor from '@/components/MigrationMonitor'
import LiveStatsPanel from '@/components/LiveStatsPanel'
import { apiUrl } from '@/lib/api'

interface DashboardStats {
  total_files: number
  by_facility: Record<string, number>
  by_type: Record<string, number>
  by_status: Record<string, number>
  total_size_gb: number
  grouped_facilities?: {
    AKROSS: number
    DAVO: number
  }
  akross_by_type?: Record<string, number>
  davo_by_type?: Record<string, number>
}

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'akross' | 'davo'>('akross')

  useEffect(() => {
    // Fetch live migration stats with file type distribution
    Promise.all([
      fetch(apiUrl('/api/v1/stats/dashboard')).then(res => res.json()),
      fetch(apiUrl('/api/v1/files?facility=AKROSS&limit=1&status=completed')).then(res => res.json()),
      fetch(apiUrl('/api/v1/files?facility=DAVO&limit=1&status=completed')).then(res => res.json()),
      fetch(apiUrl('/api/v1/stats/dashboard?facility=AKROSS')).then(res => res.json()),
      fetch(apiUrl('/api/v1/stats/dashboard?facility=DAVO')).then(res => res.json()),
    ])
      .then(([dashboardData, akrossData, davoData, akrossStats, davoStats]) => {
        const updatedData = {
          ...dashboardData,
          grouped_facilities: {
            AKROSS: akrossData.total || 0,
            DAVO: davoData.total || 0
          },
          akross_by_type: akrossStats.by_type || {},
          davo_by_type: davoStats.by_type || {}
        }
        setStats(updatedData)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch stats:', err)
        setLoading(false)
      })

    // Refresh stats every 10 seconds to show live migration progress
    const interval = setInterval(() => {
      Promise.all([
        fetch(apiUrl('/api/v1/stats/dashboard')).then(res => res.json()),
        fetch(apiUrl('/api/v1/files?facility=AKROSS&limit=1&status=completed')).then(res => res.json()),
        fetch(apiUrl('/api/v1/files?facility=DAVO&limit=1&status=completed')).then(res => res.json()),
        fetch(apiUrl('/api/v1/stats/dashboard?facility=AKROSS')).then(res => res.json()),
        fetch(apiUrl('/api/v1/stats/dashboard?facility=DAVO')).then(res => res.json()),
      ])
        .then(([dashboardData, akrossData, davoData, akrossStats, davoStats]) => {
          const updatedData = {
            ...dashboardData,
            grouped_facilities: {
              AKROSS: akrossData.total || 0,
              DAVO: davoData.total || 0
            },
            akross_by_type: akrossStats.by_type || {},
            davo_by_type: davoStats.by_type || {}
          }
          setStats(updatedData)
        })
        .catch(err => console.error('Failed to refresh stats:', err))
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-page flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary font-semibold">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-surface-page">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-luxury border-b border-white/50 px-6 py-4 shadow-luxury"
      >
        <div className="container-dashboard">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black bg-gradient-dashboard bg-clip-text text-transparent tracking-tight">
                Medical Files Dashboard
              </h1>
              <p className="text-xs font-semibold text-text-tertiary tracking-wide mt-0.5">
                TB / HIV Programme Analytics — Alliance India
              </p>
            </div>
            <div className="flex-shrink-0 min-w-0 max-w-2xl">
              <MigrationMonitor layout="header" />
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main id="main-content" className="container-dashboard py-8">
        <MigrationMonitor layout="body" />

        {/* Live Stats Panel */}
        <div className="mt-0">
          <LiveStatsPanel />
        </div>


        {/* KPI Cards Grid */}
        <div className="grid-dashboard mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="kpi-card"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-brand-100 flex items-center justify-center">
                <Database className="w-6 h-6 text-brand-700" />
              </div>
              <span className="text-xs font-bold text-status-stable bg-emerald-50 px-2 py-1 rounded-full">
                Active
              </span>
            </div>
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
              Total Files
            </p>
            <p className="text-4xl font-display font-bold text-text-primary mb-1">
              {stats?.total_files.toLocaleString()}
            </p>
            <p className="text-xs text-text-secondary">
              {stats?.total_size_gb.toFixed(2)} GB total
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="kpi-card"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Layers className="w-6 h-6 text-purple-700" />
              </div>
            </div>
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
              Facilities
            </p>
            <p className="text-4xl font-display font-bold text-text-primary mb-1">
              {Object.keys(stats?.by_facility || {}).length}
            </p>
            <p className="text-xs text-text-secondary">
              AKROSS: {stats?.grouped_facilities?.AKROSS?.toLocaleString() || 0} • DAVO: {stats?.grouped_facilities?.DAVO?.toLocaleString() || 0}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="kpi-card"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-cyan-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-cyan-700" />
              </div>
            </div>
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
              File Types
            </p>
            <p className="text-4xl font-display font-bold text-text-primary mb-1">
              {Object.keys(stats?.by_type || {}).length}
            </p>
            <p className="text-xs text-text-secondary">
              PDF: {stats?.by_type?.pdf?.toLocaleString() || 0} files
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="kpi-card"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-700" />
              </div>
            </div>
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
              Pending
            </p>
            <p className="text-4xl font-display font-bold text-text-primary mb-1">
              {stats?.by_status?.pending?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-text-secondary">
              Awaiting processing
            </p>
          </motion.div>
        </div>

        {/* Facility Tabs - AKROSS and DAVO only */}
        <div className="glass-luxury rounded-lg p-1 shadow-luxury mb-6 inline-flex">
          <button
            onClick={() => setActiveTab('akross')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'akross'
                ? 'bg-brand-500 text-white shadow-luxury'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            AKROSS Migration
          </button>
          <button
            onClick={() => setActiveTab('davo')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'davo'
                ? 'bg-brand-500 text-white shadow-luxury'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            DAVO Migration
          </button>
        </div>

        {/* AKROSS Tab - AKROSS File Type Distribution */}
        {activeTab === 'akross' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-luxury rounded-lg p-6 shadow-luxury mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-bold">AKROSS - File Type Distribution</h2>
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-2 h-2 bg-green-500 rounded-full"
                />
                <span className="text-xs font-semibold text-text-tertiary">Live</span>
              </div>
            </div>
            {stats?.akross_by_type && Object.keys(stats.akross_by_type).length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(stats.akross_by_type)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 10)
                  .map(([type, count]) => (
                  <motion.div 
                    key={type} 
                    className="text-center p-4 bg-surface-sunken rounded-lg hover:shadow-lg transition-all"
                    whileHover={{ scale: 1.05 }}
                  >
                    <p className="text-2xl font-display font-bold text-brand-700">
                      {(count as number).toLocaleString()}
                    </p>
                    <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mt-1">
                      .{type}
                    </p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Database className="w-12 h-12 text-text-tertiary mx-auto mb-3 opacity-50" />
                <p className="text-text-secondary font-semibold">Loading AKROSS file type data...</p>
                <p className="text-xs text-text-tertiary mt-1">Migration in progress</p>
              </div>
            )}
          </motion.div>
        )}

        {/* DAVO Tab - DAVO File Type Distribution */}
        {activeTab === 'davo' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-luxury rounded-lg p-6 shadow-luxury mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-bold">DAVO - File Type Distribution</h2>
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-2 h-2 bg-green-500 rounded-full"
                />
                <span className="text-xs font-semibold text-text-tertiary">Live</span>
              </div>
            </div>
            {stats?.davo_by_type && Object.keys(stats.davo_by_type).length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(stats.davo_by_type)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 10)
                  .map(([type, count]) => (
                  <motion.div 
                    key={type} 
                    className="text-center p-4 bg-surface-sunken rounded-lg hover:shadow-lg transition-all"
                    whileHover={{ scale: 1.05 }}
                  >
                    <p className="text-2xl font-display font-bold text-purple-700">
                      {(count as number).toLocaleString()}
                    </p>
                    <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mt-1">
                      .{type}
                    </p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Database className="w-12 h-12 text-text-tertiary mx-auto mb-3 opacity-50" />
                <p className="text-text-secondary font-semibold">Loading DAVO file type data...</p>
                <p className="text-xs text-text-tertiary mt-1">Migration in progress</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Link
            href="/records?facility=akross"
            className="glass-luxury rounded-lg p-6 shadow-luxury hover:shadow-luxury-lg transition-all hover:-translate-y-1 group"
          >
            <h3 className="text-lg font-display font-bold mb-2 group-hover:text-brand-700 transition-colors">
              AKROSS Migration
            </h3>
            <p className="text-sm text-text-secondary">
              {stats?.grouped_facilities?.AKROSS || 0 > 0 
                ? `View ${stats?.grouped_facilities?.AKROSS?.toLocaleString()} migrated records from AKROSS facility`
                : 'AKROSS facility migration in progress'}
            </p>
          </Link>

          <Link
            href="/records?facility=davo"
            className="glass-luxury rounded-lg p-6 shadow-luxury hover:shadow-luxury-lg transition-all hover:-translate-y-1 group"
          >
            <h3 className="text-lg font-display font-bold mb-2 group-hover:text-brand-700 transition-colors">
              DAVO Migration
            </h3>
            <p className="text-sm text-text-secondary">
              {stats?.grouped_facilities?.DAVO || 0 > 0
                ? `View ${stats?.grouped_facilities?.DAVO?.toLocaleString()} migrated records from DAVO facility`
                : 'DAVO facility migration in progress'}
            </p>
          </Link>

          <Link
            href="/records"
            className="glass-luxury rounded-lg p-6 shadow-luxury hover:shadow-luxury-lg transition-all hover:-translate-y-1 group"
          >
            <h3 className="text-lg font-display font-bold mb-2 group-hover:text-brand-700 transition-colors">
              All Records
            </h3>
            <p className="text-sm text-text-secondary">
              Browse all migrated patient records ({(stats?.grouped_facilities?.AKROSS || 0) + (stats?.grouped_facilities?.DAVO || 0)} completed)
            </p>
          </Link>
        </motion.div>
      </main>
      </div>
    </div>
  )
}

// AGENT: Beautiful dashboard with glass-morphism cards, animated KPIs, and live API data