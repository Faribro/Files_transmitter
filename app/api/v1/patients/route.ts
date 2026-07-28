import { NextRequest, NextResponse } from 'next/server'
import { HIERARCHY_DATA } from './patientsData'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const facilityParam  = (searchParams.get('facility') || 'AKROSS').toUpperCase()
  const monthParam     = searchParams.get('month')
  const dateParam      = searchParams.get('date')
  const subFacParam    = searchParams.get('subfacility')
  const statusParam    = searchParams.get('status') // 'all' | 'Suspected' | 'Not Suspected'
  const page           = parseInt(searchParams.get('page') || '1')
  const limit          = Math.min(parseInt(searchParams.get('limit') || '60'), 200)
  const offset         = (page - 1) * limit

  try {
    const parentObj = HIERARCHY_DATA[facilityParam] || HIERARCHY_DATA['AKROSS'] || {}

    // 1. If month requested (e.g. '2026-01'), return dates belonging to that month under THIS facility!
    if (monthParam && !dateParam) {
      const monthObj = parentObj[monthParam] || {}
      const dateList = Object.keys(monthObj).sort().reverse().map(d => {
        const subFacs = monthObj[d] || {}
        let sCnt = 0
        let nsCnt = 0
        Object.values(subFacs).forEach(fObj => {
          sCnt += (fObj['Suspected'] || []).length
          nsCnt += (fObj['Not Suspected'] || []).length
        })
        return {
          date: d,
          total_patients: sCnt + nsCnt,
          suspected_count: sCnt,
          not_suspected_count: nsCnt,
          facility_count: Object.keys(subFacs).length
        }
      })

      return NextResponse.json({
        facility: facilityParam,
        month: monthParam,
        dates: dateList,
        total_dates: dateList.length
      })
    }

    // 2. If date requested but no subfacility, return facilities for that date UNDER THIS FACILITY!
    if (monthParam && dateParam && !subFacParam) {
      const monthObj = parentObj[monthParam] || {}
      const dateObj = monthObj[dateParam] || {}
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
        facility: facilityParam,
        month: monthParam,
        date: dateParam,
        facilities: facilityList
      })
    }

    // 3. If date & subfacility requested, return patients directly with filter option!
    if (monthParam && dateParam && subFacParam) {
      const monthObj = parentObj[monthParam] || {}
      const dateObj = monthObj[dateParam] || {}
      const fObj = dateObj[subFacParam] || { 'Suspected': [], 'Not Suspected': [] }

      const suspectedList: any[] = fObj['Suspected'] || []
      const notSuspectedList: any[] = fObj['Not Suspected'] || []

      let combined: any[] = []
      if (!statusParam || statusParam === 'all') {
        combined = [...suspectedList, ...notSuspectedList]
      } else if (statusParam === 'Suspected') {
        combined = suspectedList
      } else if (statusParam === 'Not Suspected') {
        combined = notSuspectedList
      }

      const paginated = combined.slice(offset, offset + limit)

      return NextResponse.json({
        facility: facilityParam,
        month: monthParam,
        date: dateParam,
        subfacility: subFacParam,
        status: statusParam || 'all',
        total: combined.length,
        suspected_count: suspectedList.length,
        not_suspected_count: notSuspectedList.length,
        page,
        limit,
        patients: paginated,
        has_more: offset + limit < combined.length
      })
    }

    // Default fallback
    return NextResponse.json({
      facility: facilityParam,
      months: Object.keys(parentObj)
    })

  } catch (err: any) {
    console.error('Hierarchy API error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to fetch hierarchy data' },
      { status: 500 }
    )
  }
}
