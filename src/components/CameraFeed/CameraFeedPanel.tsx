
import { useEffect, useRef, useState } from 'react'

interface CameraFeedPanelProps {
  flightData: {
    airline: string
    flightNumber: string
    flightClass: string
    menu: string
  }
  onImageCaptured?: (imageDataUrl: string) => void
  retakeMode?: boolean
}

const CameraFeedPanel = ({ flightData, onImageCaptured, retakeMode = false }: CameraFeedPanelProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCaptured, setIsCaptured] = useState(false)
  const [capturedStream, setCapturedStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selection, setSelection] = useState<{
    startX: number
    startY: number
    endX: number
    endY: number
  } | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  useEffect(() => {
    console.log('🎥 CameraFeedPanel mounted, starting camera...')
    
    const startCamera = async () => {
      try {
        console.log('📹 Requesting camera access...')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        })
        
        console.log('✅ Camera stream obtained:', stream)
        console.log('📺 Video tracks:', stream.getVideoTracks())
        
        // Video element is always rendered now, so ref should be available
        if (videoRef.current) {
          console.log('🎬 Setting video source...')
          videoRef.current.srcObject = stream
          setCapturedStream(stream) // Store the stream reference for retake functionality
          
          videoRef.current.onloadedmetadata = () => {
            console.log('📋 Video metadata loaded, starting playback')
            videoRef.current?.play().then(() => {
              console.log('▶️ Video started playing successfully')
            }).catch(console.error)
          }
          
          videoRef.current.oncanplay = () => {
            console.log('🎯 Video can play')
          }
          
          videoRef.current.onplay = () => {
            console.log('▶️ Video is playing')
          }
          
          videoRef.current.onerror = (e) => {
            console.error('❌ Video error:', e)
          }
          
          setIsStreaming(true)
          setError(null)
          
          // Fallback: try to play after a short delay
          setTimeout(() => {
            if (videoRef.current && videoRef.current.paused) {
              console.log('🔄 Fallback: attempting to play video')
              videoRef.current.play().catch(console.error)
            }
          }, 1000)
        } else {
          console.error('❌ Video ref is still null - this should not happen')
          setError('Video element not available')
        }
      } catch (err) {
        console.error('❌ Error accessing camera:', err)
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setError(`Unable to access camera: ${errorMessage}`)
        setIsStreaming(false)
      }
    }

    startCamera()

    // Cleanup function to stop the stream when component unmounts
    return () => {
      console.log('🧹 Cleaning up camera stream...')
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const handleCaptureStream = () => {
    if (videoRef.current && isStreaming) {
      console.log('📸 Capturing stream...')
      
      // Capture the current frame as an image
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      
      if (context && videoRef.current) {
        // Get the displayed video dimensions (not natural dimensions)
        const videoRect = videoRef.current.getBoundingClientRect()
        const containerRect = videoRef.current.parentElement?.getBoundingClientRect()
        
        if (containerRect) {
          canvas.width = containerRect.width
          canvas.height = containerRect.height
          
          console.log('📐 Video natural dimensions:', { 
            width: videoRef.current.videoWidth, 
            height: videoRef.current.videoHeight 
          })
          console.log('📐 Video displayed dimensions:', { 
            width: containerRect.width, 
            height: containerRect.height 
          })
          
          // Draw the video to match the displayed size
          context.drawImage(videoRef.current, 0, 0, containerRect.width, containerRect.height)
          
          // Convert to data URL
          const imageDataUrl = canvas.toDataURL('image/png')
          setCapturedImage(imageDataUrl)
          
          // Stop the camera stream
          if (capturedStream) {
            capturedStream.getTracks().forEach(track => track.stop())
          }
          
          setIsCaptured(true)
          setIsStreaming(false)
        }
      }
    }
  }

  const handleRetake = async () => {
    console.log('🔄 Retaking stream...')
    try {
      // Clear the captured image first
      setCapturedImage(null)
      setIsCaptured(false)
      setIsSelecting(false)
      setSelection(null)
      
      // Request a new camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })

      console.log('✅ New camera stream obtained:', stream)
      setCapturedStream(stream) // Update the stored stream reference

      if (videoRef.current) {
        console.log('🎬 Setting new video source...')
        videoRef.current.srcObject = stream
        
        videoRef.current.onloadedmetadata = () => {
          console.log('📋 Video metadata loaded, starting playback')
          videoRef.current?.play().then(() => {
            console.log('▶️ Video resumed successfully')
            setIsStreaming(true)
            setError(null)
          }).catch(console.error)
        }
        
        videoRef.current.oncanplay = () => {
          console.log('🎯 Video can play')
        }
        
        videoRef.current.onplay = () => {
          console.log('▶️ Video is playing')
        }
        
        videoRef.current.onerror = (e) => {
          console.error('❌ Video error:', e)
          setError('Video playback error')
        }
      }
    } catch (err) {
      console.error('❌ Error restarting camera:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(`Unable to restart camera: ${errorMessage}`)
      setIsStreaming(false)
    }
  }

  const handleSelect = () => {
    if (isCaptured) {
      setIsSelecting(!isSelecting)
      if (isSelecting) {
        setSelection(null)
      }
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!isCaptured) return
    
    console.log('🖱️ Mouse down - starting selection')
    
    // Start selection mode if not already active
    if (!isSelecting) {
      setIsSelecting(true)
    }
    
    const rect = e.currentTarget.getBoundingClientRect()
    const startX = e.clientX - rect.left
    const startY = e.clientY - rect.top
    
    console.log('📍 Start position:', { startX, startY })
    
    setSelection({
      startX,
      startY,
      endX: startX,
      endY: startY
    })
    setIsDrawing(true)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isDrawing || !selection) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const rect = e.currentTarget.getBoundingClientRect()
    const endX = e.clientX - rect.left
    const endY = e.clientY - rect.top
    
    setSelection({
      ...selection,
      endX,
      endY
    })
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLImageElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isDrawing && selection) {
      const rect = e.currentTarget.getBoundingClientRect()
      const endX = e.clientX - rect.left
      const endY = e.clientY - rect.top
      
      console.log('🖱️ Mouse up - ending selection')
      
      // Update final selection position
      const finalSelection = {
        ...selection,
        endX,
        endY
      }
      setSelection(finalSelection)
      
      setIsDrawing(false)
      setIsSelecting(false)
      
      // Only crop if there's a meaningful selection (minimum 10px)
      const width = Math.abs(finalSelection.endX - finalSelection.startX)
      const height = Math.abs(finalSelection.endY - finalSelection.startY)
      
      console.log('📏 Selection dimensions:', { width, height })
      
      if (width > 10 && height > 10 && capturedImage) {
        console.log('✂️ Cropping selection...')
        cropSelectedArea(finalSelection)
      } else {
        console.log('❌ Selection too small, clearing...')
        setSelection(null)
      }
    }
  }

  const cropSelectedArea = (selectionData: {
    startX: number
    startY: number
    endX: number
    endY: number
  }) => {
    if (!capturedImage) return
    
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) return
      
      // Calculate crop dimensions
      const cropX = Math.min(selectionData.startX, selectionData.endX)
      const cropY = Math.min(selectionData.startY, selectionData.endY)
      const cropWidth = Math.abs(selectionData.endX - selectionData.startX)
      const cropHeight = Math.abs(selectionData.endY - selectionData.startY)
      
      console.log('🖼️ Original image dimensions:', { width: img.width, height: img.height })
      console.log('✂️ Crop area:', { cropX, cropY, cropWidth, cropHeight })
      console.log('📐 Selection data:', selectionData)
      
      // Set canvas size to crop dimensions
      canvas.width = cropWidth
      canvas.height = cropHeight
      
      // Clear canvas with transparent background
      ctx.clearRect(0, 0, cropWidth, cropHeight)
      
      // Draw the cropped portion
      ctx.drawImage(
        img,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      )
      
      console.log('🎨 Canvas dimensions:', { width: canvas.width, height: canvas.height })
      
      // Convert to data URL
      const croppedImageDataUrl = canvas.toDataURL('image/png')
      
      console.log('Cropped image:', croppedImageDataUrl)
      console.log('Selection dimensions:', { cropX, cropY, cropWidth, cropHeight })
      
      // Pass the cropped image to parent component
      if (onImageCaptured) {
        onImageCaptured(croppedImageDataUrl)
      }
    }
    img.src = capturedImage
  }

  console.log('🔄 CameraFeedPanel render - isStreaming:', isStreaming, 'isCaptured:', isCaptured, 'error:', error)

  return (
    <div className=" bg-[#242835] rounded-lg p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <h3 className="text-xl font-bold text-white">Camera Feed</h3>
          {retakeMode && (
            <div className="bg-yellow-600 text-white px-3 py-1 rounded-full text-sm font-medium">
              Retake Mode
            </div>
          )}
          <div className="flex items-center space-x-2 text-[#5A5D66]">
            <span className="text-lg">|</span>
            <span className="text-lg font-medium">{flightData.airline}</span>
            <span className="text-sm">|</span>
            <span className="text-lg font-medium">{flightData.flightNumber}</span>
            <span className="text-sm">|</span>
            <span className="text-lg font-medium">{flightData.flightClass}</span>
            <span className="text-sm">|</span>
            <span className="text-lg font-medium">{flightData.menu}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleCaptureStream}
            disabled={!isStreaming}
            className={`font-semibold py-2 px-4 rounded-lg transition-colors duration-200 cursor-pointer ${
              isStreaming 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-500 text-gray-300 cursor-not-allowed'
            }`}
          >
            Capture Stream
          </button>
 
          <button 
            onClick={handleRetake}
            disabled={!isCaptured}
            className={`font-semibold py-2 px-4 rounded-lg transition-colors duration-200 cursor-pointer flex items-center space-x-2 ${
              isCaptured 
                ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                : 'bg-gray-500 text-gray-300 cursor-not-allowed'
            }`}
          >
            <span>Retake</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button 
            onClick={handleSelect}
            disabled={!isCaptured}
            className={`font-semibold py-2 px-4 rounded-lg transition-colors duration-200 cursor-pointer flex items-center space-x-2 ${
              isCaptured 
                ? isSelecting 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-[#171C2A] hover:bg-gray-600 text-white hover:text-black'
                : 'bg-gray-500 text-gray-300 cursor-not-allowed'
            }`}
          >
            <span>{isSelecting ? 'Cancel' : 'Select'}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Video Feed Area - Centered and Full Height */}
      <div className="flex-1 bg-[#242835] rounded-lg min-h-0 overflow-hidden relative">
        {/* Show captured image or video element */}
        {isCaptured && capturedImage ? (
          <div className="relative w-full h-full">
            <img
              src={capturedImage}
              alt="Captured frame"
              className="w-full h-full object-cover cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            {/* Selection rectangle overlay - only show when drawing */}
            {selection && isDrawing && (
              <div
                className="absolute border-2 border-blue-500 pointer-events-none"
                style={{
                  left: Math.min(selection.startX, selection.endX),
                  top: Math.min(selection.startY, selection.endY),
                  width: Math.abs(selection.endX - selection.startX),
                  height: Math.abs(selection.endY - selection.startY),
                }}
              />
            )}
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ backgroundColor: '#000' }}
          />
        )}
        
        {/* Overlay states */}
        {!isStreaming && !error && !isCaptured && (
          /* Loading State */
          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-800">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-white text-lg font-medium">Camera Stream</p>
              <p className="text-gray-400 text-sm mt-2">Connecting to camera...</p>
            </div>
          </div>
        )}
        
        
        {error && (
          /* Error State */
          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-800">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-white text-lg font-medium">Camera Error</p>
              <p className="text-gray-400 text-sm mt-2">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CameraFeedPanel
