'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Database, FileText, Menu, X, ShieldCheck, Activity } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home, badge: 'Overview' },
  { name: 'Akross', href: '/akross', icon: Database, badge: 'Facility' },
  { name: 'Davo', href: '/davo', icon: FileText, badge: 'Facility' },
]

export default function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-slate-900 text-white shadow-lg border border-slate-700/50"
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-slate-950/95 backdrop-blur-xl border-r border-slate-800/80 z-40
          transform transition-all duration-300 ease-out flex flex-col justify-between
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div>
          {/* Logo & Header */}
          <div className="px-6 py-6 border-b border-slate-800/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                Files Transmitter
              </h1>
              <p className="text-[11px] font-medium text-slate-400">Alliance India TB/HIV</p>
            </div>
          </div>

          {/* Navigation Items (Dashboard, Akross, Davo) */}
          <div className="px-4 py-6">
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
              Core Applications
            </p>
            <nav className="space-y-1.5">
              {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                const Icon = item.icon

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={`
                      group flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold
                      transition-all duration-200 border
                      ${isActive
                        ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/30 text-white border-indigo-500/50 shadow-md shadow-indigo-500/10'
                        : 'text-slate-400 border-transparent hover:bg-slate-900 hover:text-slate-200'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                      <span>{item.name}</span>
                    </div>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shadow-sm shadow-indigo-400" />
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Footer System Health */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/50">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div>
                <p className="text-xs font-bold text-slate-200">System Connected</p>
                <p className="text-[10px] text-slate-400">FastAPI & Azure Active</p>
              </div>
            </div>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-30"
        />
      )}
    </>
  )
}
