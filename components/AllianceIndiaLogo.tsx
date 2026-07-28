'use client'

import { motion } from 'framer-motion'

interface AllianceIndiaLogoProps {
  collapsed?: boolean
  className?: string
}

export default function AllianceIndiaLogo({ collapsed = false, className = '' }: AllianceIndiaLogoProps) {
  if (collapsed) {
    // Shiny Animated Liquid Droplet Badge when Sidebar is Collapsed
    return (
      <motion.div 
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
        className={`relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 flex items-center justify-center p-2 shadow-xl shadow-purple-500/30 cursor-pointer overflow-hidden group ${className}`}
      >
        {/* Shimmering Animated Liquid Droplet Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/30 via-transparent to-white/40 animate-pulse pointer-events-none" />

        {/* Alliance Teardrop Badge with Chevron */}
        <svg viewBox="0 0 100 100" className="w-8 h-8 text-white filter drop-shadow-md transition-transform group-hover:scale-110">
          {/* Teardrop Shield */}
          <path
            d="M 50 15 C 70 15 85 30 85 50 C 85 70 70 85 50 85 C 30 85 15 70 15 50 C 15 30 30 15 50 15 Z"
            fill="#000000"
          />
          {/* Chevron inside badge */}
          <path
            d="M 38 35 L 62 50 L 38 65"
            fill="none"
            stroke="#ffffff"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
    )
  }

  // Full Alliance India Brand Logo (Matching Attached Image)
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <svg viewBox="0 0 400 240" className="h-12 w-auto">
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

          {/* India Text in Black */}
          <text x="25" y="190" fontFamily="sans-serif" fontWeight="900" fontSize="72" fill="#000000">
            India
          </text>

          {/* Black Teardrop Badge with Chevron at Top Right */}
          <g transform="translate(325, 20) scale(0.65)">
            <path
              d="M 50 10 C 75 10 90 28 90 50 C 90 72 72 90 50 90 C 28 90 10 72 10 50 C 10 28 28 10 50 10 Z"
              fill="#000000"
            />
            <path
              d="M 38 35 L 62 50 L 38 65"
              fill="none"
              stroke="#ffffff"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      </div>
    </div>
  )
}
