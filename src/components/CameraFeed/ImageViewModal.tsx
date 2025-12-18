import { useEffect, useRef, useState } from 'react'
import image1 from '../../assets/images/1.jpg'

interface ImageViewModalProps {
  isOpen: boolean
  onClose: () => void
  coordinates: {
    x: number
    y: number
    width: number
    height: number
  }
  itemTitle: string
}

const ImageViewModal = ({ isOpen, onClose, coordinates, itemTitle }: ImageViewModalProps) => {
  const imageRef = useRef<HTMLImageElement>(null)
  const [imageDimensions, setImageDimensions] = useState<{
    naturalWidth: number
    naturalHeight: number
    displayWidth: number
    displayHeight: number
    offsetX: number
    offsetY: number
  } | null>(null)

  const calculateImageDimensions = () => {
    if (!imageRef.current) return

    const img = imageRef.current
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
    
    console.log('🖼️ Modal image dimensions calculated:', {
      natural: { width: naturalWidth, height: naturalHeight },
      display: { width: displayWidth, height: displayHeight },
      offset: { x: offsetX, y: offsetY }
    })
  }

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    } else {
      // Restore body scroll when modal is closed
      document.body.style.overflow = 'unset'
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      {/* Close Button - Top Right Corner */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="relative max-w-7xl max-h-full p-4">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white">
            View Coordinates: {itemTitle}
          </h2>
        </div>

        {/* Image Container */}
        <div className="relative bg-gray-800 rounded-lg overflow-hidden">
          <img
            ref={imageRef}
            src={image1}
            alt="Original image with coordinate overlay"
            className="max-w-full max-h-[80vh] object-contain"
            onLoad={() => {
              console.log('🖼️ Image loaded in modal')
              console.log('📍 Coordinates to display:', coordinates)
              // Calculate dimensions after image loads
              setTimeout(calculateImageDimensions, 100)
            }}
          />
          
          {/* Rectangle Overlay */}
          {imageDimensions && (
            <div
              className="absolute border-4 border-red-500 pointer-events-none"
              style={{
                left: `${imageDimensions.offsetX + (coordinates.x / imageDimensions.naturalWidth) * imageDimensions.displayWidth}px`,
                top: `${imageDimensions.offsetY + (coordinates.y / imageDimensions.naturalHeight) * imageDimensions.displayHeight}px`,
                width: `${(coordinates.width / imageDimensions.naturalWidth) * imageDimensions.displayWidth}px`,
                height: `${(coordinates.height / imageDimensions.naturalHeight) * imageDimensions.displayHeight}px`,
              }}
            >
              {/* Coordinate Label */}
              <div className="absolute -top-8 left-0 bg-red-500 text-white px-2 py-1 rounded text-sm font-mono">
                [{coordinates.x}, {coordinates.y}, {coordinates.width}, {coordinates.height}]
              </div>
            </div>
          )}
        </div>

        {/* Info Panel */}
        <div className="mt-4 bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-2">Coordinate Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Position:</span>
              <span className="text-white ml-2">({coordinates.x}, {coordinates.y})</span>
            </div>
            <div>
              <span className="text-gray-400">Size:</span>
              <span className="text-white ml-2">{coordinates.width} × {coordinates.height}</span>
            </div>
            <div>
              <span className="text-gray-400">Image Size:</span>
              <span className="text-white ml-2">1920 × 1080</span>
            </div>
            <div>
              <span className="text-gray-400">Percentage:</span>
              <span className="text-white ml-2">
                {Math.round((coordinates.width * coordinates.height) / (1920 * 1080) * 100)}% of image
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImageViewModal
