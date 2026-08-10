'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FolderTree, Menu, X, ChevronLeft } from 'lucide-react'
import AllianceIndiaLogo from './AllianceIndiaLogo'

// Icon components for 'A' (Akross) and 'D' (Davo) with metallic teal / greenish-blue foil glassmorphism
function AkrossIcon({ isActive = false, className = '' }: { isActive?: boolean, className?: string }) {
  return (
    <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs transition-all shadow-md ${
      isActive
        ? 'bg-white/25 text-white border border-white/40 shadow-sm'
        : 'bg-gradient-to-tr from-teal-500 via-cyan-400 to-emerald-500 text-white border border-teal-200/60 shadow-teal-500/30'
    } ${className}`}>
      A
    </div>
  )
}

function DavoIcon({ isActive = false, className = '' }: { isActive?: boolean, className?: string }) {
  return (
    <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs transition-all shadow-md ${
      isActive
        ? 'bg-white/25 text-white border border-white/40 shadow-sm'
        : 'bg-gradient-to-tr from-cyan-600 via-teal-500 to-blue-600 text-white border border-cyan-200/60 shadow-cyan-500/30'
    } ${className}`}>
      D
    </div>
  )
}

const navigation = [
  { name: 'Akross', href: '/akross', customIcon: AkrossIcon, badge: 'Facility' },
  { name: 'Davo', href: '/davo', customIcon: DavoIcon, badge: 'Facility' },
  { name: 'Storage Hierarchy', href: '/storage-hierarchy', icon: FolderTree, badge: 'Azure View' },
]

export default function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true) // Closed manually by default
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
          {/* Logo & Toggle Header */}
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

          {/* Navigation Items (Akross [A], Davo [D], Storage Hierarchy) */}
          <div className="px-3 py-6">
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">
                Facilities & Storage
              </p>
            )}
            <nav className="space-y-2.5">
              {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                const CustomIcon = item.customIcon
                const StandardIcon = item.icon

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={`
                      group flex items-center ${isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-3'} rounded-2xl text-xs font-black
                      transition-all duration-200 relative overflow-hidden
                      ${isActive
                        ? 'bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 text-white shadow-xl shadow-teal-500/25 border border-cyan-300/50 scale-[1.02]'
                        : 'text-slate-600 hover:bg-teal-50/70 hover:text-teal-900 hover:scale-[1.01]'
                      }
                    `}
                    title={isCollapsed ? item.name : undefined}
                  >
                    {/* Metallic Foil Shimmer Overlay */}
                    {isActive && (
                      <span className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/10 opacity-70 pointer-events-none" />
                    )}

                    <div className="flex items-center gap-3 relative z-10">
                      {CustomIcon ? (
                        <CustomIcon isActive={isActive} />
                      ) : StandardIcon ? (
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                          isActive
                            ? 'bg-white/25 text-white border border-white/40 shadow-sm'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-teal-100 group-hover:text-teal-800'
                        }`}>
                          <StandardIcon className="w-4 h-4 transition-transform group-hover:scale-110" />
                        </div>
                      ) : null}
                      {!isCollapsed && <span className="tracking-tight">{item.name}</span>}
                    </div>

                    {!isCollapsed && isActive && (
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse shadow-sm relative z-10" />
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
