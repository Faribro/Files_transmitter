'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Database, FileText, FolderTree, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react'
import AllianceIndiaLogo from './AllianceIndiaLogo'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home, badge: 'Overview' },
  { name: 'Akross', href: '/akross', icon: Database, badge: 'Facility' },
  { name: 'Davo', href: '/davo', icon: FileText, badge: 'Facility' },
  { name: 'Storage Hierarchy', href: '/storage-hierarchy', icon: FolderTree, badge: 'Azure View' },
]

export default function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true) // Closed manually by default for maximum canvas width
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
          fixed top-0 left-0 h-full bg-white/85 backdrop-blur-2xl border-r border-slate-200/80 z-40
          transform transition-all duration-300 ease-out flex flex-col justify-between shadow-2xl shadow-indigo-500/5
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div>
          {/* Logo & Single Toggle Header */}
          <div className="px-3 py-5 border-b border-slate-100 flex items-center justify-between">
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <AllianceIndiaLogo collapsed={isCollapsed} />
            </button>

            {/* Single Collapse Button (Only shown when sidebar is expanded) */}
            {!isCollapsed && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex items-center justify-center w-7 h-7 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200/80 transition-colors flex-shrink-0"
                title="Collapse Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Navigation Items (Dashboard, Akross, Davo, Storage Hierarchy) */}
          <div className="px-3 py-6">
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">
                Core Applications
              </p>
            )}
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
                      group flex items-center ${isCollapsed ? 'justify-center p-3.5' : 'justify-between px-4 py-3.5'} rounded-2xl text-sm font-bold
                      transition-all duration-200
                      ${isActive
                        ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-xl shadow-indigo-500/20 scale-[1.02]'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 hover:scale-[1.01]'
                      }
                    `}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`} />
                      {!isCollapsed && <span>{item.name}</span>}
                    </div>
                    {!isCollapsed && isActive && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping shadow-sm" />
                    )}
                  </Link>
                )
              })}
            </nav>
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
