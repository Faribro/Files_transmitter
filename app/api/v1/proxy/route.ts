import { NextRequest, NextResponse } from 'next/server'

const AZURE_SAS_TOKEN = 'si=PrisionSAS&spr=https&sv=2026-02-06&sr=c&sig=mFG8b9Yyzs8r7tgreyYnie25Man3QhNDEhM2dlhlbA8%3D'

function getPathVariants(urlPath: string): string[] {
  const baseVariants: string[] = [urlPath]

  // 1. Filename suffix / extension variations
  if (urlPath.endsWith('_report.pdf')) {
    baseVariants.push(urlPath.replace('_report.pdf', '.pdf'))
  } else if (urlPath.endsWith('.pdf')) {
    baseVariants.push(urlPath.slice(0, -4) + '_report.pdf')
  }

  // 2. Flatten subfolders: /AKROSS/2026-06/AS26AKR060002/AS26AKR060002_report.pdf -> /AKROSS/2026-06/AS26AKR060002_report.pdf & AS26AKR060002.pdf
  const parts = urlPath.split('/')
  if (parts.length >= 5) {
    const filename = parts[parts.length - 1]
    const flatPath = [...parts.slice(0, parts.length - 2), filename].join('/')
    baseVariants.push(flatPath)
    if (filename.endsWith('_report.pdf')) {
      baseVariants.push([...parts.slice(0, parts.length - 2), filename.replace('_report.pdf', '.pdf')].join('/'))
    } else if (filename.endsWith('.pdf')) {
      baseVariants.push([...parts.slice(0, parts.length - 2), filename.slice(0, -4) + '_report.pdf'].join('/'))
    }
  }

  // 3. Month folder cross-match (e.g., April_2026, 2026-04, 2026-02, 2026-06, etc.)
  const monthMap: Record<string, string[]> = {
    '2026-02': ['Feb_2026', 'February_2026', 'April_2026', '2026-04', '2026-03'],
    '2026-04': ['April_2026', '2026-02', 'Feb_2026'],
    '2026-03': ['March_2026', '2026-03'],
    '2026-06': ['June_2026', '2026-06', '2026-07'],
    '2026-07': ['July_2026', '2026-07', '2026-06'],
  }

  const step2Variants: string[] = []
  for (const v of baseVariants) {
    step2Variants.push(v)
    for (const [mKey, mVal] of Object.entries(monthMap)) {
      if (v.includes(`/${mKey}/`)) {
        for (const altM of mVal) {
          step2Variants.push(v.replace(`/${mKey}/`, `/${altM}/`))
        }
      }
    }
  }

  // 4. Facility Prefix variations
  const finalVariants: string[] = []
  for (const v of step2Variants) {
    finalVariants.push(v)
    if (v.includes('/AKROSS/')) {
      finalVariants.push(v.replace('/AKROSS/', '/Medical_Files/AKROSS/'))
    }
    if (v.includes('/Medical_Files/AKROSS/')) {
      finalVariants.push(v.replace('/Medical_Files/AKROSS/', '/AKROSS/'))
    }
    if (v.includes('/DAVO/')) {
      finalVariants.push(v.replace('/DAVO/', '/Medical_Files/DAVO/'))
      finalVariants.push(v.replace('/DAVO/', '/Prison_and_OCS_Intervention/Medical_Files/DAVO/'))
    }
    if (v.includes('/Medical_Files/DAVO/')) {
      finalVariants.push(v.replace('/Medical_Files/DAVO/', '/Prison_and_OCS_Intervention/Medical_Files/DAVO/'))
      finalVariants.push(v.replace('/Medical_Files/DAVO/', '/DAVO/'))
    }
    if (v.includes('/Prison_and_OCS_Intervention/Medical_Files/DAVO/')) {
      finalVariants.push(v.replace('/Prison_and_OCS_Intervention/Medical_Files/DAVO/', '/Medical_Files/DAVO/'))
      finalVariants.push(v.replace('/Prison_and_OCS_Intervention/Medical_Files/DAVO/', '/DAVO/'))
    }
  }

  return Array.from(new Set(finalVariants))
}

async function handleProxyRequest(request: NextRequest, isHead = false) {
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
      // Quiet 200 response with X-File-Available: false for non-existent reports without console.error log noise
      if (isHead) {
        return new NextResponse(null, {
          status: 200,
          headers: {
            'X-File-Available': 'false',
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        })
      }
      return NextResponse.json(
        { available: false, error: 'Specified file does not exist in Azure Storage' },
        {
          status: 200,
          headers: {
            'X-File-Available': 'false',
            'Access-Control-Allow-Origin': '*',
          }
        }
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
