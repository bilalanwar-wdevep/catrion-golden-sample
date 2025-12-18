import React, { useState, useRef, useEffect } from 'react'
import ImageViewModal from './ImageViewModal'

interface CoordinateData {
  x: number
  y: number
  width: number
  height: number
  imageData: string
  sourceImageData: string
}

interface ReviewImageData {
  itemName: string
  coordinates: {
    "100%": CoordinateData | null
    "75%": CoordinateData | null
    "50%": CoordinateData | null
    "25%": CoordinateData | null
  }
}

interface ReviewImagesProps {
  items: ReviewImageData[]
  onBack: () => void
  onGenerateJson: () => void
  onComplete?: () => void
}

// Component for displaying captured images
const ImageWithRectangle: React.FC<{
  imageData: string
  coordinates: { x: number; y: number; width: number; height: number }
  alt: string
  sourceImageData?: string
  onImageClick?: () => void
}> = ({ imageData, coordinates, alt, sourceImageData, onImageClick }) => {
  // Log source image data for debugging
  console.log('🖼️ ImageWithRectangle - sourceImageData available:', !!sourceImageData)
  
  const [imageDimensions, setImageDimensions] = useState<{
    naturalWidth: number
    naturalHeight: number
    displayWidth: number
    displayHeight: number
    offsetX: number
    offsetY: number
  } | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = imgRef.current
    if (img) {
      const handleLoad = () => {
        const containerRect = img.parentElement?.getBoundingClientRect()
        if (!containerRect) return

        const naturalWidth = img.naturalWidth
        const naturalHeight = img.naturalHeight
        
        // Calculate how the image is actually rendered (object-contain behavior)
        const containerAspect = containerRect.width / containerRect.height
        const imageAspect = naturalWidth / naturalHeight
        
        let displayWidth, displayHeight, offsetX, offsetY
        
        if (imageAspect > containerAspect) {
          // Image is wider - fit to width, center vertically
          displayWidth = containerRect.width
          displayHeight = containerRect.width / imageAspect
          offsetX = 0
          offsetY = (containerRect.height - displayHeight) / 2
        } else {
          // Image is taller - fit to height, center horizontally
          displayHeight = containerRect.height
          displayWidth = containerRect.height * imageAspect
          offsetX = (containerRect.width - displayWidth) / 2
          offsetY = 0
        }
        
        setImageDimensions({
          naturalWidth,
          naturalHeight,
          displayWidth,
          displayHeight,
          offsetX,
          offsetY
        })
      }
      
      if (img.complete) {
        handleLoad()
      } else {
        img.addEventListener('load', handleLoad)
        return () => img.removeEventListener('load', handleLoad)
      }
    }
  }, [sourceImageData])

  return (
    <div className="relative w-full h-48 overflow-hidden rounded-lg border border-gray-600 shadow-lg bg-gray-800">
      <img
        ref={imgRef}
        src={sourceImageData || imageData}
        alt={alt}
        className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
        onClick={onImageClick}
      />
      
      {/* Rectangle Overlay */}
      {imageDimensions && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Main Rectangle */}
          <div
            className="absolute border-2 border-red-500"
            style={{
              left: `${imageDimensions.offsetX + (coordinates.x / imageDimensions.naturalWidth) * imageDimensions.displayWidth}px`,
              top: `${imageDimensions.offsetY + (coordinates.y / imageDimensions.naturalHeight) * imageDimensions.displayHeight}px`,
              width: `${(coordinates.width / imageDimensions.naturalWidth) * imageDimensions.displayWidth}px`,
              height: `${(coordinates.height / imageDimensions.naturalHeight) * imageDimensions.displayHeight}px`,
            }}
          >
            {/* Corner Indicators */}
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 border border-white rounded-full"></div>
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 border border-white rounded-full"></div>
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-red-500 border border-white rounded-full"></div>
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-red-500 border border-white rounded-full"></div>
          </div>
          
          {/* Label */}
          <div 
            className="absolute bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg"
            style={{
              left: `${imageDimensions.offsetX + (coordinates.x / imageDimensions.naturalWidth) * imageDimensions.displayWidth}px`,
              top: `${Math.max(imageDimensions.offsetY + (coordinates.y / imageDimensions.naturalHeight) * imageDimensions.displayHeight - 25, 5)}px`,
            }}
          >
            <div className="text-xs">{coordinates.x}, {coordinates.y}</div>
            <div className="text-xs">{coordinates.width}×{coordinates.height}</div>
          </div>
        </div>
      )}
    </div>
  )
}

