'use client'

import { useEffect, useRef, useState } from 'react'
import { 
  ZoomIn, ZoomOut, RotateCw, Maximize2, Download, 
  AlertCircle, Move, Contrast, Activity, Minus, Plus
} from 'lucide-react'

interface DicomViewerProps {
  fileUrl: string
  filename: string
}

export default function DicomViewer({ fileUrl, filename }: DicomViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [renderingEngine, setRenderingEngine] = useState<any>(null)
  const [viewport, setViewport] = useState<any>(null)
  const [activeTool, setActiveTool] = useState<'pan' | 'zoom' | 'wwwc'>('pan')
  const [imageInfo, setImageInfo] = useState<any>(null)

  useEffect(() => {
    let mounted = true
    let engine: any = null
    let rejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null

    const initViewer = async () => {
      // Suppress unhandled rejections for DICOM loading
      rejectionHandler = (event: PromiseRejectionEvent) => {
        const reason = event.reason
        if (reason && (reason instanceof XMLHttpRequest || 
                      reason?.toString?.().includes('XMLHttpRequest') ||
                      reason?.toString?.().includes('wadouri'))) {
          event.preventDefault()
          event.stopPropagation()
          console.warn('DICOM load failed - suppressing error')
          if (mounted && !error) {
            setError('Unable to load DICOM file in browser viewer.')
            setIsLoading(false)
          }
          return false
        }
      }
      
      window.addEventListener('unhandledrejection', rejectionHandler, true)

      let timeoutId: NodeJS.Timeout | undefined
      
      try {
        // Add timeout to prevent hanging
        timeoutId = setTimeout(() => {
          if (mounted && isLoading) {
            setError('DICOM loading timed out')
            setIsLoading(false)
          }
        }, 15000)
        // Dynamic imports
        const csCore = await import('@cornerstonejs/core')
        const csTools = await import('@cornerstonejs/tools')
        const csDicomImageLoader = await import('@cornerstonejs/dicom-image-loader')
        const dicomParser = await import('dicom-parser')

        if (!mounted) return

        const {
          RenderingEngine,
          Enums,
          imageLoader,
          init: initCornerstone,
        } = csCore

        const {
          ToolGroupManager,
          PanTool,
          ZoomTool,
          WindowLevelTool,
          StackScrollTool,
          init: initTools,
          addTool,
          Enums: ToolEnums,
        } = csTools

        // Initialize Cornerstone3D
        await initCornerstone()
        await initTools()

        // Configure DICOM Image Loader
        const imageLoaderModule: any = csDicomImageLoader.default || csDicomImageLoader
        
        // Register the wadouri image loader
        if (imageLoaderModule.wadouri && imageLoaderModule.wadouri.loadImage) {
          imageLoader.registerImageLoader('wadouri', imageLoaderModule.wadouri.loadImage)
        }
        
        imageLoaderModule.external = imageLoaderModule.external || {}
        imageLoaderModule.external.cornerstone = csCore
        imageLoaderModule.external.dicomParser = dicomParser

        if (imageLoaderModule.init) {
          imageLoaderModule.init({
            maxWebWorkers: 2,
            strict: false,
            decodeConfig: {
              convertFloatPixelDataToInt: false,
            },
          })
        }
        
        // Configure CORS for image loading
        if (imageLoaderModule.wadouri && imageLoaderModule.wadouri.dataSetCacheManager) {
          imageLoaderModule.wadouri.dataSetCacheManager.purge()
        }

        // Register tools
        addTool(PanTool)
        addTool(ZoomTool)
        addTool(WindowLevelTool)
        addTool(StackScrollTool)

        if (!viewerRef.current || !mounted) return

        // Create rendering engine
        const renderingEngineId = 'dicomRenderingEngine'
        const viewportId = 'dicomViewport'

        engine = new RenderingEngine(renderingEngineId)
        setRenderingEngine(engine)

        // Create viewport
        const viewportInput = {
          viewportId,
          type: Enums.ViewportType.STACK,
          element: viewerRef.current,
          defaultOptions: {
            background: [0, 0, 0] as [number, number, number],
          },
        }

        await engine.enableElement(viewportInput)
        const vp = engine.getViewport(viewportId)
        if (!vp) throw new Error('Viewport failed to initialize')
        setViewport(vp)

        // Create tool group
        const toolGroupId = 'dicomToolGroup'
        const toolGroup = ToolGroupManager.createToolGroup(toolGroupId)

        toolGroup?.addTool(PanTool.toolName)
        toolGroup?.addTool(ZoomTool.toolName)
        toolGroup?.addTool(WindowLevelTool.toolName)
        toolGroup?.addTool(StackScrollTool.toolName)

        toolGroup?.addViewport(viewportId, renderingEngineId)

        // Set active tool
        toolGroup?.setToolActive(PanTool.toolName, {
          bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }],
        })
        toolGroup?.setToolActive(ZoomTool.toolName, {
          bindings: [{ mouseButton: ToolEnums.MouseBindings.Secondary }],
        })
        toolGroup?.setToolActive(WindowLevelTool.toolName, {
          bindings: [{ mouseButton: ToolEnums.MouseBindings.Auxiliary }],
        })
        toolGroup?.setToolActive(StackScrollTool.toolName)

        // Load DICOM image
        setIsLoading(true)
        const imageId = `wadouri:${fileUrl}`
        
        try {
          const imageIds = [imageId]
          await vp.setStack(imageIds)
          vp.render()

          // Get image info
          const cache = csCore.cache
          const image: any = cache.getImage(imageId)
          if (image) {
            setImageInfo({
              rows: image.rows,
              columns: image.columns,
              pixelSpacing: image.rowPixelSpacing,
              sliceThickness: image.sliceThickness,
              modality: image.modality || 'DICOM',
            })
          }

          setIsLoading(false)
          if (timeoutId) clearTimeout(timeoutId)
        } catch (loadError: any) {
          if (timeoutId) clearTimeout(timeoutId)
          console.error('Error loading DICOM image:', loadError)
          if (mounted) {
            setError('Unable to load DICOM file. The file may require specialized software.')
            setIsLoading(false)
          }
        }
      } catch (err: any) {
        console.error('Error initializing DICOM viewer:', err)
        if (mounted) {
          setError('Unable to load DICOM file')
          setIsLoading(false)
        }
      }
    }

    initViewer()

    return () => {
      mounted = false
      if (rejectionHandler) {
        window.removeEventListener('unhandledrejection', rejectionHandler, true)
      }
      if (engine) {
        try {
          engine.destroy()
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }, [fileUrl])

  const handleZoom = (direction: 'in' | 'out') => {
    if (!viewport) return
    const camera = viewport.getCamera()
    const delta = direction === 'in' ? 0.1 : -0.1
    const newZoom = Math.max(0.1, Math.min(10, (camera.parallelScale || 1) * (1 - delta)))
    viewport.setCamera({ parallelScale: newZoom })
    viewport.render()
  }

  const handleRotate = () => {
    if (!viewport) return
    const camera = viewport.getCamera()
    const currentRotation = camera.viewPlaneNormal || [0, 0, 1]
    // Rotate 90 degrees
    viewport.setCamera({
      viewPlaneNormal: [-currentRotation[1], currentRotation[0], currentRotation[2]]
    })
    viewport.render()
  }

  const handleReset = () => {
    if (!viewport) return
    viewport.resetCamera()
    viewport.render()
  }

  const handleInvert = () => {
    if (!viewport) return
    const properties = viewport.getProperties()
    viewport.setProperties({
      ...properties,
      invert: !properties.invert,
    })
    viewport.render()
  }

  const handleFullscreen = () => {
    if (viewerRef.current) {
      viewerRef.current.requestFullscreen?.()
    }
  }

  const setTool = (tool: 'pan' | 'zoom' | 'wwwc') => {
    setActiveTool(tool)
    // Tool switching is handled by mouse bindings
  }

  return (
    <div className="border border-border-default rounded-lg overflow-hidden bg-black">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface-sunken border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-text-primary">DICOM Viewer</span>
          <span className="text-xs text-text-tertiary">• {filename}</span>
          {imageInfo && (
            <span className="text-xs text-text-tertiary">
              • {imageInfo.columns}x{imageInfo.rows} • {imageInfo.modality}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Tool Selection */}
          <div className="flex items-center gap-1 mr-2 border-r border-border-subtle pr-3">
            <button
              onClick={() => setTool('pan')}
              className={`p-2 rounded transition-colors ${
                activeTool === 'pan' 
                  ? 'bg-brand-600 text-white' 
                  : 'hover:bg-surface-page text-text-primary'
              }`}
              title="Pan (Left Click)"
            >
              <Move className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setTool('zoom')}
              className={`p-2 rounded transition-colors ${
                activeTool === 'zoom' 
                  ? 'bg-brand-600 text-white' 
                  : 'hover:bg-surface-page text-text-primary'
              }`}
              title="Zoom (Right Click)"
            >
              <Activity className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setTool('wwwc')}
              className={`p-2 rounded transition-colors ${
                activeTool === 'wwwc' 
                  ? 'bg-brand-600 text-white' 
                  : 'hover:bg-surface-page text-text-primary'
              }`}
              title="Window/Level (Middle Click)"
            >
              <Contrast className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom Controls */}
          <button
            onClick={() => handleZoom('out')}
            className="p-2 hover:bg-surface-page rounded transition-colors text-text-primary"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => handleZoom('in')}
            className="p-2 hover:bg-surface-page rounded transition-colors text-text-primary"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-border-subtle mx-2" />
          
          {/* Image Manipulation */}
          <button
            onClick={handleRotate}
            className="p-2 hover:bg-surface-page rounded transition-colors text-text-primary"
            title="Rotate 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleInvert}
            className="px-3 py-1.5 bg-surface-page hover:bg-surface-sunken rounded text-xs font-medium text-text-primary transition-colors"
            title="Invert Colors"
          >
            Invert
          </button>
          
          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-surface-page hover:bg-surface-sunken rounded text-xs font-medium text-text-primary transition-colors"
          >
            Reset
          </button>
          
          <div className="w-px h-6 bg-border-subtle mx-2" />
          
          <button
            onClick={handleFullscreen}
            className="p-2 hover:bg-surface-page rounded transition-colors text-text-primary"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          
          <a
            href={fileUrl}
            download={filename}
            className="p-2 hover:bg-surface-page rounded transition-colors text-brand-700"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Viewer */}
      <div className="relative bg-black">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center text-white">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-semibold">Loading DICOM image...</p>
              <p className="text-xs text-white/60 mt-2">Initializing Cornerstone3D renderer</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
            <div className="text-center text-white max-w-md px-6">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-amber-400" />
              <p className="text-sm font-semibold mb-2">DICOM Viewer Unavailable</p>
              <p className="text-xs text-white/70 mb-6">{error}</p>
              <p className="text-xs text-white/50 mb-4">Download the file to view with professional DICOM software:</p>
              <div className="text-xs text-white/60 mb-6 space-y-1">
                <p>• MicroDicom Viewer (Windows)</p>
                <p>• Horos (macOS)</p>
                <p>• Weasis (Cross-platform)</p>
                <p>• RadiAnt DICOM Viewer</p>
              </div>
              <a
                href={fileUrl}
                download={filename}
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 rounded-lg text-sm font-medium transition-colors"
              >
                <Download className="w-5 h-5" />
                Download DICOM File
              </a>
            </div>
          </div>
        )}

        <div
          ref={viewerRef}
          className="w-full h-[600px]"
          style={{ 
            display: isLoading || error ? 'none' : 'block'
          }}
        />
      </div>

      {/* Instructions */}
      <div className="px-4 py-2 bg-surface-sunken border-t border-border-subtle">
        <div className="flex items-center justify-between text-xs text-text-tertiary">
          <div className="flex items-center gap-6">
            <span>💡 <span className="font-semibold">Left Click:</span> Pan</span>
            <span><span className="font-semibold">Right Click:</span> Zoom</span>
            <span><span className="font-semibold">Middle Click:</span> Window/Level</span>
            <span><span className="font-semibold">Scroll:</span> Stack scroll</span>
          </div>
          <div className="text-white/40">
            Powered by Cornerstone3D
          </div>
        </div>
      </div>
    </div>
  )
}
