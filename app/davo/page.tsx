'use client'

import Sidebar from '@/components/Sidebar'
import DriveExplorer from '@/components/DriveExplorer'

export default function DavoPage() {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-purple-50/70 via-sky-50/50 to-indigo-50/70 text-slate-900 font-sans">
      <Sidebar />

      <main className="flex-1 lg:ml-20 p-6 md:p-8 space-y-6 transition-all duration-300">
        <DriveExplorer facility="DAVO" />
      </main>
    </div>
  )
}
