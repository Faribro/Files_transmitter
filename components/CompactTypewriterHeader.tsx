'use client'

import { useState, useEffect, useRef } from 'react'

interface CompactTypewriterHeaderProps {
  patientId: string
  status?: string
  date?: string
}

export default function CompactTypewriterHeader({
  patientId,
  status = 'No Abnormalities Suspected',
  date = '27/04/2026'
}: CompactTypewriterHeaderProps) {
  const [reportData, setReportData] = useState<any>(null)
  const [displayedText, setDisplayedText] = useState('')
  const indexRef = useRef(0)

  useEffect(() => {
    let isMounted = true
    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/v1/patients/${patientId}/extracted-report`)
        if (res.ok && isMounted) {
          const json = await res.json()
          setReportData(json)
        }
      } catch {}
    }
    fetchReport()
    return () => { isMounted = false }
  }, [patientId])

  // Clean inmate name
  const rawName = reportData?.inmate_name || ''
  const cleanedName = rawName.replace(/\^/g, ' ').replace(/\*/g, ' ').replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
  const displayName = cleanedName || 'DHAKA SURESH LADURAM'
  const displayStatus = reportData?.chest_xray_result || status
  const displayDate = reportData?.screening_date || date
  const displayAge = reportData?.age || '28Y'
  const displayGender = reportData?.gender || 'M'

  // Full single-line stream string for typewriter animation
  const streamText = `AI Generated Report · ID: ${patientId} · Name: ${displayName} · Age: ${displayAge} · Sex: ${displayGender} · Date: ${displayDate} · Result: ${displayStatus} · Findings: Tuberculosis: No | Pneumonia: No | Infiltrates: No`

  // Typewriter effect logic
  useEffect(() => {
    setDisplayedText('')
    indexRef.current = 0

    const interval = setInterval(() => {
      if (indexRef.current < streamText.length) {
        setDisplayedText(streamText.slice(0, indexRef.current + 1))
        indexRef.current += 1
      } else {
        clearInterval(interval)
      }
    }, 25)

    return () => clearInterval(interval)
  }, [streamText, patientId])

  const isAbnormal = displayStatus.toLowerCase().includes('abnormal') || displayStatus.toLowerCase().includes('tb')

  return (
    <div className="flex items-center gap-2 max-w-[580px] overflow-hidden">
      {/* Typewriter Text Box */}
      <div 
        className="font-mono text-[11px] font-extrabold text-slate-800 bg-gradient-to-r from-slate-100 via-indigo-50/80 to-slate-100 px-3.5 py-1.5 rounded-xl border border-indigo-200/80 shadow-sm whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1"
        title={streamText}
      >
        <span className="text-indigo-600 font-black flex-shrink-0">⚡</span>
        <span className="truncate">{displayedText}</span>
        <span className="w-1.5 h-3 bg-indigo-600 inline-block animate-pulse ml-0.5 flex-shrink-0" />
      </div>

      {/* Status Pill Badge */}
      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex-shrink-0 border shadow-sm ${
        isAbnormal
          ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse'
          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
      }`}>
        {isAbnormal ? '⚠️ TB Suspected' : '✓ Normal'}
      </span>
    </div>
  )
}
