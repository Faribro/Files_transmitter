'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Database, FileText, Menu, X, ShieldCheck, Sparkles } from 'lucide-react'

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
        className="lg:hidden fixed top-4 left-4 z-50 p-3 rounded-2xl bg-white/90 text-slate-800 shadow-xl border border-slate-200/80 backdrop-blur-lg"
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-white/85 backdrop-blur-2xl border-r border-slate-200/80 z-40
          transform transition-all duration-300 ease-out flex flex-col justify-between shadow-2xl shadow-indigo-500/5
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div>
          {/* Logo & Header */}
          <div className="px-6 py-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-4 ring-indigo-50">
              <Sparkles className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-1.5 font-sans">
                Files Transmitter
              </h1>
              <p className="text-[11px] font-bold text-indigo-600/80 uppercase tracking-wider">Alliance India</p>
            </div>
          </div>

          {/* Navigation Items (Dashboard, Akross, Davo) */}
          <div className="px-4 py-6">
            <p className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">
              Core Applications
            </p>
            <nav className="space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                const Icon = item.icon

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={`
                      group flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold
                      transition-all duration-200
                      ${isActive
                        ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-xl shadow-indigo-500/20 scale-[1.02]'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 hover:scale-[1.01]'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`} />
                      <span>{item.name}</span>
                    </div>
                    {isActive && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping shadow-sm" />
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Footer System Health */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <p className="text-xs font-black text-slate-800">System Active</p>
                <p className="text-[10px] font-semibold text-slate-500">FastAPI & Azure Connected</p>
              </div>
            </div>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-md z-30"
        />
      )}
    </>
  )
}
