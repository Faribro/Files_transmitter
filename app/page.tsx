'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Database, Layers, ArrowRight, Activity, HardDrive, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import LiveStatsPanel from '@/components/LiveStatsPanel'
import MigrationMonitor from '@/components/MigrationMonitor'

export default function HomePage() {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-50/70 via-sky-50/50 to-purple-50/70 text-slate-900 font-sans">
      <Sidebar />

      <main className="flex-1 lg:ml-20 p-6 md:p-8 space-y-8 transition-all duration-300">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              Medical Files Transmitter
            </h1>
            <p className="text-xs text-slate-500 font-bold mt-1">
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
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
            Select Facility Workspace
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* AKROSS WORKSPACE CARD */}
            <Link href="/akross">
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="group relative p-8 rounded-3xl bg-white hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/50 border border-slate-200/80 hover:border-indigo-400 transition-all shadow-xl shadow-indigo-500/5 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer overflow-hidden"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                    <Database className="w-7 h-7 text-indigo-600 group-hover:text-white transition-colors" />
                  </div>
                  <span className="px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200">
                    100% Synced
                  </span>
                </div>

                <h3 className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                  AKROSS Facility Workspace
                </h3>
                <p className="text-xs font-bold text-slate-500 mt-2">
                  Access Akross monthly grid, 1:1 patient matching analytics, and Google Drive file explorer.
                </p>

                <div className="mt-8 flex items-center justify-between pt-4 border-t border-slate-100 text-xs font-extrabold text-indigo-600 group-hover:text-indigo-700">
                  <span>Open Akross Explorer & Grid</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            </Link>

            {/* DAVO WORKSPACE CARD */}
            <Link href="/davo">
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="group relative p-8 rounded-3xl bg-white hover:bg-gradient-to-br hover:from-white hover:to-purple-50/50 border border-slate-200/80 hover:border-purple-400 transition-all shadow-xl shadow-purple-500/5 hover:shadow-2xl hover:shadow-purple-500/10 cursor-pointer overflow-hidden"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                    <FileText className="w-7 h-7 text-purple-600 group-hover:text-white transition-colors" />
                  </div>
                  <span className="px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200">
                    100% Synced
                  </span>
                </div>

                <h3 className="text-2xl font-black text-slate-900 group-hover:text-purple-600 transition-colors">
                  DAVO Facility Workspace
                </h3>
                <p className="text-xs font-bold text-slate-500 mt-2">
                  Access Davo monthly grid, 1:1 patient matching analytics, and Google Drive file explorer.
                </p>

                <div className="mt-8 flex items-center justify-between pt-4 border-t border-slate-100 text-xs font-extrabold text-purple-600 group-hover:text-purple-700">
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