'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Database, HardDrive, Clock, Activity, BarChart3 } from 'lucide-react'

interface LiveStats {
  total_files: number
  total_size_gb: number
  is_running?: boolean
  facilities: {
    name: string
    count: number
    size_gb: number
  }[]
  file_types: {
    type: string
    count: number
    percentage: number
  }[]
  migration_status: {
    completed: number
    pending: number
    failed: number
  }
  last_updated: string
}

export default function LiveStatsPanel() {
  const [stats, setStats] = useState<LiveStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    const fetchLiveStats = async () => {
      try {
        const response = await fetch('/api/v1/stats/live')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
          setLastUpdate(new Date())
        }
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch live stats:', error)
        setLoading(false)
      }
    }

    fetchLiveStats()
    const interval = setInterval(fetchLiveStats, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [])

  if (loading || !stats) {
    return (
      <div className="glass-luxury rounded-lg p-6 shadow-luxury animate-pulse">
        <div className="h-6 bg-surface-sunken rounded w-1/3 mb-4" />
        <div className="space-y-3">
          <div className="h-4 bg-surface-sunken rounded w-full" />
          <div className="h-4 bg-surface-sunken rounded w-5/6" />
          <div className="h-4 bg-surface-sunken rounded w-4/6" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Real-time Indicator */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-3 h-3 bg-green-500 rounded-full shadow-lg"
          />
          <span className="text-sm font-bold text-text-primary">Live Statistics</span>
          <span className="text-xs text-text-tertiary">
            Updated {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
        <Activity className="w-5 h-5 text-brand-600" />
      </motion.div>

      {/* Overall Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-luxury rounded-lg p-4 shadow-luxury"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center">
              <Database className="w-5 h-5 text-brand-700" />
            </div>
            <div>
              <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                Total Files
              </p>
              <p className="text-2xl font-display font-bold text-text-primary">
                {stats.total_files.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="font-semibold">
              {stats.migration_status.completed.toLocaleString()} completed
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-luxury rounded-lg p-4 shadow-luxury"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                Total Size
              </p>
              <p className="text-2xl font-display font-bold text-text-primary">
                {stats.total_size_gb.toFixed(1)} GB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <BarChart3 className="w-4 h-4 text-purple-600" />
            <span className="font-semibold">
              Across {stats.facilities.length} facilities
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-luxury rounded-lg p-4 shadow-luxury"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-cyan-700" />
            </div>
            <div>
              <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                Status
              </p>
              <p className={`text-2xl font-display font-bold ${stats.is_running ? 'text-amber-500 animate-pulse' : 'text-green-600'}`}>
                {stats.is_running ? 'Active' : 'Complete'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span className="font-semibold">
              {stats.is_running ? 'Migration in progress' : `${((stats.migration_status.completed / stats.total_files) * 100).toFixed(2)}% success rate`}
            </span>
          </div>
        </motion.div>
      </div>

    </div>
  )
}