const ReviewImages: React.FC<ReviewImagesProps> = ({ items, onBack, onGenerateJson, onComplete }) => {
  const [viewModal, setViewModal] = useState<{
    isOpen: boolean
    coordinates: { x: number, y: number, width: number, height: number } | null
    itemTitle: string
    sourceImageData?: string
    capturedImageData?: string
  }>({
    isOpen: false,
    coordinates: null,
    itemTitle: '',
    sourceImageData: undefined,
    capturedImageData: undefined
  })

  const handleImageClick = (itemName: string, percentage: string, data: CoordinateData) => {
    setViewModal({
      isOpen: true,
      coordinates: {
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height
      },
      itemTitle: `${itemName} - ${percentage}`,
      sourceImageData: data.sourceImageData,
      capturedImageData: data.imageData
    })
  }

  const handleCloseModal = () => {
    setViewModal({
      isOpen: false,
      coordinates: null,
      itemTitle: '',
      sourceImageData: undefined,
      capturedImageData: undefined
    })
  }

  // Debug: Log what data we're receiving
  console.log('🔍 ReviewImages received items:', items)
  console.log('📊 Items length:', items.length)
  console.log('📋 Items details:', items.map(item => ({ name: item.itemName, hasData: Object.values(item.coordinates).some(c => c !== null) })))
  
  return (
    <div className="h-full w-full bg-gray-900 text-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Review Captured Images</h1>
            <p className="text-gray-400 mt-1">All captured images with rectangles showing capture areas</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
            >
              Back to Capture
            </button>
            <button
              onClick={onGenerateJson}
              className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-medium"
            >
              Generate JSON
            </button>
            {onComplete && (
              <button
                onClick={onComplete}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
              >
                Complete & Back to Form
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="w-full space-y-8">
          {items.map((item, itemIndex) => (
            <div key={item.itemName} className="bg-gray-800 rounded-lg p-6">
              {/* Item Header */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">{item.itemName}</h2>
                <p className="text-gray-400 text-sm mt-1">Item #{itemIndex + 1}</p>
              </div>

              {/* Images Grid - 4 columns for percentages */}
              <div className="grid grid-cols-4 gap-6">
                {["100%", "75%", "50%", "25%"].map((percentage) => {
                  const data = item.coordinates[percentage as keyof typeof item.coordinates]
                  const hasData = data !== null
                  
                  // Debug: Log data for each percentage
                  console.log(`🔍 ${item.itemName} at ${percentage}%:`, data)
                  console.log(`📊 Has data:`, hasData)
                  
                  return (
                    <div key={percentage} className="text-center">
                      {/* Percentage Header */}
                      <div className="mb-4">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <div className={`w-3 h-3 rounded-full ${hasData ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                          <span className="text-white font-semibold text-lg">{percentage}</span>
                        </div>
                        {hasData && data && (
                          <div className="text-xs text-gray-400">
                            <div>Position: ({data.x}, {data.y})</div>
                            <div>Size: {data.width} × {data.height}</div>
                          </div>
                        )}
                      </div>

                      {/* Image Container */}
                      <div className="relative">
                        {hasData && data ? (
                          <div className="relative">
                            <ImageWithRectangle
                              imageData={data.sourceImageData || data.imageData}
                              coordinates={{
                                x: data.x,
                                y: data.y,
                                width: data.width,
                                height: data.height
                              }}
                              alt={`${item.itemName} at ${percentage}`}
                              sourceImageData={data.sourceImageData}
                              onImageClick={() => handleImageClick(item.itemName, percentage, data)}
                            />
                            {/* View Button */}
                            <button
                              onClick={() => handleImageClick(item.itemName, percentage, data)}
                              className="absolute bottom-2 right-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1 shadow-lg"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span>View</span>
                            </button>
                          </div>
                        ) : (
                          <div className="w-full h-48 bg-gray-700 rounded-lg border border-gray-600 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-gray-400 text-sm mb-2">No image captured</div>
                              <div className="text-gray-500 text-xs">Missing at {percentage}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Image View Modal */}
      {viewModal.isOpen && viewModal.coordinates && (
        <ImageViewModal
          isOpen={viewModal.isOpen}
          onClose={handleCloseModal}
          coordinates={viewModal.coordinates}
          itemTitle={viewModal.itemTitle}
        />
      )}
    </div>
  )
}

export default ReviewImages
