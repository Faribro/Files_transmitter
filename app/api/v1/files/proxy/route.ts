import { NextRequest, NextResponse } from 'next/server'

const NEW_AZURE_SAS_TOKEN = 'si=PrisionSAS&spr=https&sv=2026-02-06&sr=c&sig=mFG8b9Yyzs8r7tgreyYnie25Man3QhNDEhM2dlhlbA8%3D'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    let url = searchParams.get('url')

    if (!url) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
    }

    // Automatically append working Azure SAS token if accessing Azure Blob Storage
    if (url.includes('storageaccountprision.blob.core.windows.net') && !url.includes('sig=')) {
      const separator = url.includes('?') ? '&' : '?'
      url = `${url}${separator}${NEW_AZURE_SAS_TOKEN}`
    }

    // Fetch binary stream from Azure Blob / Backend
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch file: ${res.statusText}` }, { status: res.status })
    }

    const contentType = res.headers.get('content-type') || (url.endsWith('.pdf') ? 'application/pdf' : 'application/dicom')
    const arrayBuffer = await res.arrayBuffer()

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error: any) {
    console.error('Error proxying binary file:', error)
    return NextResponse.json({ error: error.message || 'Internal proxy error' }, { status: 500 })
  }
}
