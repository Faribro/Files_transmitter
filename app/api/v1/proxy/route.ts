import { NextRequest, NextResponse } from 'next/server'

// Pristine Working Azure SAS Token
const AZURE_SAS_TOKEN = 'si=PrisionSAS&spr=https&sv=2026-02-06&sr=c&sig=mFG8b9Yyzs8r7tgreyYnie25Man3QhNDEhM2dlhlbA8%3D'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  let rawUrl = searchParams.get('url') || searchParams.get('file')

  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing file url' }, { status: 400 })
  }

  try {
    // 1. Decode rawUrl if double-encoded and strip any existing query string
    const decodedUrl = decodeURIComponent(rawUrl)
    const cleanUrl = decodedUrl.split('?')[0]

    // 2. Properly URL-encode path spaces while preserving protocol & domain slashes
    const parts = cleanUrl.split('/')
    const encodedParts = parts.map((part, idx) => {
      if (idx < 3) return part // keep https://domain
      return encodeURIComponent(part)
    })
    const encodedCleanUrl = encodedParts.join('/')

    // 3. Append pristine SAS token
    let targetUrl = encodedCleanUrl
    if (encodedCleanUrl.includes('storageaccountprision.blob.core.windows.net')) {
      targetUrl = `${encodedCleanUrl}?${AZURE_SAS_TOKEN}`
    }

    const azureRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      cache: 'no-store'
    })

    if (!azureRes.ok) {
      console.error(`Azure Proxy fetch failed: ${azureRes.status} ${azureRes.statusText} for URL: ${encodedCleanUrl}`)
      return NextResponse.json(
        { error: `Azure Storage error: ${azureRes.status} ${azureRes.statusText}` },
        { status: azureRes.status }
      )
    }

    const isPdf = cleanUrl.toLowerCase().endsWith('.pdf')
    const isDcm = cleanUrl.toLowerCase().endsWith('.dcm')
    const contentType = isPdf ? 'application/pdf' : isDcm ? 'application/dicom' : (azureRes.headers.get('content-type') || 'application/octet-stream')

    const buffer = await azureRes.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'X-Frame-Options': 'SAMEORIGIN',
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
