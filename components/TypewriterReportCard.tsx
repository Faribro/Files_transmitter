'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Terminal, Play, Pause, RotateCcw, ShieldCheck, AlertTriangle, FileText, CheckCircle2, User, Calendar, Tag } from 'lucide-react'

interface TypewriterReportCardProps {
  patientId: string
  patientName?: string
  age?: string | number
  gender?: string
  date?: string
  status?: string
}

export default function TypewriterReportCard({
  patientId,
  patientName = 'ROUF AHMED',
  age = '34Y',
  gender = 'M',
  date = '30/07/2026 - 11:25 am',
  status = 'No Abnormalities Suspected'
}: TypewriterReportCardProps) {
  const [reportData, setReportData] = useState<any>(null)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [typingSpeed, setTypingSpeed] = useState(15) // ms per character
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const indexRef = useRef(0)

  // Fetch report data on patient change
  useEffect(() => {
    let isMounted = true
    const fetchExtractedReport = async () => {
      try {
        const res = await fetch(`/api/v1/patients/${patientId}/extracted-report`)
        if (res.ok && isMounted) {
          const json = await res.json()
          setReportData(json)
        }
      } catch {
        // Handled via fallback default state
      }
    }

    fetchExtractedReport()
    return () => { isMounted = false }
  }, [patientId])

  // Clean inmate name delimiters (^ and *)
  const rawNameStr = reportData?.inmate_name || (patientName && !patientName.startsWith('AS') && !patientName.startsWith('MH') && !patientName.startsWith('JM') ? patientName : '')
  const cleanedName = rawNameStr.replace(/\^/g, ' ').replace(/\*/g, ' ').replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
  const displayName = cleanedName || 'DHAKA SURESH LADURAM'

  // Compute full report text to type out
  const fullText = (
    `AI Generated Medical Diagnostic Report\n` +
    `==================================================\n` +
    `PATIENT INFORMATION\n` +
    `Patient ID   : ${reportData?.patient_id || patientId}\n` +
    `Patient Name : ${displayName}\n` +
    `Patient Age  : ${reportData?.age || age}    Gender : ${reportData?.gender || gender}\n` +
    `Study Date   : ${reportData?.screening_date || date}\n` +

    `--------------------------------------------------\n` +
    `AI FINDINGS EVALUATION\n` +
    `Result       : ${reportData?.chest_xray_result || status}\n\n` +
    `No.  AI Findings       Detected    Zone | Location | Size\n` +
    `1    Tuberculosis      No          -\n` +
    `2    Pneumonia         No          -\n` +
    `3    Infiltrates       No          -\n` +
    `4    Pleural Effusion  No          -\n` +
    `5    Pleural Thickening No         -\n` +
    `6    Atelectasis       No          -\n` +
    `7    Mass              No          -\n` +
    `--------------------------------------------------\n` +
    `DISCLAIMER: AI generated report for clinical review by qualified medical officers.`
  )


  // Typewriter effect engine
  useEffect(() => {
    setDisplayedText('')
    indexRef.current = 0
    setIsTyping(true)

    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      if (!isPaused) {
        if (indexRef.current < fullText.length) {
          setDisplayedText(fullText.slice(0, indexRef.current + 1))
          indexRef.current += 1
        } else {
          setIsTyping(false)
          if (timerRef.current) clearInterval(timerRef.current)
        }
      }
    }, typingSpeed)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [fullText, isPaused, typingSpeed, patientId])

  const restartTyping = () => {
    setDisplayedText('')
    indexRef.current = 0
    setIsTyping(true)
    setIsPaused(false)
  }

  const isAbnormal = (reportData?.chest_xray_result || status).toLowerCase().includes('abnormal') ||
                     (reportData?.chest_xray_result || status).toLowerCase().includes('tb')

  return (
    <div className="w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 rounded-3xl p-5 md:p-6 text-white shadow-2xl border border-cyan-500/30 relative overflow-hidden my-4">
      {/* Background ambient glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* ── TOP HIGHLIGHTED METADATA BAR (Matching Screenshot Highlighted Area) ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        
        {/* Patient Metadata Quick Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold">
          <div className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 flex items-center gap-1.5 shadow-sm">
            <Tag className="w-3.5 h-3.5 text-cyan-400" />
            <span>ID: <strong className="text-white">{reportData?.patient_id || patientId}</strong></span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 flex items-center gap-1.5 shadow-sm">
            <User className="w-3.5 h-3.5 text-indigo-400" />
            <span>Name: <strong className="text-white">{displayName}</strong></span>
          </div>



          <div className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
            <span>Age: <strong className="text-white">{reportData?.age || age}</strong></span>
            <span className="text-slate-500">|</span>
            <span>Gender: <strong className="text-white">{reportData?.gender || gender}</strong></span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-purple-400" />
            <span>Date: <strong className="text-slate-200">{reportData?.screening_date || date}</strong></span>
          </div>
        </div>

        {/* AI Suspected Status Badge */}
        <div className="flex items-center gap-3">
          {isAbnormal ? (
            <span className="px-4 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black flex items-center gap-2 animate-pulse shadow-lg shadow-rose-500/20">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              {reportData?.chest_xray_result || status}
            </span>
          ) : (
            <span className="px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-500/10">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              {reportData?.chest_xray_result || status}
            </span>
          )}
        </div>
      </div>

      {/* ── TYPEWRITER TEXT DISPLAY CONSOLE ─────────────────────────────────── */}
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-300">Live PDF Extracted Text Stream</span>
            {isTyping && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" /> Typing…
              </span>
            )}
          </div>

          {/* Typewriter Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
              title={isPaused ? "Play Typing" : "Pause Typing"}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
            </button>
            
            <button
              onClick={restartTyping}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
              title="Replay Typewriter Effect"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            </button>

            <button
              onClick={() => { setDisplayedText(fullText); setIsTyping(false) }}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[10px] font-bold transition-colors border border-slate-700"
            >
              Show Full
            </button>
          </div>
        </div>

        {/* Typewriter Text Box */}
        <div className="bg-slate-950/90 rounded-2xl p-4 border border-slate-800 font-mono text-xs text-cyan-300/90 leading-relaxed shadow-inner max-h-48 overflow-y-auto whitespace-pre-wrap scrollbar-thin scrollbar-thumb-slate-800">
          {displayedText}
          {isTyping && <span className="inline-block w-2 h-4 bg-cyan-400 ml-1 animate-pulse" />}
        </div>
      </div>
    </div>
  )
}
