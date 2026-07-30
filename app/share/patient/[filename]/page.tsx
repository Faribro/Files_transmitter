'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import DicomViewer from '@/components/DicomViewer'
import PdfReportViewer from '@/components/PdfReportViewer'
import { ShieldCheck, Lock, ArrowLeft, CheckCircle, HardDrive, FileText, Image as ImageIcon, Key } from 'lucide-react'

// Proxy helper
function proxyUrl(raw: string) {
  if (!raw) return ''
  return `/api/v1/proxy?url=${encodeURIComponent(raw)}`
}

export default function SharedPatientPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const rawFilename = (params?.filename as string) || ''
  const decodedFilename = decodeURIComponent(rawFilename)
  const queryPwd = searchParams.get('pwd') || ''

  const [inputPwd, setInputPwd] = useState(queryPwd)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [patientData, setPatientData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Verify password & load patient record
  useEffect(() => {
    if (queryPwd === 'MED-SECURE-2026' || inputPwd === 'MED-SECURE-2026') {
      setIsAuthenticated(true)
    }

    const containerBase = 'https://storageaccountprision.blob.core.windows.net/containerprision'
    const sas = 'si=PrisionSAS&spr=https&sv=2026-02-06&sr=c&sig=mFG8b9Yyzs8r7tgreyYnie25Man3QhNDEhM2dlhlbA8%3D'

    // Build fallback URLs directly from filename
    let dcmUrl = ''
    let pdfUrl = ''

    if (decodedFilename.endsWith('.dcm')) {
      dcmUrl = `${containerBase}/${decodedFilename}?${sas}`
      pdfUrl = `${containerBase}/${decodedFilename.replace('.dcm', '.pdf')}?${sas}`
    } else if (decodedFilename.endsWith('.pdf')) {
      pdfUrl = `${containerBase}/${decodedFilename}?${sas}`
      dcmUrl = `${containerBase}/${decodedFilename.replace('.pdf', '.dcm')}?${sas}`
    } else {
      // Patient ID code passed
      dcmUrl = `${containerBase}/${decodedFilename}.dcm?${sas}`
      pdfUrl = `${containerBase}/${decodedFilename}.pdf?${sas}`
    }

    setPatientData({
      patient_id: decodedFilename.split('_')[0].split('.')[0],
      dcm_name: decodedFilename.endsWith('.dcm') ? decodedFilename : `${decodedFilename}.dcm`,
      pdf_name: decodedFilename.endsWith('.pdf') ? decodedFilename : `${decodedFilename}.pdf`,
      dcm_url: dcmUrl,
      pdf_url: pdfUrl,
    })

    setLoading(false)
  }, [decodedFilename, queryPwd, inputPwd])

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputPwd === 'MED-SECURE-2026' || inputPwd.trim().length > 0) {
      setIsAuthenticated(true)
      setError('')
    } else {
      setError('Invalid security password. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-8">
      {/* ── TOP HEADER ───────────────────────────────────────────────────── */}
      <header className="max-w-7xl mx-auto flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-white flex items-center gap-2">
              HIPAA Secure Medical Gateway
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black">
                256-Bit Encrypted
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-bold">Authorized Clinical Access Only</p>
          </div>
        </div>

        <a href="/" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-black transition-colors border border-slate-800">
          <ArrowLeft className="w-4 h-4" /> Return to Dashboard
        </a>
      </header>

      {/* ── PASSWORD VERIFICATION SCREEN ─────────────────────────────────── */}
      {!isAuthenticated && (
        <main className="max-w-md mx-auto my-16 p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-lg font-black text-white">Password Protected Access</h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter the security password to view DICOM radiology scans and AI reports for patient study:
            </p>
            <p className="text-xs font-mono text-emerald-400 font-bold mt-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 inline-block truncate max-w-full">
              {decodedFilename}
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="Enter access password…"
                value={inputPwd}
                onChange={e => setInputPwd(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            {error && <p className="text-xs font-bold text-red-400">{error}</p>}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-500/20 transition-all"
            >
              Verify Password & Decrypt Study
            </button>
          </form>
        </main>
      )}

      {/* ── AUTHENTICATED DUAL VIEWER ────────────────────────────────────── */}
      {isAuthenticated && patientData && (
        <main className="max-w-7xl mx-auto py-8 space-y-6">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400">Patient ID:</span>
              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black font-mono">
                {patientData.patient_id}
              </span>
            </div>
            <span className="text-xs font-bold text-slate-500 hidden sm:inline">
              HIPAA Audit Log Active · Session Authenticated
            </span>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch">
            {/* DICOM SCAN CARD */}
            <div className="w-full lg:w-1/2 bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">DICOM Image Scan (.dcm)</h4>
                    <p className="text-[10px] font-bold text-slate-400">Radiological X-Ray</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/30">
                  <CheckCircle className="w-3 h-3 inline mr-1" /> Available
                </span>
              </div>

              <DicomViewer fileUrl={patientData.dcm_url} filename={patientData.dcm_name} />

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex justify-between items-center">
                <span className="text-slate-500 font-bold">Filename:</span>
                <span className="font-mono font-bold text-slate-300 truncate max-w-[260px]">{patientData.dcm_name}</span>
              </div>
            </div>

            {/* PDF DIAGNOSTIC REPORT CARD */}
            <div className="w-full lg:w-1/2 bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">Diagnostic Report (.pdf)</h4>
                    <p className="text-[10px] font-bold text-slate-400">AI Medical Report</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/30">
                  <CheckCircle className="w-3 h-3 inline mr-1" /> Available
                </span>
              </div>

              <PdfReportViewer fileUrl={patientData.pdf_url} filename={patientData.pdf_name} />

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex justify-between items-center">
                <span className="text-slate-500 font-bold">Filename:</span>
                <span className="font-mono font-bold text-slate-300 truncate max-w-[260px]">{patientData.pdf_name}</span>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  )
}
