'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, CheckCircle2, Loader2, TrendingUp, HardDrive, Archive, Cloud, Database as DatabaseIcon } from 'lucide-react'

interface MigrationStats {
  is_running: boolean
  active_phase?: string
  total_files: number
  completed: number
  failed: number
  ready: number
  speed_per_min: number
  eta_hours: number
  percent_complete: number
  data_transferred_gb: number
  started_at?: string
  zips_total?: number
  zips_extracted?: number
  zips_remaining?: number
  recent_logs?: string[]
  current_zip_info?: string
}

interface MigrationMonitorProps {
  layout?: 'header' | 'body'
}

export default function MigrationMonitor({ layout = 'body' }: MigrationMonitorProps) {
  const [stats, setStats] = useState<MigrationStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/v1/migration/status')
        const data = await response.json()
        setStats(data)
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch migration stats:', error)
        setLoading(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 3000) // Update every 3 seconds for liveliness

    return () => clearInterval(interval)
  }, [])

  if (loading || !stats) {
    if (layout === 'header') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 animate-pulse">
          <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Checking migration...</span>
        </div>
      )
    }
    return (
      <div className="glass-luxury rounded-lg p-6 shadow-luxury animate-pulse mb-8">
        <div className="h-6 bg-surface-sunken rounded w-1/4 mb-4" />
        <div className="h-20 bg-surface-sunken rounded w-full" />
      </div>
    )
  }

  const isActivelyMigrating = stats.is_running || stats.ready > 0 || (stats.zips_remaining !== undefined && stats.zips_remaining > 0)
  const progress = stats.percent_complete || 0

  // ──────────────────────────────────────────────────────────────────────────
  // HEADER LAYOUT
  // ──────────────────────────────────────────────────────────────────────────
  if (layout === 'header') {
    if (!isActivelyMigrating) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-emerald-800">
            System Complete ({stats.completed.toLocaleString()} files)
          </span>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 shadow-sm">
        <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
        <span className="text-xs font-bold text-amber-800 tracking-tight">
          Live Migration: {progress.toFixed(1)}%
        </span>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BODY LAYOUT
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        className={`glass-luxury rounded-xl shadow-luxury border ${
          isActivelyMigrating ? 'border-brand-200' : 'border-emerald-200'
        } overflow-hidden mb-8 w-full`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Main Metrics & Flow Column */}
          <div className="lg:col-span-7 border-r border-slate-200 flex flex-col justify-between bg-white/40">
            {/* Top Header Section */}
            <div
              className={`p-6 text-white ${
                isActivelyMigrating
                  ? 'bg-gradient-to-r from-brand-500 to-brand-600'
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={isActivelyMigrating ? { rotate: 360 } : {}}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-md"
                  >
                    {isActivelyMigrating ? (
                      <Upload className="w-6 h-6 text-white" />
                    ) : (
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    )}
                  </motion.div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-extrabold tracking-tight">
                        {isActivelyMigrating ? 'Active Migration Pipeline' : 'Migration Pipeline — Complete'}
                      </p>
                      {isActivelyMigrating ? (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-2.5 h-2.5 bg-green-400 rounded-full shadow-glow"
                        />
                      ) : (
                        <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
                      )}
                    </div>
                    <p className="text-xs text-white/90 mt-0.5 font-medium">
                      {isActivelyMigrating
                        ? stats.active_phase || 'Extracting ZIPs & Uploading to Azure'
                        : 'All Google Drive ZIPs extracted & uploaded to Azure Blob Storage'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black drop-shadow-[0_2px_6px_rgba(0,0,0,0.3)] tracking-tight">
                    {progress.toFixed(1)}%
                  </p>
                  <p className="text-[10px] font-extrabold tracking-wider uppercase opacity-90">
                    {isActivelyMigrating ? 'Complete' : 'Succeeded'}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-5 bg-white/20 rounded-full h-3 overflow-hidden shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-full bg-white rounded-full shadow-lg"
                />
              </div>
            </div>

            {/* Animated Flow Diagram */}
            <div className="px-6 py-5 bg-gradient-to-r from-blue-50/40 via-purple-50/40 to-green-50/40 border-b border-gray-100 flex-1 flex flex-col justify-center">
              <div className="flex items-center justify-between relative max-w-xl mx-auto w-full py-2">
                {/* Google Drive Source node */}
                <div className="flex flex-col items-center z-10">
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center shadow-md">
                    <DatabaseIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-[10px] font-bold text-gray-700 mt-2">Google Drive</p>
                  <p className="text-[9px] text-gray-500 font-semibold mt-0.5">
                    {isActivelyMigrating ? `${stats.zips_remaining || 0} ZIPs left` : `${stats.zips_total || 0} ZIPs total`}
                  </p>
                </div>

                {/* Stream line 1 */}
                <div className="flex-1 relative h-0.5 mx-3">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-300 via-purple-300 to-green-300 rounded-full" />
                  {isActivelyMigrating &&
                    [0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-full shadow"
                        animate={{ left: ['-5%', '105%'] }}
                        transition={{ duration: 3, repeat: Infinity, delay: i * 0.9, ease: 'linear' }}
                      />
                    ))}
                </div>

                {/* Extraction process node */}
                <div className="flex flex-col items-center z-10">
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-purple-500 flex items-center justify-center shadow-md">
                    <Archive className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="text-[10px] font-bold text-gray-700 mt-2">Extracting</p>
                  <p className="text-[9px] text-gray-500 font-semibold mt-0.5">
                    {isActivelyMigrating ? `${stats.speed_per_min} files/m` : 'Done'}
                  </p>
                </div>

                {/* Stream line 2 */}
                <div className="flex-1 relative h-0.5 mx-3">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-300 via-cyan-300 to-green-300 rounded-full" />
                  {isActivelyMigrating &&
                    [0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border-2 border-purple-500 rounded-full shadow"
                        animate={{ left: ['-5%', '105%'] }}
                        transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.8, ease: 'linear' }}
                      />
                    ))}
                </div>

                {/* Azure Storage destination node */}
                <div className="flex flex-col items-center z-10">
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-green-500 flex items-center justify-center shadow-md">
                    <Cloud className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-[10px] font-bold text-gray-700 mt-2">Azure Cloud</p>
                  <p className="text-[9px] text-gray-500 font-semibold mt-0.5">{stats.completed.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/50">
              <div className="text-center p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed</p>
                <p className="text-xl font-extrabold text-green-600 mt-1">
                  {stats.completed.toLocaleString()}
                </p>
              </div>

              <div className="text-center p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending</p>
                <p className="text-xl font-extrabold text-amber-600 mt-1">
                  {stats.ready.toLocaleString()}
                </p>
              </div>

              <div className="text-center p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Speed</p>
                <p className={`text-xl font-extrabold mt-1 ${isActivelyMigrating ? 'text-blue-600' : 'text-slate-500'}`}>
                  {isActivelyMigrating ? stats.speed_per_min : 0}
                </p>
                <p className="text-[9px] text-slate-400 font-semibold">files/min</p>
              </div>

              <div className="text-center p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ZIP Archives</p>
                <p className="text-xl font-extrabold text-purple-600 mt-1">
                  {stats.zips_extracted}/{stats.zips_total}
                </p>
                <p className="text-[9px] text-slate-400 font-semibold">
                  {isActivelyMigrating ? `${stats.zips_remaining} left` : 'Completed'}
                </p>
              </div>
            </div>

            {/* Bottom Info Bar */}
            <div className="px-5 py-3 flex items-center justify-between text-[11px] font-semibold border-t border-slate-150 bg-slate-100/50 text-slate-600">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                  {stats.data_transferred_gb.toFixed(2)} GB Transferred
                </span>
                <span className="flex items-center gap-1.5">
                  <DatabaseIcon className="w-3.5 h-3.5 text-blue-500" />
                  {stats.total_files.toLocaleString()} Total Inventory
                </span>
              </div>
              {stats.current_zip_info && (
                <div className="text-brand-700 max-w-[200px] truncate">
                  Active ZIP: {stats.current_zip_info.split(' ')[0]}
                </div>
              )}
            </div>
          </div>

          {/* Right Live Terminal Column */}
          <div className="lg:col-span-5 bg-slate-950 p-5 flex flex-col h-full min-h-[360px] justify-between border-t lg:border-t-0 border-slate-900">
            {/* Terminal Header */}
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-900 pb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  <span className="text-[10px] font-mono font-bold text-slate-500 ml-2 tracking-widest uppercase">
                    {isActivelyMigrating ? 'Live System Terminal' : 'System Terminal Log'}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-1.5 border px-2 py-0.5 rounded ${
                    isActivelyMigrating
                      ? 'bg-emerald-950/50 border-emerald-900'
                      : 'bg-slate-900/50 border-slate-800'
                  }`}
                >
                  <span className="flex h-1.5 w-1.5 relative">
                    {isActivelyMigrating && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                        isActivelyMigrating ? 'bg-emerald-500' : 'bg-slate-500'
                      }`}
                    ></span>
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold uppercase tracking-wider ${
                      isActivelyMigrating ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    {isActivelyMigrating ? 'STREAM' : 'HISTORY'}
                  </span>
                </div>
              </div>

              {/* Terminal Logs View */}
              <div className="font-mono text-[10px] leading-relaxed text-emerald-400 space-y-2.5 overflow-y-auto max-h-[260px] scrollbar-none pr-1">
                {stats.recent_logs && stats.recent_logs.length > 0 ? (
                  stats.recent_logs.map((log, idx) => {
                    // Make highlight terms stand out
                    let isSpecial = false
                    if (log.includes('---') || log.includes('ZIP:') || log.includes('SUMMARY') || log.includes('Report saved')) {
                      isSpecial = true
                    }
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -3 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`whitespace-pre-wrap ${
                          isSpecial ? 'text-amber-300 font-bold border-l-2 border-amber-500/40 pl-1.5 py-0.5' : 'text-emerald-400'
                        }`}
                      >
                        {log}
                      </motion.div>
                    )
                  })
                ) : (
                  <div className="text-slate-600 italic text-center pt-20 flex flex-col items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-700" />
                    <span>Awaiting terminal logs...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Terminal Footer */}
            <div className="mt-4 pt-3 border-t border-slate-900/60 text-[9px] font-mono text-slate-500 flex justify-between items-center">
              <span>VM: prisionvm • Port: 8000</span>
              <span>Updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

