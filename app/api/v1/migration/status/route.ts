import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const response = await fetch(`${backendUrl}/api/v1/migration/status`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error('Failed to fetch migration status')
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Migration status API error:', error)
    return NextResponse.json(
      { 
        is_running: false, 
        total_files: 0,
        completed: 0,
        failed: 0,
        ready: 0,
        speed_per_min: 0,
        eta_hours: 0,
        percent_complete: 0,
        data_transferred_gb: 0
      },
      { status: 200 }
    )
  }
}
