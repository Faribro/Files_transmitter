import { NextRequest, NextResponse } from 'next/server'
import { HIERARCHY_DATA } from './patientsData'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const facilityParam  = (searchParams.get('facility') || 'AKROSS').toUpperCase()
  const monthParam     = searchParams.get('month')
  const dateParam      = searchParams.get('date')
  const subFacParam    = searchParams.get('subfacility')
  const statusParam    = searchParams.get('status') || 'all' // 'all' | 'Suspected' | 'Not Suspected'
  const page           = parseInt(searchParams.get('page') || '1')
  const limit          = Math.min(parseInt(searchParams.get('limit') || '300'), 500)
  const offset         = (page - 1) * limit

  try {
    const parentObj = HIERARCHY_DATA?.[facilityParam] || HIERARCHY_DATA?.['AKROSS'] || {}

    // 1. Level 1: Month requested -> return dates with exact totals
    if (monthParam && !dateParam) {
      const monthObj = parentObj[monthParam] || {}
      const dateList = Object.keys(monthObj).sort().reverse().map(d => {
        const subFacs = monthObj[d] || {}
        let sCnt = 0
        let nsCnt = 0
        let totCnt = 0

        Object.values(subFacs).forEach((fObj: any) => {
          const sArr = fObj['Suspected'] || []
          const nsArr = fObj['Not Suspected'] || []
          const sVal = fObj?.['suspected_count'] ?? sArr.length
          const totVal = fObj?.['total_count'] ?? (sArr.length + nsArr.length)
          const nsVal = totVal - sVal

          sCnt += sVal
          nsCnt += nsVal
          totCnt += totVal
        })

        return {
          date: d,
          total_patients: totCnt,
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

    // 2. Level 2: Date requested -> return facilities with exact totals
    if (monthParam && dateParam && !subFacParam) {
      const monthObj = parentObj[monthParam] || {}
      const dateObj = monthObj[dateParam] || {}
      const facilityList = Object.keys(dateObj).map(fName => {
        const fObj: any = dateObj[fName] || {}
        const sArr = fObj['Suspected'] || []
        const nsArr = fObj['Not Suspected'] || []
        const sVal = fObj?.['suspected_count'] ?? sArr.length
        const totVal = fObj?.['total_count'] ?? (sArr.length + nsArr.length)
        const nsVal = totVal - sVal

        return {
          facility: fName,
          total_patients: totVal,
          suspected_count: sVal,
          not_suspected_count: nsVal
        }
      })

      return NextResponse.json({
        facility: facilityParam,
        month: monthParam,
        date: dateParam,
        facilities: facilityList
      })
    }

    // 3. Level 3: Date & Subfacility requested -> 100% REAL AUTHENTIC PATIENTS ONLY (Zero Synthetic Generator)
    if (monthParam && dateParam && subFacParam) {
      const monthObj = parentObj[monthParam] || {}
      const dateObj = monthObj[dateParam] || {}
      const fObj: any = dateObj[subFacParam] || {}

      const rawSuspected: any[] = fObj['Suspected'] || []
      const rawNotSuspected: any[] = fObj['Not Suspected'] || []

      let fullList: any[] = []

      // If status filter is 'Suspected' -> Return ONLY real suspected patient records
      if (statusParam === 'Suspected') {
        fullList = rawSuspected
      }
      // If status filter is 'Not Suspected' -> Return ONLY real not-suspected patient records
      else if (statusParam === 'Not Suspected') {
        fullList = rawNotSuspected
      }
      // 'all' filter -> Combine real suspected first, then real not-suspected
      else {
        fullList = [...rawSuspected, ...rawNotSuspected]
      }

      const paginated = fullList.slice(offset, offset + limit)
      const currentTotal = fullList.length

      return NextResponse.json({
        facility: facilityParam,
        month: monthParam,
        date: dateParam,
        subfacility: subFacParam,
        patients: paginated,
        total: currentTotal,
        suspected_count: rawSuspected.length,
        not_suspected_count: rawNotSuspected.length,
        page,
        limit,
        has_more: offset + paginated.length < currentTotal
      })
    }

    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  } catch (err: any) {
    console.error('Patients API error:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch patient data' }, { status: 500 })
  }
}
