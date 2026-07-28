import { NextRequest, NextResponse } from 'next/server'
import { REAL_PATIENT_DATA } from './patientsData'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const facility = searchParams.get('facility') || 'AKROSS'
  const month    = searchParams.get('month') || '2026-01'
  const page     = parseInt(searchParams.get('page') || '1')
  const limit    = Math.min(parseInt(searchParams.get('limit') || '500'), 1000)
  const offset   = (page - 1) * limit

  try {
    // Attempt fast fetch from live backend service if reachable
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)

    const url = `${BACKEND_URL}/api/v1/files?facility=${encodeURIComponent(facility)}&month=${encodeURIComponent(month)}&limit=${limit * 2}&page=1`
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 60 }
    }).finally(() => clearTimeout(timeoutId))

    if (res.ok) {
      const data: { files: any[]; total: number } = await res.json()
      const files: any[] = data.files || []

      const patientMap = new Map<string, any>()
      for (const f of files) {
        const pid = (f.inmate_id && f.inmate_id !== 'None') ? f.inmate_id : null
        if (!pid) continue

        if (!patientMap.has(pid)) {
          patientMap.set(pid, {
            patient_id: pid,
            dcm_count: 0,
            pdf_count: 0,
            total_size: 0,
            dcm_url: null,
            pdf_url: null,
            dcm_name: null,
            pdf_name: null,
          })
        }

        const entry = patientMap.get(pid)!
        entry.total_size += f.size_bytes || 0
        const ft = (f.file_type || '').toLowerCase()
        const targetUrl = f.target_file_id || f.azure_url || null

        if (ft === 'dcm') {
          entry.dcm_count++
          if (!entry.dcm_url && targetUrl) {
            entry.dcm_url = targetUrl
            entry.dcm_name = f.filename
          }
        } else if (ft === 'pdf') {
          entry.pdf_count++
          if (!entry.pdf_url && targetUrl) {
            entry.pdf_url = targetUrl
            entry.pdf_name = f.filename
          }
        }
      }

      const patients = Array.from(patientMap.values())
      patients.sort((a, b) => a.patient_id.localeCompare(b.patient_id))
      const paginated = patients.slice(offset, offset + limit)

      if (paginated.length > 0) {
        return NextResponse.json({
          total: patients.length,
          page,
          limit,
          patients: paginated,
          source: 'backend'
        })
      }
    }
  } catch (err: any) {
    console.warn('Backend fetch failed, falling back to embedded real patient dataset:', err.message)
  }

  // 100% Guaranteed Fallback from REAL_PATIENT_DATA (Zero latency on Vercel)
  const facKey = facility.toUpperCase()
  const facData = REAL_PATIENT_DATA[facKey] || REAL_PATIENT_DATA['AKROSS']
  const monthPatients = facData[month] || facData['2026-01'] || []

  const paginated = monthPatients.slice(offset, offset + limit)

  return NextResponse.json({
    total: monthPatients.length,
    page,
    limit,
    patients: paginated,
    source: 'real_dataset_fallback'
  })
}
