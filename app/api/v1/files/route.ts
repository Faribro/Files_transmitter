import { NextRequest, NextResponse } from 'next/server'

const BACKEND_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const backendUrl = `${BACKEND_BASE}/api/v1/files?${searchParams.toString()}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2500)

    const response = await fetch(backendUrl, {
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
      next: { revalidate: 0 }
    }).finally(() => clearTimeout(timeoutId))

    if (!response.ok) {
      return NextResponse.json(
        { files: [], total: 0, warning: `Backend status ${response.status}` },
        { status: 200 }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.warn('Files API proxy fallback:', error.message)
    return NextResponse.json(
      { files: [], total: 0, warning: error.message },
      { status: 200 }
    )
  }
}
