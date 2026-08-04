import { NextRequest, NextResponse } from 'next/server'

const AZURE_SAS_TOKEN = 'si=PrisionSAS&spr=https&sv=2026-02-06&sr=c&sig=mFG8b9Yyzs8r7tgreyYnie25Man3QhNDEhM2dlhlbA8%3D'

function getPathVariants(urlPath: string): string[] {
  const variants: string[] = [urlPath]

  if (urlPath.includes('/AKROSS/')) {
    variants.push(urlPath.replace('/AKROSS/', '/Medical_Files/AKROSS/'))
  }
  if (urlPath.includes('/Medical_Files/AKROSS/')) {
    variants.push(urlPath.replace('/Medical_Files/AKROSS/', '/AKROSS/'))
  }
  if (urlPath.includes('/DAVO/')) {
    variants.push(urlPath.replace('/DAVO/', '/Medical_Files/DAVO/'))
    variants.push(urlPath.replace('/DAVO/', '/Prison_and_OCS_Intervention/Medical_Files/DAVO/'))
  }
  if (urlPath.includes('/Medical_Files/DAVO/')) {
    variants.push(urlPath.replace('/Medical_Files/DAVO/', '/Prison_and_OCS_Intervention/Medical_Files/DAVO/'))
    variants.push(urlPath.replace('/Medical_Files/DAVO/', '/DAVO/'))
  }
  if (urlPath.includes('/Prison_and_OCS_Intervention/Medical_Files/DAVO/')) {
    variants.push(urlPath.replace('/Prison_and_OCS_Intervention/Medical_Files/DAVO/', '/Medical_Files/DAVO/'))
    variants.push(urlPath.replace('/Prison_and_OCS_Intervention/Medical_Files/DAVO/', '/DAVO/'))
  }

  return Array.from(new Set(variants))
}

export async function handleProxyRequest(request: NextRequest, isHead = false) {
  const { searchParams } = request.nextUrl
  let rawUrl = searchParams.get('url') || searchParams.get('file')

  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing file url' }, { status: 400 })
  }

  try {
    const decodedUrl = decodeURIComponent(rawUrl)
    const cleanUrl = decodedUrl.split('?')[0]

    const pathVariants = getPathVariants(cleanUrl)
    let azureRes: Response | null = null

    for (const rawVariant of pathVariants) {
      const parts = rawVariant.split('/')
      const encodedParts = parts.map((part, idx) => {
        if (idx < 3) return part
        return encodeURIComponent(part)
      })
      const encodedCleanUrl = encodedParts.join('/')
      const targetUrl = encodedCleanUrl.includes('storageaccountprision.blob.core.windows.net')
        ? `${encodedCleanUrl}?${AZURE_SAS_TOKEN}`
        : encodedCleanUrl

      try {
        const res = await fetch(targetUrl, {
          method: isHead ? 'HEAD' : 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          cache: 'no-store'
        })

        if (res.ok) {
          azureRes = res
          break
        }
      } catch {}
    }

    if (!azureRes || !azureRes.ok) {
      // Quiet 404 response for non-existent reports without console.error log noise
      return NextResponse.json(
        { error: 'Specified file does not exist in Azure Storage' },
        { status: 404 }
      )
    }

    const isPdf = cleanUrl.toLowerCase().endsWith('.pdf')
    const isDcm = cleanUrl.toLowerCase().endsWith('.dcm')
    const contentType = isPdf ? 'application/pdf' : isDcm ? 'application/dicom' : (azureRes.headers.get('content-type') || 'application/octet-stream')

    if (isHead) {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
        }
      })
    }

    const buffer = await azureRes.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal proxy error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return handleProxyRequest(request, false)
}

export async function HEAD(request: NextRequest) {
  return handleProxyRequest(request, true)
}
