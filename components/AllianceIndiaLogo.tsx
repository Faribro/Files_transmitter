'use client'

import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'

interface AllianceIndiaLogoProps {
  collapsed?: boolean
  className?: string
}

export default function AllianceIndiaLogo({ collapsed = false, className = '' }: AllianceIndiaLogoProps) {
  if (collapsed) {
    // Chevron > button when Sidebar is Collapsed (Replaces AI badge)
    return (
      <motion.div 
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className={`w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-300/60 cursor-pointer text-slate-950 transition-all ${className}`}
      >
        <ChevronRight className="w-6 h-6 stroke-[3] text-slate-950" />
      </motion.div>
    )
  }

  // Full Alliance India Brand Logo
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <svg viewBox="0 0 400 240" className="h-10 w-auto">
          {/* Multi-color Overlapping Alliance Text Lines */}
          <g fill="none" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round">
            {/* A - Green & Cyan */}
            <path d="M 25 100 L 55 35 L 85 100" stroke="#4ade80" />
            <path d="M 38 75 L 72 75" stroke="#f97316" />
            <path d="M 55 35 L 85 100" stroke="#06b6d4" />

            {/* l1 - Red */}
            <path d="M 105 35 L 105 100" stroke="#ef4444" />

            {/* l2 - Cyan */}
            <path d="M 125 35 L 125 100" stroke="#06b6d4" />

            {/* i - Yellow with dot */}
            <path d="M 148 55 L 148 100" stroke="#eab308" />

            {/* a - Orange & Red */}
            <path d="M 195 78 C 195 55 170 55 170 78 C 170 100 195 100 195 78 Z" stroke="#06b6d4" />
            <path d="M 195 55 L 195 100" stroke="#ef4444" />

            {/* n - Green */}
            <path d="M 218 55 L 218 100 M 218 55 C 218 55 242 55 242 78 L 242 100" stroke="#84cc16" />

            {/* c - Yellow */}
            <path d="M 280 58 C 260 55 260 100 280 98" stroke="#f59e0b" />

            {/* e - Red */}
            <path d="M 298 75 L 325 75 C 325 55 298 55 298 78 C 298 100 325 100 325 90" stroke="#ef4444" />
          </g>

          {/* Dots on 'i' */}
          <circle cx="148" cy="35" r="10" fill="#eab308" />

          {/* INDIA Text below */}
          <text x="35" y="165" fill="#f97316" fontSize="52" fontWeight="900" fontFamily="sans-serif" letterSpacing="18">
            INDIA
          </text>
        </svg>
      </div>
    </div>
  )
}
