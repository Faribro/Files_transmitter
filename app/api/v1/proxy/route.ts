import { NextRequest, NextResponse } from 'next/server'

const NEW_AZURE_SAS_TOKEN = 'si=PrisionSAS&spr=https&sv=2026-02-06&sr=c&sig=mFG8b9Yyzs8r7tgreyYnie25Man3QhNDEhM2dlhlbA8%3D'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  let fileUrl = searchParams.get('url') || searchParams.get('file')

  if (!fileUrl) {
    return NextResponse.json({ error: 'Missing file url' }, { status: 400 })
  }

  try {
    // Automatically append working Azure SAS token if accessing Azure Blob Storage
    if (fileUrl.includes('storageaccountprision.blob.core.windows.net') && !fileUrl.includes('sig=')) {
      const separator = fileUrl.includes('?') ? '&' : '?'
      fileUrl = `${fileUrl}${separator}${NEW_AZURE_SAS_TOKEN}`
    }

    const res = await fetch(fileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    })

    if (!res.ok) {
      console.error(`Azure Proxy fetch error: ${res.status} ${res.statusText}`)
      return NextResponse.json({ error: `Failed to fetch blob: ${res.statusText}` }, { status: res.status })
    }

    const isPdf = fileUrl.toLowerCase().includes('.pdf')
    const isDcm = fileUrl.toLowerCase().includes('.dcm')
    const contentType = isPdf ? 'application/pdf' : isDcm ? 'application/dicom' : (res.headers.get('content-type') || 'application/octet-stream')

    const arrayBuffer = await res.arrayBuffer()

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch (err: any) {
    console.error('Azure Proxy stream error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to proxy Azure blob stream' },
      { status: 500 }
    )
  }
}
