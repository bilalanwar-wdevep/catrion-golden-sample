import { useState } from 'react'
import CameraFeedPanel from './CameraFeedPanel'
import CapturedResults from './CapturedResults'

interface FlightData {
  airline: string
  flightNumber: string
  flightClass: string
  menu: string
}

interface CapturedItem {
  id: string
  title: string
  description: string
  capt_image: string
}

interface CameraFeedProps {
  flightData: FlightData
  onBack: () => void
  onNext: () => void
}

const CameraFeed = ({ flightData, onBack, onNext }: CameraFeedProps) => {
  const [capturedImages, setCapturedImages] = useState<CapturedItem[]>([])
  const [retakeIndex, setRetakeIndex] = useState<number | null>(null)

  const handleImageCaptured = (imageDataUrl: string) => {
    console.log('📸 Image captured in CameraFeed:', imageDataUrl.substring(0, 50) + '...')
    
    if (retakeIndex !== null) {
      // Retake mode - update existing image
      console.log('🔄 Retaking image for index:', retakeIndex)
      setCapturedImages(prev => {
        const updated = [...prev]
        updated[retakeIndex] = {
          ...updated[retakeIndex],
          capt_image: imageDataUrl
        }
        console.log('📊 Updated image at index:', retakeIndex)
        return updated
      })
      setRetakeIndex(null) // Reset retake mode
    } else {
      // Normal capture mode - add new image
      const newItem: CapturedItem = {
        id: `capture-${Date.now()}`,
        title: `Captured Area ${capturedImages.length + 1}`,
        description: 'Selected area from camera feed',
        capt_image: imageDataUrl
      }
      
      console.log('📝 Adding new item to capturedImages:', newItem)
      setCapturedImages(prev => {
        const updated = [...prev, newItem]
        console.log('📊 Updated capturedImages array:', updated.length, 'items')
        return updated
      })
    }
  }

  const handleRetake = (itemIndex: number) => {
    console.log('🔄 Retake requested for item index:', itemIndex)
    setRetakeIndex(itemIndex)
  }

  return (
    <div className="h-screen w-full bg-gray-900 text-white overflow-hidden flex flex-col">
      {/* Main Content - Two Panel Layout */}
      <div className="flex-1 flex gap-6 p-6 pb-8 overflow-hidden">
        {/* Left Panel - Camera Feed */}
        <div className="flex-1 ">
          <CameraFeedPanel 
            flightData={flightData} 
            onImageCaptured={handleImageCaptured}
            retakeMode={retakeIndex !== null}
          />
        </div>
        
        {/* Right Panel - Captured Results */}
        <div className="flex-1">
          <CapturedResults 
            onBack={onBack} 
            onNext={onNext} 
            capturedImages={capturedImages}
            onRetake={handleRetake}
          />
        </div>
      </div>
    </div>
  )
}

export default CameraFeed
