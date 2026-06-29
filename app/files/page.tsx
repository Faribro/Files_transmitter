import { Suspense } from 'react'
import Link from 'next/link'
import { FileText, Folder, Calendar, User, ArrowLeft } from 'lucide-react'

async function getOrganizedFiles(facility?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  let url = `${baseUrl}/api/v1/files?limit=50&status=ready`
  if (facility) url += `&facility=${facility}`
  
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return { files: [], total: 0 }
  return res.json()
}

function FilesSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="glass-luxury rounded-lg p-6 animate-pulse">
          <div className="h-4 bg-brand-100 rounded w-3/4 mb-3"></div>
          <div className="h-3 bg-brand-50 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  )
}

async function FilesList({ facility }: { facility?: string }) {
  const data = await getOrganizedFiles(facility)
  
  if (!data.files || data.files.length === 0) {
    return (
      <div className="glass-luxury rounded-lg p-12 text-center">
        <Folder className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
        <p className="text-text-secondary font-semibold">No files found</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {data.files.map((file: any) => (
        <Link
          key={file.id}
          href={`/files/${file.id}`}
          className="glass-luxury rounded-lg p-6 hover:shadow-luxury-lg transition-all hover:-translate-y-1 block group"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-5 h-5 text-brand-500" />
                <h3 className="font-semibold text-text-primary group-hover:text-brand-700 transition-colors">
                  {file.filename}
                </h3>
                <span className="text-xs font-bold text-white bg-brand-500 px-2 py-1 rounded-full">
                  {file.file_type?.toUpperCase()}
                </span>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-text-secondary mt-3">
                {file.inmate_id && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{file.inmate_id}</span>
                  </div>
                )}
                {file.scan_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(file.scan_date).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4" />
                  <span className="text-xs font-mono text-text-tertiary truncate max-w-md">
                    {file.target_path}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-xs text-text-tertiary">
                {file.size_bytes ? (file.size_bytes / 1024 / 1024).toFixed(2) : '0'} MB
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ facility?: string }>
}) {
  const params = await searchParams
  
  return (
    <div className="min-h-screen bg-surface-page py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link 
              href="/"
              className="p-2 hover:bg-brand-50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-black bg-gradient-dashboard bg-clip-text text-transparent">
                Browse Files
              </h1>
              <p className="text-sm text-text-tertiary font-semibold mt-1">
                88,053 organized medical files
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href="/files"
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                !params.facility
                  ? 'bg-brand-500 text-white'
                  : 'glass-luxury text-text-primary hover:bg-brand-50'
              }`}
            >
              All Files
            </Link>
            <Link
              href="/files?facility=AKROSS"
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                params.facility === 'AKROSS'
                  ? 'bg-brand-500 text-white'
                  : 'glass-luxury text-text-primary hover:bg-brand-50'
              }`}
            >
              AKROSS (38,464)
            </Link>
            <Link
              href="/files?facility=DAVO_Feb"
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                params.facility?.startsWith('DAVO')
                  ? 'bg-brand-500 text-white'
                  : 'glass-luxury text-text-primary hover:bg-brand-50'
              }`}
            >
              DAVO (49,589)
            </Link>
          </div>
        </header>

        <Suspense fallback={<FilesSkeleton />}>
          <FilesList facility={params.facility} />
        </Suspense>
      </div>
    </div>
  )
}
