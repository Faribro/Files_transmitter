import { NextRequest, NextResponse } from 'next/server'

const BACKEND = 'http://localhost:8000'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const facility = searchParams.get('facility') || ''
  const month    = searchParams.get('month') || ''
  const page     = parseInt(searchParams.get('page') || '1')
  const limit    = Math.min(parseInt(searchParams.get('limit') || '500'), 1000)

  try {
    // Fetch a large batch so we can group by patient_id on our side
    const offset = (page - 1) * limit
    const url = `${BACKEND}/api/v1/files?facility=${encodeURIComponent(facility)}&month=${encodeURIComponent(month)}&limit=${limit * 2}&page=1`
    const res = await fetch(url, { next: { revalidate: 60 } })

    if (!res.ok) throw new Error(`Backend ${res.status}`)

    const data: { files: any[]; total: number } = await res.json()
    const files: any[] = data.files || []

    // Group by inmate_id → build patient folder map
    const patientMap = new Map<string, { 
      patient_id: string
      dcm_count: number
      pdf_count: number
      total_size: number
      dcm_url: string | null
      pdf_url: string | null
      dcm_name: string | null
      pdf_name: string | null
    }>()

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
      const url = f.target_file_id || f.azure_url || null

      if (ft === 'dcm') {
        entry.dcm_count++
        if (!entry.dcm_url && url) {
          entry.dcm_url = url
          entry.dcm_name = f.filename
        }
      } else if (ft === 'pdf') {
        entry.pdf_count++
        if (!entry.pdf_url && url) {
          entry.pdf_url = url
          entry.pdf_name = f.filename
        }
      }
    }

    const patients = Array.from(patientMap.values())
    // Sort by patient_id
    patients.sort((a, b) => a.patient_id.localeCompare(b.patient_id))

    const paginated = patients.slice(offset, offset + limit)

    return NextResponse.json({
      total: patients.length,
      page,
      limit,
      patients: paginated,
    })
  } catch (err: any) {
    console.error('Patients API error:', err.message)
    return NextResponse.json(
      { error: err.message, total: 0, page, limit, patients: [] },
      { status: 500 }
    )
  }
}
