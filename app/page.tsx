'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Database, Layers, ArrowRight, Activity, HardDrive, CheckCircle2, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import LiveStatsPanel from '@/components/LiveStatsPanel'
import MigrationMonitor from '@/components/MigrationMonitor'

export default function HomePage() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-6 md:p-8 space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Medical Files Transmitter
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Alliance India — TB / HIV Programme Central Dashboard
            </p>
          </div>
          <MigrationMonitor layout="header" />
        </div>

        {/* LIVE SYSTEM STATS */}
        <LiveStatsPanel />

        {/* ────────────────────────────────────────────────────────────────────────── */}
        {/* QUICK ACCESS FACILITY WORKSPACES */}
        {/* ────────────────────────────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
            Select Facility Workspace
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* AKROSS WORKSPACE CARD */}
            <Link href="/akross">
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="group relative p-6 rounded-2xl bg-gradient-to-br from-indigo-900/40 via-slate-900 to-slate-950 border border-indigo-500/30 hover:border-indigo-500 transition-all shadow-2xl overflow-hidden cursor-pointer"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                    <Database className="w-6 h-6 text-indigo-400" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                    100% Synced
                  </span>
                </div>

                <h3 className="text-xl font-black text-white group-hover:text-indigo-300 transition-colors">
                  AKROSS Facility Workspace
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Access Akross monthly grid, 1:1 patient matching analytics, and Google Drive file explorer.
                </p>

                <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-800/80 text-xs font-bold text-indigo-400 group-hover:text-indigo-300">
                  <span>Open Akross Explorer & Grid</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            </Link>

            {/* DAVO WORKSPACE CARD */}
            <Link href="/davo">
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="group relative p-6 rounded-2xl bg-gradient-to-br from-purple-900/40 via-slate-900 to-slate-950 border border-purple-500/30 hover:border-purple-500 transition-all shadow-2xl overflow-hidden cursor-pointer"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-purple-400" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                    100% Synced
                  </span>
                </div>

                <h3 className="text-xl font-black text-white group-hover:text-purple-300 transition-colors">
                  DAVO Facility Workspace
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Access Davo monthly grid, 1:1 patient matching analytics, and Google Drive file explorer.
                </p>

                <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-800/80 text-xs font-bold text-purple-400 group-hover:text-purple-300">
                  <span>Open Davo Explorer & Grid</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            </Link>

          </div>
        </div>

      </main>
    </div>
  )
}