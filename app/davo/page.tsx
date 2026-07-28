'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import DriveExplorer from '@/components/DriveExplorer'
import AsciiFireEffect from '@/components/AsciiFireEffect'

export default function DavoPage() {
  const [isTopBannerBurning, setIsTopBannerBurning] = useState(false)
  const [isTopBannerDissolved, setIsTopBannerDissolved] = useState(false)

  const handleMonthSelect = (month: string) => {
    setIsTopBannerBurning(true)
    setTimeout(() => {
      setIsTopBannerDissolved(true)
      setIsTopBannerBurning(false)
    }, 1800)
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-purple-50/70 via-sky-50/50 to-indigo-50/70 text-slate-900 font-sans">
      <Sidebar />

      <main className="flex-1 lg:ml-20 p-6 md:p-8 space-y-8 transition-all duration-300">
        
        {/* TOP HEADER */}
        <AnimatePresence>
          {!isTopBannerDissolved && (
            <motion.div
              initial={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              className="relative space-y-8 overflow-hidden"
            >
              {isTopBannerBurning && (
                <AsciiFireEffect durationMs={1800} />
              )}

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25 ring-4 ring-white">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">
                      DAVO Facility Workspace
                    </h1>
                    <p className="text-xs text-slate-500 font-bold">
                      Medical files & patient study directories
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GOOGLE DRIVE EXPLORER */}
        <DriveExplorer facility="DAVO" onMonthSelect={handleMonthSelect} />

      </main>
    </div>
  )
}
