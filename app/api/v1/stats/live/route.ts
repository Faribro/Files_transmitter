import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    
    // Fetch comprehensive stats from backend
    const [dashboardRes, akrossRes, davoRes] = await Promise.all([
      fetch(`${backendUrl}/api/v1/stats/dashboard`),
      fetch(`${backendUrl}/api/v1/stats/dashboard?facility=AKROSS`),
      fetch(`${backendUrl}/api/v1/stats/dashboard?facility=DAVO`)
    ])

    if (!dashboardRes.ok) {
      throw new Error('Failed to fetch dashboard stats')
    }

    const dashboardData = await dashboardRes.json()
    const akrossData = akrossRes.ok ? await akrossRes.json() : null
    const davoData = davoRes.ok ? await davoRes.json() : null

    // Calculate facility breakdown with sizes
    const facilities = []
    
    // AKROSS
    if (akrossData) {
      const akrossCount = Object.values(akrossData.by_facility).reduce((sum: number, count) => sum + (count as number), 0)
      facilities.push({
        name: 'AKROSS',
        count: akrossCount,
        size_gb: akrossData.total_size_gb
      })
    }

    // DAVO (grouped by month)
    if (davoData && davoData.by_facility) {
      const davoMonths = Object.entries(davoData.by_facility).filter(([name]) => 
        name.startsWith('DAVO_')
      )
      
      davoMonths.forEach(([month, count]) => {
        facilities.push({
          name: month,
          count: count as number,
          size_gb: 0
        })
      })
      
      // Calculate DAVO size distribution proportionally
      const totalDavoCount = davoMonths.reduce((sum, [, count]) => sum + (count as number), 0)
      facilities.forEach(f => {
        if (f.name.startsWith('DAVO_')) {
          f.size_gb = (f.count / totalDavoCount) * davoData.total_size_gb
        }
      })
    }

    // Calculate file type percentages
    const file_types = Object.entries(dashboardData.by_type || {})
      .map(([type, count]) => ({
        type,
        count: count as number,
        percentage: ((count as number) / dashboardData.total_files) * 100
      }))
      .sort((a, b) => b.count - a.count)

    // Migration status
    const migration_status = {
      completed: dashboardData.by_status?.completed || 0,
      pending: dashboardData.by_status?.pending || 0,
      failed: dashboardData.by_status?.failed || 0
    }

    const response = {
      total_files: dashboardData.total_files,
      total_size_gb: dashboardData.total_size_gb,
      facilities,
      file_types,
      migration_status,
      last_updated: new Date().toISOString()
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Error fetching live stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch live statistics' },
      { status: 500 }
    )
  }
}
