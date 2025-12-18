import { useState, useEffect, useRef } from 'react'
import CameraFeedPanel from './CameraFeedPanel'
import CapturedResults from './CapturedResults'
import ImageViewModal from './ImageViewModal'
import ReviewImages from './ReviewImages'
import { menuItems } from './menuItems'

interface Dish {
  dish_id: string
  name: string
  type: string
}

interface FlightData {
  airline: string
  flightNumber: string
  flightClass: string
  menu: string
  dishes?: Dish[]
}

interface CapturedItem {
  id: string
  title: string
  description: string
  capt_image: string
  coordinates?: {
    x: number
    y: number
    width: number
    height: number
  }
}

interface CameraFeedProps {
  flightData: FlightData
  onBack: () => void
}

const CameraFeed = ({ flightData, onBack }: CameraFeedProps) => {
  const [capturedImages, setCapturedImages] = useState<CapturedItem[]>([])
  const [retakeIndex, setRetakeIndex] = useState<number | null>(null)
  const [manualRectanglesCount, setManualRectanglesCount] = useState<number>(0)
  const [isMappingMode, setIsMappingMode] = useState<boolean>(false)
  const [usedColors, setUsedColors] = useState<string[]>([])
  const [rectanglesData, setRectanglesData] = useState<Array<{ color: string, coordinates: [number, number, number, number] }>>([])
  const [viewModal, setViewModal] = useState<{
    isOpen: boolean
    coordinates: { x: number, y: number, width: number, height: number } | null
    itemTitle: string
  }>({
    isOpen: false,
    coordinates: null,
    itemTitle: ''
  })
  const [currentPercentage, setCurrentPercentage] = useState(100)
  const [foodLevels, setFoodLevels] = useState<number[]>([100, 75, 50, 25, 0]) // Default food levels (always includes 0)
  const [coordinateHistory, setCoordinateHistory] = useState<{
    [itemName: string]: {
      [percentage: number]: { 
        x: number, 
        y: number, 
        width: number, 
        height: number,
        imageData: string,
        sourceImageData: string
      }
    }
  }>({})
  const [generatedJson, setGeneratedJson] = useState<string | null>(null)
  const [showReviewImages, setShowReviewImages] = useState(false)
  const [jsonData, setJsonData] = useState<any>(null)
  const [modelResults, setModelResults] = useState<any>(null)
  const [retakeColor, setRetakeColor] = useState<string | null>(null)
  const [fullCapturedImage, setFullCapturedImage] = useState<string | null>(null)
  // Store the update function from CameraFeedPanel
  const updateCoordinatesHandlerRef = useRef<((detectionIndex: number, color: string) => void) | null>(null)
  // Store the resume function from CameraFeedPanel
  const resumeStreamRef = useRef<(() => void) | null>(null)
  // Store the reset function from CameraFeedPanel
  const resetStateRef = useRef<(() => void) | null>(null)
  // Store the reset colors function from CapturedResults
  const resetColorsRef = useRef<(() => void) | null>(null)

  // Clear retakeColor when modelResults is cleared (e.g., on resume)
  useEffect(() => {
    if (modelResults === null) {
      setRetakeColor(null)
      setRetakeIndex(null)
    }
  }, [modelResults])
  
  // Clear retake mode when modelResults are updated with coordinates (after drawing in retake mode)
  useEffect(() => {
    if (modelResults && retakeIndex !== null && retakeColor) {
      // First check if it's a manual rectangle retake
      if (modelResults._manualRectangles) {
        const manualRectWithColor = modelResults._manualRectangles.find((rect: any) => 
          rect.color === retakeColor && rect.coordinates && rect.coordinates.length === 4
        )
        
        if (manualRectWithColor) {
          setRetakeIndex(null)
          setRetakeColor(null)
          return
        }
      }
      
      // Check if the detection for retakeColor now has coordinates (was updated)
      const detectionColorPalette = [
        '#FFFF00', '#00FF00', '#FF00FF', '#00FFFF', '#FF8C00',
        '#9370DB', '#FF1493', '#00CED1', '#FFD700', '#32CD32',
      ]
      
      if (modelResults.model_results?.deetction_results) {
        const detectionWithColor = modelResults.model_results.deetction_results.find((detection: any, index: number) => {
          const detectionColor = detectionColorPalette[index % detectionColorPalette.length]
          return detectionColor === retakeColor && detection.coordinates && detection.coordinates.length === 4
        })
        
        // If detection now has coordinates, clear retake mode
        if (detectionWithColor) {
          setRetakeIndex(null)
          setRetakeColor(null)
        }
      }
    }
  }, [modelResults, retakeIndex, retakeColor])

  const handleImageCaptured = (imageDataUrl: string, coordinates?: { x: number, y: number, width: number, height: number }, sourceImageData?: string) => {
    if (retakeIndex !== null) {
      // Retake mode - update existing image
      setCapturedImages(prev => {
        const updated = [...prev]
        updated[retakeIndex] = {
          ...updated[retakeIndex],
          capt_image: imageDataUrl,
          coordinates: coordinates
        }
        return updated
      })
      setRetakeIndex(null) // Reset retake mode
      setRetakeColor(null) // Clear retake color
    } else {
      // Normal capture mode - add new image
      const currentIndex = capturedImages.length
      const menuItem = menuItems[currentIndex]
      const newItem: CapturedItem = {
        id: `capture-${Date.now()}`,
        title: menuItem ? menuItem.title : `Captured Area ${currentIndex + 1}`,
        description: menuItem ? menuItem.description : 'Selected area from camera feed',
        capt_image: imageDataUrl,
        coordinates: coordinates
      }
      
      setCapturedImages(prev => {
        const updated = [...prev, newItem]
        return updated
      })
    }

    // Store coordinates in history for current percentage
    if (coordinates) {
      let currentIndex: number
      let itemName: string
      
      if (retakeIndex !== null) {
        // Retake mode - use the retake index
        currentIndex = retakeIndex
        const menuItem = menuItems[currentIndex]
        itemName = menuItem ? menuItem.title : `Captured Area ${currentIndex + 1}`
      } else {
        // Normal capture mode - use current capturedImages length
        currentIndex = capturedImages.length
        const menuItem = menuItems[currentIndex]
        itemName = menuItem ? menuItem.title : `Captured Area ${currentIndex + 1}`
      }
      
      setCoordinateHistory(prev => ({
        ...prev,
        [itemName]: {
          ...prev[itemName],
          [currentPercentage]: {
            ...coordinates,
            imageData: imageDataUrl,
            sourceImageData: sourceImageData || ''
          }
        }
      }))
    }
  }

  const handleRetake = (itemIndex: number, selectedColor?: string) => {
    // Clear the image for this item when retake is clicked
    setCapturedImages(prev => {
      const updated = [...prev]
      if (updated[itemIndex]) {
        updated[itemIndex] = {
          ...updated[itemIndex],
          capt_image: '' // Clear the image
        }
      }
      return updated
    })
    
    setRetakeIndex(itemIndex)
    setRetakeColor(selectedColor || null)
  }

  const handleResetAll = () => {
    setCapturedImages([])
    setRetakeIndex(null)
    setRetakeColor(null)
    setModelResults(null) // Clear model results to reset rectangles and selected colors
    
    // Resume the stream (same behavior as Resume button)
    if (resumeStreamRef.current) {
      resumeStreamRef.current()
    }
  }

  const handleView = (itemIndex: number) => {
    const item = capturedImages[itemIndex]
    if (item && item.coordinates) {
      setViewModal({
        isOpen: true,
        coordinates: item.coordinates,
        itemTitle: item.title
      })
    }
  }

  const handleCloseModal = () => {
    setViewModal({
      isOpen: false,
      coordinates: null,
      itemTitle: ''
    })
  }

  const handleNextOrDone = () => {
    // Find current index in food levels array
    const currentIndex = foodLevels.indexOf(currentPercentage)
    const isLastLevel = currentIndex === foodLevels.length - 1
    
    if (isLastLevel) {
      // Done clicked - navigate directly back to form section
      onBack()
    } else {
      // Move to next percentage using dynamic food levels
      const nextPercentage = foodLevels[currentIndex + 1]
      setCurrentPercentage(nextPercentage)
      
      // Reset captured images for the new percentage level
      setCapturedImages([])
      setRetakeIndex(null)
    }
  }

  const handleGenerateJson = () => {
    // Use the stored JSON data if available, otherwise generate new one
    const dataToUse = jsonData || {
      flightData: {
        airline: flightData.airline,
        flightNumber: flightData.flightNumber,
        flightClass: flightData.flightClass,
        menu: flightData.menu
      },
      capturedItems: Object.keys(coordinateHistory).map(itemName => ({
        itemName: itemName,
        captureData: {
          "100%": coordinateHistory[itemName][100] ? {
            imageData: coordinateHistory[itemName][100].imageData,
            sourceImageData: coordinateHistory[itemName][100].sourceImageData,
            rectangle: {
              x: coordinateHistory[itemName][100].x,
              y: coordinateHistory[itemName][100].y,
              width: coordinateHistory[itemName][100].width,
              height: coordinateHistory[itemName][100].height
            },
            status: "captured"
          } : { status: "not_captured" },
          "75%": coordinateHistory[itemName][75] ? {
            imageData: coordinateHistory[itemName][75].imageData,
            sourceImageData: coordinateHistory[itemName][75].sourceImageData,
            rectangle: {
              x: coordinateHistory[itemName][75].x,
              y: coordinateHistory[itemName][75].y,
              width: coordinateHistory[itemName][75].width,
              height: coordinateHistory[itemName][75].height
            },
            status: "captured"
          } : { status: "not_captured" },
          "50%": coordinateHistory[itemName][50] ? {
            imageData: coordinateHistory[itemName][50].imageData,
            sourceImageData: coordinateHistory[itemName][50].sourceImageData,
            rectangle: {
              x: coordinateHistory[itemName][50].x,
              y: coordinateHistory[itemName][50].y,
              width: coordinateHistory[itemName][50].width,
              height: coordinateHistory[itemName][50].height
            },
            status: "captured"
          } : { status: "not_captured" },
          "25%": coordinateHistory[itemName][25] ? {
            imageData: coordinateHistory[itemName][25].imageData,
            sourceImageData: coordinateHistory[itemName][25].sourceImageData,
            rectangle: {
              x: coordinateHistory[itemName][25].x,
              y: coordinateHistory[itemName][25].y,
              width: coordinateHistory[itemName][25].width,
              height: coordinateHistory[itemName][25].height
            },
            status: "captured"
          } : { status: "not_captured" }
        }
      })),
      metadata: {
        totalItems: Object.keys(coordinateHistory).length,
        captureDate: new Date().toISOString(),
        version: "1.0",
        description: "Each item contains image data and rectangle coordinates for drawing capture areas"
      }
    }
    
    const jsonString = JSON.stringify(dataToUse, null, 2)
    setGeneratedJson(jsonString)
  }

  const isAllItemsCaptured = () => {
    // Check if all items are captured for the current percentage level
    // This checks if we have captured images in current session OR if we have coordinates for current percentage
    const currentSessionComplete = capturedImages.length === menuItems.length
    
    // Also check if we already have coordinates for all items at current percentage
    const allItemsHaveCurrentPercentage = menuItems.every(menuItem => {
      return coordinateHistory[menuItem.title] && coordinateHistory[menuItem.title][currentPercentage]
    })
    
    return currentSessionComplete || allItemsHaveCurrentPercentage
  }

  const getButtonText = () => {
    const currentIndex = foodLevels.indexOf(currentPercentage)
    const isLastLevel = currentIndex === foodLevels.length - 1
    return isLastLevel ? 'Done' : 'Next'
  }

  // Handle food levels update from CameraFeedPanel (from welcome message)
  const handleFoodLevelsUpdate = (levels: number[]) => {
    console.log('📥 CameraFeed received food levels update:', levels)
    console.log('🔢 Total food levels:', levels.length)
    setFoodLevels(levels)
    // Set current percentage to first level
    if (levels.length > 0) {
      console.log('✅ Setting current percentage to:', levels[0])
      setCurrentPercentage(levels[0])
    }
  }

  // Prepare data for ReviewImages component - use JSON data if available, otherwise use coordinateHistory
  const reviewImagesData = jsonData ? 
    jsonData.capturedItems.map((item: any) => ({
      itemName: item.itemName,
      coordinates: {
        "100%": item.captureData["100%"].status === "captured" ? {
          x: item.captureData["100%"].rectangle.x,
          y: item.captureData["100%"].rectangle.y,
          width: item.captureData["100%"].rectangle.width,
          height: item.captureData["100%"].rectangle.height,
          imageData: item.captureData["100%"].imageData,
          sourceImageData: item.captureData["100%"].sourceImageData
        } : null,
        "75%": item.captureData["75%"].status === "captured" ? {
          x: item.captureData["75%"].rectangle.x,
          y: item.captureData["75%"].rectangle.y,
          width: item.captureData["75%"].rectangle.width,
          height: item.captureData["75%"].rectangle.height,
          imageData: item.captureData["75%"].imageData,
          sourceImageData: item.captureData["75%"].sourceImageData
        } : null,
        "50%": item.captureData["50%"].status === "captured" ? {
          x: item.captureData["50%"].rectangle.x,
          y: item.captureData["50%"].rectangle.y,
          width: item.captureData["50%"].rectangle.width,
          height: item.captureData["50%"].rectangle.height,
          imageData: item.captureData["50%"].imageData,
          sourceImageData: item.captureData["50%"].sourceImageData
        } : null,
        "25%": item.captureData["25%"].status === "captured" ? {
          x: item.captureData["25%"].rectangle.x,
          y: item.captureData["25%"].rectangle.y,
          width: item.captureData["25%"].rectangle.width,
          height: item.captureData["25%"].rectangle.height,
          imageData: item.captureData["25%"].imageData,
          sourceImageData: item.captureData["25%"].sourceImageData
        } : null
      }
    })) :
    Object.keys(coordinateHistory).map(itemName => ({
      itemName: itemName,
      coordinates: {
        "100%": coordinateHistory[itemName][100] || null,
        "75%": coordinateHistory[itemName][75] || null,
        "50%": coordinateHistory[itemName][50] || null,
        "25%": coordinateHistory[itemName][25] || null
      }
    }))


  // Show ReviewImages component if showReviewImages is true
  if (showReviewImages) {
    return (
      <ReviewImages 
        items={reviewImagesData}
        onBack={() => setShowReviewImages(false)}
        onGenerateJson={handleGenerateJson}
        onComplete={onBack}
      />
    )
  }

  return (
    <div className="h-full w-full bg-gray-900 text-white overflow-hidden flex flex-col">
      {/* Main Content - Two Panel Layout */}
      <div className="flex-1 flex gap-6 p-6 pb-8 overflow-hidden min-h-0">
        {/* Left Panel - Camera Feed */}
        <div className="flex-1 min-w-0 min-h-0">
          <CameraFeedPanel 
            flightData={flightData}
            currentPercentage={currentPercentage}
            onImageCaptured={handleImageCaptured}
            onModelResults={(results) => {
              setModelResults(results)
            }}
            onTimeoutRedirect={onBack}
            onFoodLevelsUpdate={handleFoodLevelsUpdate}
            onMissingDishesUpdate={(count) => {
              // Update modelResults with new missing_dishes count
              setModelResults((prev: any) => {
                if (!prev) return prev
                
                const updated = { ...prev }
                if (updated.data?.model_results) {
                  updated.data.model_results.missing_dishes = count
                } else if (updated.model_results) {
                  updated.model_results.missing_dishes = count
                } else {
                  updated.missing_dishes = count
                }
                return updated
              })
            }}
            onManualRectanglesCountUpdate={(count) => {
              setManualRectanglesCount(count)
            }}
            onMappingModeChange={(isMappingMode, colors, rectangles) => {
              setIsMappingMode(isMappingMode)
              setUsedColors(colors)
              setRectanglesData(rectangles)
            }}
            isMappingModeActive={isMappingMode}
            onResumeReady={(resumeFn) => {
              resumeStreamRef.current = resumeFn
            }}
            onResetReady={(resetFn) => {
              resetStateRef.current = resetFn
            }}
            retakeIndex={retakeIndex}
            retakeColor={retakeColor}
            onCapturedImageChange={(imageData) => {
              setFullCapturedImage(imageData)
            }}
            onClearCapturedResults={() => {
              // Reset selected colors in CapturedResults (same as Next button)
              if (resetColorsRef.current) {
                resetColorsRef.current()
              }
              
              // Clear all captured images
              setCapturedImages([])
              
              // Reset mapping mode
              setIsMappingMode(false)
            }}
            fullCapturedImage={fullCapturedImage}
            onUpdateCapturedImage={(itemIndex, croppedImage) => {
              // Validate input
              if (!croppedImage || typeof croppedImage !== 'string' || croppedImage.length === 0) {
                alert('Error: Invalid image data received')
                return
              }

              setCapturedImages(prev => {
                const updated = [...prev]
                const menuItem = menuItems[itemIndex]
                const timestamp = Date.now()
                
                if (updated[itemIndex]) {
                  // Update existing item with new cropped image
                  // Create new object reference to ensure React detects the change
                  updated[itemIndex] = {
                    ...updated[itemIndex],
                    capt_image: croppedImage,
                    updatedAt: timestamp // Timestamp to force React re-render
                  } as any
                } else {
                  // Create new item if it doesn't exist
                  updated[itemIndex] = {
                    id: `capture-${timestamp}-${itemIndex}`,
                    title: menuItem?.title || `Captured Area ${itemIndex + 1}`,
                    description: menuItem?.description || 'Selected area from camera feed',
                    capt_image: croppedImage,
                    updatedAt: timestamp
                  } as any
                }
                
                return updated
              })
            }}
          />
        </div>
        
        {/* Right Panel - Captured Results */}
        <div className="flex-1 min-w-0 min-h-0">
          <CapturedResults 
            onBack={onBack} 
            onNext={handleNextOrDone} 
            capturedImages={capturedImages}
            onRetake={handleRetake}
            retakeIndex={retakeIndex}
            onResetAll={handleResetAll}
            onView={handleView}
            currentPercentage={currentPercentage}
            foodLevels={foodLevels}
            isAllItemsCaptured={isAllItemsCaptured()}
            buttonText={getButtonText()}
            generatedJson={generatedJson}
            modelResults={modelResults}
            fullCapturedImage={fullCapturedImage}
            manualRectanglesCount={manualRectanglesCount}
            isMappingModeActive={isMappingMode}
            usedColors={usedColors}
            rectanglesData={rectanglesData}
            dishes={flightData.dishes}
            flightNumber={flightData.flightNumber}
            menu={flightData.menu}
            onResume={() => {
              // Reset all states for new capture
              if (resetStateRef.current) {
                resetStateRef.current()
              }
              
              // Reset selected colors in CapturedResults
              if (resetColorsRef.current) {
                resetColorsRef.current()
              }
              
              // Clear all captured images
              setCapturedImages([])
              
              // Resume camera stream
              if (resumeStreamRef.current) {
                resumeStreamRef.current()
              }
              
              // Reset mapping mode
              setIsMappingMode(false)
            }}
            onResetColorsReady={(resetFn) => {
              resetColorsRef.current = resetFn
            }}
            onUpdateCoordinates={(detectionIndex, color) => {
              if (updateCoordinatesHandlerRef.current) {
                updateCoordinatesHandlerRef.current(detectionIndex, color)
              }
            }}
            onUpdateCapturedImage={(itemIndex, croppedImage) => {
              setCapturedImages(prev => {
                const updated = [...prev]
                
                // Update or create item with cropped image
                if (updated[itemIndex]) {
                  // Update existing item with cropped image
                  updated[itemIndex] = {
                    ...updated[itemIndex],
                    capt_image: croppedImage
                  }
                } else {
                  // Create new item if it doesn't exist
                  // Use menuItem if available, otherwise use default values
                  const menuItem = menuItems[itemIndex]
                  updated[itemIndex] = {
                    id: `capture-${Date.now()}-${itemIndex}`,
                    title: menuItem?.title || `Captured Area ${itemIndex + 1}`,
                    description: menuItem?.description || 'Selected area from camera feed',
                    capt_image: croppedImage
                  }
                }
                
                return updated
              })
            }}
          />
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

export default CameraFeed
