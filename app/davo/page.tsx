'use client'

import Sidebar from '@/components/Sidebar'
import DriveExplorer from '@/components/DriveExplorer'

export default function DavoPage() {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-purple-50/70 via-sky-50/50 to-indigo-50/70 text-slate-900 font-sans max-w-full overflow-x-hidden">
      <Sidebar />

      <main className="flex-1 min-w-0 lg:ml-20 p-4 md:p-8 space-y-6 transition-all duration-300 max-w-full overflow-x-hidden">
        <DriveExplorer facility="DAVO" />
      </main>
    </div>
  )
}
