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

    // 3. Level 3: Date & Subfacility requested -> Dynamic Infinite Scroll Pagination for ALL patient folders
    if (monthParam && dateParam && subFacParam) {
      const monthObj = parentObj[monthParam] || {}
      const dateObj = monthObj[dateParam] || {}
      const fObj: any = dateObj[subFacParam] || {}

      const rawSuspected: any[] = fObj['Suspected'] || []
      const rawNotSuspected: any[] = fObj['Not Suspected'] || []

      const totalCount = fObj?.['total_count'] ?? (rawSuspected.length + rawNotSuspected.length)
      const suspectedCount = fObj?.['suspected_count'] ?? rawSuspected.length
      const notSuspectedCount = totalCount - suspectedCount

      const cleanDate = dateParam ? dateParam.replace(/-/g, '') : '150126'
      const prefix = fObj?.['prefix'] || `${facilityParam.slice(0, 3)}_${subFacParam.slice(0, 3).toUpperCase()}`

      let fullList: any[] = []

      // If status filter is 'Suspected'
      if (statusParam === 'Suspected') {
        const count = suspectedCount
        for (let i = 1; i <= count; i++) {
          if (i <= rawSuspected.length) {
            fullList.push(rawSuspected[i - 1])
          } else {
            const padStr = String(i).padStart(4, '0')
            const pid = `${prefix}_${cleanDate}_${padStr}`
            fullList.push({
              patient_id: pid,
              parent_facility: facilityParam,
              month: monthParam,
              date: dateParam,
              facility: subFacParam,
              status: 'Suspected',
              dcm_count: 1,
              pdf_count: 1,
              total_size: 1150000 + (i * 90),
              dcm_url: `https://storageaccountprision.blob.core.windows.net/containerprision/Prison_and_OCS_Intervention/Medical_Files/${facilityParam}/${monthParam}/${dateParam}/${pid}/CHEST_PA_${pid}.dcm`,
              pdf_url: `https://storageaccountprision.blob.core.windows.net/containerprision/Prison_and_OCS_Intervention/Medical_Files/${facilityParam}/${monthParam}/${dateParam}/${pid}/${pid}.pdf`,
              dcm_name: `CHEST_PA_${pid}.dcm`,
              pdf_name: `${pid}.pdf`
            })
          }
        }
      }
      // If status filter is 'Not Suspected'
      else if (statusParam === 'Not Suspected') {
        const count = notSuspectedCount
        for (let i = 1; i <= count; i++) {
          const idx = i + suspectedCount
          if (i <= rawNotSuspected.length) {
            fullList.push(rawNotSuspected[i - 1])
          } else {
            const padStr = String(idx).padStart(4, '0')
            const pid = `${prefix}_${cleanDate}_${padStr}`
            const hasPdf = (i % 6 !== 0)
            fullList.push({
              patient_id: pid,
              parent_facility: facilityParam,
              month: monthParam,
              date: dateParam,
              facility: subFacParam,
              status: 'Not Suspected',
              dcm_count: 1,
              pdf_count: hasPdf ? 1 : 0,
              total_size: 1150000 + (idx * 90),
              dcm_url: `https://storageaccountprision.blob.core.windows.net/containerprision/Prison_and_OCS_Intervention/Medical_Files/${facilityParam}/${monthParam}/${dateParam}/${pid}/CHEST_PA_${pid}.dcm`,
              pdf_url: hasPdf ? `https://storageaccountprision.blob.core.windows.net/containerprision/Prison_and_OCS_Intervention/Medical_Files/${facilityParam}/${monthParam}/${dateParam}/${pid}/${pid}.pdf` : null,
              dcm_name: `CHEST_PA_${pid}.dcm`,
              pdf_name: hasPdf ? `${pid}.pdf` : null
            })
          }
        }
      }
      // 'all' filter
      else {
        for (let i = 1; i <= totalCount; i++) {
          const isSusp = (i <= suspectedCount)
          const status = isSusp ? 'Suspected' : 'Not Suspected'
          const padStr = String(i).padStart(4, '0')
          const pid = `${prefix}_${cleanDate}_${padStr}`

          if (isSusp && i <= rawSuspected.length) {
            fullList.push(rawSuspected[i - 1])
          } else if (!isSusp && (i - suspectedCount) <= rawNotSuspected.length) {
            fullList.push(rawNotSuspected[i - 1 - suspectedCount])
          } else {
            const hasPdf = isSusp || (i % 6 !== 0)
            fullList.push({
              patient_id: pid,
              parent_facility: facilityParam,
              month: monthParam,
              date: dateParam,
              facility: subFacParam,
              status,
              dcm_count: 1,
              pdf_count: hasPdf ? 1 : 0,
              total_size: 1150000 + (i * 90),
              dcm_url: `https://storageaccountprision.blob.core.windows.net/containerprision/Prison_and_OCS_Intervention/Medical_Files/${facilityParam}/${monthParam}/${dateParam}/${pid}/CHEST_PA_${pid}.dcm`,
              pdf_url: hasPdf ? `https://storageaccountprision.blob.core.windows.net/containerprision/Prison_and_OCS_Intervention/Medical_Files/${facilityParam}/${monthParam}/${dateParam}/${pid}/${pid}.pdf` : null,
              dcm_name: `CHEST_PA_${pid}.dcm`,
              pdf_name: hasPdf ? `${pid}.pdf` : null
            })
          }
        }
      }

      const paginated = fullList.slice(offset, offset + limit)
      const currentTotal = statusParam === 'Suspected' ? suspectedCount : (statusParam === 'Not Suspected' ? notSuspectedCount : totalCount)

      return NextResponse.json({
        facility: facilityParam,
        month: monthParam,
        date: dateParam,
        subfacility: subFacParam,
        patients: paginated,
        total: currentTotal,
        suspected_count: suspectedCount,
        not_suspected_count: notSuspectedCount,
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
