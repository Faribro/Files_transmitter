import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const backendUrl = `http://localhost:8000/api/v1/files?${searchParams.toString()}`

    const response = await fetch(backendUrl, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 0 }
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend API error: ${response.statusText}`, files: [], total: 0 },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to proxy files API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch files from backend engine', files: [], total: 0 },
      { status: 500 }
    )
  }
}
