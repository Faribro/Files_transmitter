import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month')
    const facility = searchParams.get('facility')

    return NextResponse.json({
      files: [],
      total: 0,
      month: month || '2026-01',
      facility: facility || 'AKROSS',
      status: 'success'
    })
  } catch (error: any) {
    return NextResponse.json(
      { files: [], total: 0, warning: error.message },
      { status: 200 }
    )
  }
}
