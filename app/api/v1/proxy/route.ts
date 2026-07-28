import { NextRequest, NextResponse } from 'next/server'
import { BlobServiceClient } from '@azure/storage-blob'

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || ''

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const fileUrl = searchParams.get('url') || searchParams.get('file')

  if (!fileUrl) {
    return NextResponse.json({ error: 'Missing file url' }, { status: 400 })
  }

  if (!connectionString) {
    return NextResponse.json({ error: 'Azure connection string not configured in env' }, { status: 500 })
  }

  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
    const urlObj = new URL(fileUrl)
    const pathname = decodeURIComponent(urlObj.pathname).replace(/^\//, '')
    const parts = pathname.split('/')
    const containerName = parts[0] || 'containerprision'
    const blobPath = parts.slice(1).join('/')

    const containerClient = blobServiceClient.getContainerClient(containerName)
    const blobClient = containerClient.getBlobClient(blobPath)

    const downloadResponse = await blobClient.download()

    if (!downloadResponse.readableStreamBody) {
      return NextResponse.json({ error: 'Blob content missing stream' }, { status: 500 })
    }

    const isPdf = fileUrl.toLowerCase().endsWith('.pdf')
    const isDcm = fileUrl.toLowerCase().endsWith('.dcm')

    const contentType = isPdf ? 'application/pdf' : isDcm ? 'application/dicom' : 'application/octet-stream'
    const filename = parts[parts.length - 1] || (isPdf ? 'report.pdf' : 'scan.dcm')

    const nodeStream = downloadResponse.readableStreamBody
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk: Buffer) => controller.enqueue(chunk))
        nodeStream.on('end', () => controller.close())
        nodeStream.on('error', (err: any) => controller.error(err))
      }
    })

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
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
