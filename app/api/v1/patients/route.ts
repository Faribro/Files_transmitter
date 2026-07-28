import { NextRequest, NextResponse } from 'next/server'
import { HIERARCHY_DATA } from './patientsData'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const monthParam    = searchParams.get('month')
  const dateParam     = searchParams.get('date')
  const facilityParam = searchParams.get('facility')
  const statusParam   = searchParams.get('status')
  const page          = parseInt(searchParams.get('page') || '1')
  const limit         = Math.min(parseInt(searchParams.get('limit') || '60'), 200)
  const offset        = (page - 1) * limit

  try {
    const allDates = Object.keys(HIERARCHY_DATA).sort().reverse()

    // 1. If month requested (e.g. '2026-01'), return dates belonging to that month
    if (monthParam && !dateParam) {
      const monthDates = allDates.filter(d => d.startsWith(monthParam))
      const dateList = monthDates.map(d => {
        const facs = HIERARCHY_DATA[d] || {}
        let sCnt = 0
        let nsCnt = 0
        Object.values(facs).forEach(fObj => {
          sCnt += (fObj['Suspected'] || []).length
          nsCnt += (fObj['Not Suspected'] || []).length
        })
        return {
          date: d,
          total_patients: sCnt + nsCnt,
          suspected_count: sCnt,
          not_suspected_count: nsCnt,
          facility_count: Object.keys(facs).length
        }
      })

      return NextResponse.json({
        month: monthParam,
        dates: dateList,
        total_dates: dateList.length
      })
    }

    // 2. If date requested but no facility, return facilities for that date
    if (dateParam && !facilityParam) {
      const dateObj = HIERARCHY_DATA[dateParam] || {}
      const facilityList = Object.keys(dateObj).map(fName => {
        const fObj = dateObj[fName] || {}
        const sCnt = (fObj['Suspected'] || []).length
        const nsCnt = (fObj['Not Suspected'] || []).length
        return {
          facility: fName,
          total_patients: sCnt + nsCnt,
          suspected_count: sCnt,
          not_suspected_count: nsCnt
        }
      })

      return NextResponse.json({
        date: dateParam,
        facilities: facilityList
      })
    }

    // 3. If date & facility requested, return status categories
    if (dateParam && facilityParam && !statusParam) {
      const dateObj = HIERARCHY_DATA[dateParam] || {}
      const facObj = dateObj[facilityParam] || { 'Suspected': [], 'Not Suspected': [] }
      return NextResponse.json({
        date: dateParam,
        facility: facilityParam,
        categories: [
          { status: 'Suspected', label: '🔴 Suspected (TB / Lesion Detected)', count: (facObj['Suspected'] || []).length },
          { status: 'Not Suspected', label: '🟢 Not Suspected (Normal Examination)', count: (facObj['Not Suspected'] || []).length }
        ]
      })
    }

    // 4. Return paginated patient study folders for specific status
    if (dateParam && facilityParam && statusParam) {
      const dateObj = HIERARCHY_DATA[dateParam] || {}
      const facObj = dateObj[facilityParam] || { 'Suspected': [], 'Not Suspected': [] }
      const categoryKey = statusParam === 'Suspected' ? 'Suspected' : 'Not Suspected'
      const patientList: any[] = facObj[categoryKey] || []
      const paginated = patientList.slice(offset, offset + limit)

      return NextResponse.json({
        date: dateParam,
        facility: facilityParam,
        status: categoryKey,
        total: patientList.length,
        page,
        limit,
        patients: paginated,
        has_more: offset + limit < patientList.length
      })
    }

    // Default fallback: return month summary
    return NextResponse.json({
      dates: allDates.slice(0, 30),
      total_dates: allDates.length
    })

  } catch (err: any) {
    console.error('Hierarchy API error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to fetch hierarchy data' },
      { status: 500 }
    )
  }
}
