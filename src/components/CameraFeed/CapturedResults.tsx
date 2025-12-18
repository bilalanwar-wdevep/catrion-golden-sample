import { useMemo, useState, useEffect } from 'react'
import { menuItems } from './menuItems'
import { backendApi } from '../../utils/api'
import Swal from 'sweetalert2'

interface Dish {
  dish_id: string
  name: string
  type: string
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

interface RectangleData {
  color: string
  coordinates: [number, number, number, number]
}

interface CapturedResultsProps {
  onBack: () => void
  onNext: () => void
  capturedImages: CapturedItem[]
  onRetake: (itemIndex: number, selectedColor?: string) => void
  retakeIndex: number | null
  onResetAll: () => void
  onView: (itemIndex: number) => void
  currentPercentage: number
  foodLevels?: number[] // Array of all food levels
  isAllItemsCaptured: boolean
  buttonText: string
  generatedJson: string | null
  modelResults?: any
  fullCapturedImage?: string | null
  onUpdateCoordinates?: (detectionIndex: number, color: string) => void
  onUpdateCapturedImage?: (itemIndex: number, croppedImage: string) => void
  manualRectanglesCount?: number
  isMappingModeActive?: boolean
  usedColors?: string[]
  rectanglesData?: RectangleData[]
  onResume?: () => void
  onResetColorsReady?: (resetFn: () => void) => void
  dishes?: Dish[]
  flightNumber?: string
  menu?: string
}

const CapturedResults = ({ 
  onBack, 
  onNext, 
  capturedImages,
  onRetake,
  onView,
  currentPercentage,
  foodLevels = [100, 75, 50, 25, 0], // Default food levels (always includes 0)
  isAllItemsCaptured, 
  buttonText,
  modelResults,
  manualRectanglesCount = 0,
  isMappingModeActive = false,
  usedColors = [],
  rectanglesData = [],
  onResume,
  onResetColorsReady,
  fullCapturedImage,
  onUpdateCapturedImage,
  dishes = [],
  flightNumber = '',
  menu = ''
}: CapturedResultsProps) => {
  
  // Use dishes from API, fallback to menuItems
  const displayItems = useMemo(() => {
    if (dishes && dishes.length > 0) {
      return dishes.map((dish, index) => ({
        id: dish.dish_id,
        title: dish.name,
        description: dish.type
      }))
    }
    return menuItems
  }, [dishes])
  
  // State to track selected color for each menu item
  const [selectedColors, setSelectedColors] = useState<{ [itemIndex: number]: string }>({})
  
  // State to track which dropdown is open
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null)
  
  // State for image modal
  const [modalImage, setModalImage] = useState<string | null>(null)
  
  // State for API loading
  const [isSubmittingMapping, setIsSubmittingMapping] = useState(false)
  
  // State for acknowledgement modal
  const [showAcknowledgement, setShowAcknowledgement] = useState(false)
  const [acknowledgementChecked, setAcknowledgementChecked] = useState(false)
  
  // Check if this is the final step (last food level, which is 0)
  const currentIndex = foodLevels.indexOf(currentPercentage)
  const isFinalStep = currentIndex === foodLevels.length - 1
  const displayButtonText = isFinalStep ? 'Done' : buttonText
  
  // Pass reset function to parent on mount
  useEffect(() => {
    if (onResetColorsReady) {
      onResetColorsReady(() => {
        setSelectedColors({})
        setOpenDropdownIndex(null)
        setModalImage(null)
      })
    }
  }, [onResetColorsReady])
  
  // Function to crop image based on rectangle coordinates
  const cropImageFromRectangle = (imageBase64: string, coordinates: number[]): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          reject('Canvas context not available')
          return
        }
        
        console.log('Image loaded - Natural dimensions:', img.naturalWidth, 'x', img.naturalHeight)
        console.log('Raw coordinates:', coordinates)
        
        // coordinates are [x1, y1, x2, y2] - need to check if they're in image pixel space
        let [x1, y1, x2, y2] = coordinates
        
        // Check if coordinates are normalized (0-1) or need scaling
        if (x2 <= 1 && y2 <= 1) {
          // Coordinates are normalized, scale to image dimensions
          console.log('Coordinates appear normalized, scaling to image dimensions')
          x1 = x1 * img.naturalWidth
          y1 = y1 * img.naturalHeight
          x2 = x2 * img.naturalWidth
          y2 = y2 * img.naturalHeight
          console.log('Scaled coordinates:', x1, y1, x2, y2)
        }
        
        const width = Math.abs(x2 - x1)
        const height = Math.abs(y2 - y1)
        
        console.log('Original crop dimensions:', width, 'x', height)
        
        // Ensure coordinates are within image bounds
        x1 = Math.max(0, Math.min(x1, img.naturalWidth))
        y1 = Math.max(0, Math.min(y1, img.naturalHeight))
        
        // Upscale factor - create a higher resolution image for better fullscreen display
        const scaleFactor = 3 // 3x original size for crisp display
        const targetWidth = width * scaleFactor
        const targetHeight = height * scaleFactor
        
        console.log('Upscaled crop dimensions:', targetWidth, 'x', targetHeight)
        
        // Set canvas size to upscaled dimensions
        canvas.width = targetWidth
        canvas.height = targetHeight
        
        // Enable high-quality image smoothing
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        
        // Draw the cropped portion scaled up to fill the larger canvas
        ctx.drawImage(
          img,
          x1, y1,  // Source x, y (original crop area)
          width, height,  // Source width, height (original crop size)
          0, 0,  // Destination x, y
          targetWidth, targetHeight  // Destination width, height (upscaled)
        )
        
        // Convert to base64 with maximum quality (PNG for lossless)
        const croppedBase64 = canvas.toDataURL('image/png')
        console.log('High-res cropped image created (PNG), data URL length:', croppedBase64.length)
        resolve(croppedBase64)
      }
      
      img.onerror = () => reject('Image failed to load')
      img.src = imageBase64
    })
  }
  
  // Function to find rectangle coordinates by color
  const findRectangleByColor = (selectedColor: string): number[] | null => {
    // Find rectangle with matching color from rectanglesData
    const rectangle = rectanglesData.find(rect => rect.color === selectedColor)
    
    if (!rectangle || !rectangle.coordinates) {
      console.warn(`No rectangle found for color: ${selectedColor}`)
      return null
    }
    
    console.log(`Found rectangle for color ${selectedColor}:`, rectangle.coordinates)
    return rectangle.coordinates
  }
  
  // Helper function to get color name from hex code
  const getColorName = (hexColor: string): string => {
    const colorNames: { [key: string]: string } = {
      '#FF0000': 'Red',
      '#FF8800': 'Orange',
      '#FFFF00': 'Yellow',
      '#00FF00': 'Green',
      '#000000': 'Black',
      '#0080FF': 'Blue',
      '#8000FF': 'Purple',
      '#FF1493': 'Pink',
      '#8B4513': 'Brown',
      '#808000': 'Olive',
      '#008080': 'Teal',
      '#FFFFFF': 'White',
    }
    return colorNames[hexColor.toUpperCase()] || hexColor
  }
  
  // Check if all items have colors mapped
  const isAllColorsMapped = useMemo(() => {
    if (!isMappingModeActive) return isAllItemsCaptured
    
    const totalItems = displayItems.length
    return Object.keys(selectedColors).length === totalItems && 
           Object.values(selectedColors).every(color => color && color.trim() !== '')
  }, [isMappingModeActive, isAllItemsCaptured, selectedColors, displayItems])
  
  // Helper function to convert coordinates from [x1, y1, x2, y2] to [x, y, width, height]
  const convertCoordinates = (coords: [number, number, number, number]): [number, number, number, number] => {
    const [x1, y1, x2, y2] = coords
    const x = Math.min(x1, x2)
    const y = Math.min(y1, y2)
    const width = Math.abs(x2 - x1)
    const height = Math.abs(y2 - y1)
    return [x, y, width, height]
  }

  // Handle Next button click
  const handleNextClick = async () => {
    if (isMappingModeActive && isAllColorsMapped) {
      // Map each dish_id to its rectangle coordinates
      const dishResults = displayItems.map((item, index) => {
        const selectedColor = selectedColors[index]
        
        // Find rectangle with matching color from rectanglesData
        const rectangle = rectanglesData.find(rect => rect.color === selectedColor)
        
        if (rectangle && rectangle.coordinates && rectangle.coordinates.length === 4) {
          // Convert from [x1, y1, x2, y2] to [x, y, width, height]
          const [x, y, width, height] = convertCoordinates(rectangle.coordinates)
          return {
            dish_id: item.id,
            dish_bbox: [x, y, width, height]
          }
        } else {
          // No rectangle found - dish not detected
          return {
            dish_id: item.id,
            dish_bbox: []
          }
        }
      })
      
      // Prepare API request data
      const mappingData = {
        flight_details: {
          flight_number: flightNumber
        },
        menu_details: {
          menu_code: menu
        },
        food_level: currentPercentage,
        dish_results: dishResults
      }
      
      // Prepare full request JSON
      const requestJson = {
        type: 'user_dish_mapping',
        data: mappingData
      }
      
      // Show JSON in console
      console.log('📤 JSON to be sent:', JSON.stringify(requestJson, null, 2))
      
      // Show loader
      setIsSubmittingMapping(true)
      
      try {
        // Send API request
        await backendApi.sendUserDishMapping(mappingData)
        
        // Hide loader first, then show SweetAlert
        setIsSubmittingMapping(false)
        
        // Wait a bit for the loader to fade out
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Success - show SweetAlert with response
        const mappedCount = dishResults.filter(d => d.dish_bbox.length > 0).length
        const totalCount = dishResults.length
        
        // If this is the final step (Done), show acknowledgement modal instead of regular success
        if (isFinalStep) {
          setShowAcknowledgement(true)
        } else {
          // Regular success alert for non-final steps
          await Swal.fire({
            title: 'Success!',
            html: `
              <div style="color: #D1D1D1; text-align: left;">
                <p style="margin-bottom: 12px;">✅ Dish mapping saved successfully for ${currentPercentage}%!</p>
                <p style="margin: 0;">Dishes mapped: <strong style="color: #10B981;">${mappedCount}/${totalCount}</strong></p>
              </div>
            `,
            icon: 'success',
            confirmButtonText: 'OK',
            confirmButtonColor: '#10B981',
            background: '#242835',
            color: '#D1D1D1',
            allowOutsideClick: false,
            allowEscapeKey: false,
            customClass: {
              popup: 'sweet-alert-custom',
              title: 'sweet-alert-title',
              htmlContainer: 'sweet-alert-html',
              confirmButton: 'sweet-alert-confirm'
            },
            didOpen: () => {
              // Ensure SweetAlert is on top
              const popup = document.querySelector('.swal2-popup') as HTMLElement
              if (popup) {
                popup.style.zIndex = '99999'
              }
            }
          })
          
          // Resume stream if not at final step
          if (onResume) {
            console.log('Calling onResume from CapturedResults')
            onResume()
          }
        }
      } catch (error) {
        // Hide loader first, then show SweetAlert
        setIsSubmittingMapping(false)
        
        // Wait a bit for the loader to fade out
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Error - show SweetAlert with error message
        const errorMessage = error instanceof Error ? error.message : 'Failed to save dish mapping'
        console.error('Error sending dish mapping:', error)
        
        await Swal.fire({
          title: 'Error!',
          html: `
            <div style="color: #D1D1D1; text-align: left;">
              <p style="margin: 0;">❌ ${errorMessage}</p>
            </div>
          `,
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#EF4444',
          background: '#242835',
          color: '#D1D1D1',
          allowOutsideClick: false,
          allowEscapeKey: false,
          customClass: {
            popup: 'sweet-alert-custom',
            title: 'sweet-alert-title',
            htmlContainer: 'sweet-alert-html',
            confirmButton: 'sweet-alert-confirm'
          },
          didOpen: () => {
            // Ensure SweetAlert is on top
            const popup = document.querySelector('.swal2-popup') as HTMLElement
            if (popup) {
              popup.style.zIndex = '99999'
            }
          }
        })
        
        return // Don't proceed to next if error
      }
    }
    
    // Move to next percentage (only if not final step - final step handled by acknowledgement modal)
    if (!isFinalStep) {
      onNext()
    }
  }
  
  // Handle acknowledgement confirmation
  const handleAcknowledgementConfirm = () => {
    if (acknowledgementChecked) {
      setShowAcknowledgement(false)
      setAcknowledgementChecked(false)
      // Navigate back to form
      onNext()
    }
  }
  
  // Extract missing_dishes from modelResults
  const missingDishes = useMemo(() => {
    if (!modelResults) return 0
    
    // Based on actual JSON structure: data.model_results.missing_dishes
    if (modelResults.data?.model_results?.missing_dishes !== undefined) {
      return modelResults.data.model_results.missing_dishes
    }
    if (modelResults.model_results?.missing_dishes !== undefined) {
      return modelResults.model_results.missing_dishes
    }
    if (modelResults.missing_dishes !== undefined) {
      return modelResults.missing_dishes
    }
    
    return 0
  }, [modelResults])
  
  // Calculate remaining rectangles that can be drawn
  const remainingRectangles = useMemo(() => {
    return Math.max(0, missingDishes - manualRectanglesCount)
  }, [missingDishes, manualRectanglesCount])
  
  // Always show "New Rectangle" counter when model results are available
  const shouldShowNewRectangle = useMemo(() => {
    console.log('Model Results Data:', modelResults)
    // Always show when we have model results, even if count is 0
    return !!modelResults
  }, [modelResults])
  
  // Generate display items by combining menu items with captured images
  // Merge displayItems with captured images
  const renderedItems = useMemo(() => {
    return displayItems.map((item, index) => {
      const capturedItem = capturedImages[index]
      return {
        ...item,
        capt_image: capturedItem?.capt_image || '',
        hasImage: !!capturedItem?.capt_image
      }
    })
  }, [displayItems, capturedImages])

  return (
    <div className="bg-[#20222B] rounded-lg p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-[#D1D1D1]">Captured Results</h3>
        <span className="text-[#D1D1D1] text-sm font-medium">
          New Rectangle: {missingDishes}
        </span>
      </div>

      {/* Main Content: Results List */}
      <div className="flex-1 space-y-4 mb-6 overflow-y-auto overflow-x-visible">
          {renderedItems.map((item, index) => {
            const totalItems = renderedItems.length
            const isLastItem = index === totalItems - 1
            const isSecondLastItem = index === totalItems - 2
            // Only open upward if there are more than 3 items AND it's one of the last 2
            const shouldOpenUpward = totalItems > 3 && (isLastItem || isSecondLastItem)
            
            return (
            <div 
              key={item.id} 
              className="bg-[#2B2D36] rounded-2xl p-4 flex items-center gap-4"
              style={{ borderRadius: '16px' }}
            >
              {/* Left: Large Image Placeholder */}
              <div className="w-24 h-24 rounded-xl flex-shrink-0 overflow-hidden bg-[#2B2D36]">
                {item.capt_image && item.capt_image.trim() !== '' ? (
                  <img 
                    src={item.capt_image} 
                    alt={item.title}
                    className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setModalImage(item.capt_image)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#2B2D36]">
                    <svg className="w-8 h-8 text-[#8E8E8E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              
              {/* Middle: Title and Description */}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-lg mb-2 text-[#D1D1D1]">
                  {item.title}
                </h4>
                <p className="text-sm text-[#8E8E8E] leading-relaxed">
                  {item.description || 'Dish Contains Chicken, Pasta, Corn Carrots, Brocolie, Tomatos.'}
                </p>
              </div>
              
              {/* Right: Action Button or Color Dropdown */}
              <div className="flex items-center flex-shrink-0 gap-3">
                {isMappingModeActive ? (
                  // Show custom color dropdown with visual swatches
                  <div className="relative">
                    {/* Dropdown Button */}
                    <button
                      onClick={() => setOpenDropdownIndex(openDropdownIndex === index ? null : index)}
                      className="appearance-none bg-[#3A3C44] text-[#D1D1D1] font-medium py-3 px-4 pr-10 rounded-xl transition-colors duration-200 cursor-pointer hover:bg-[#444650] min-w-[180px] flex items-center gap-2"
                      style={{ 
                        borderRadius: '12px',
                        border: '1px solid #4A4C54'
                      }}
                    >
                      {selectedColors[index] ? (
                        <>
                          <div
                            className="w-5 h-5 rounded border-2 border-white flex-shrink-0"
                            style={{ backgroundColor: selectedColors[index] }}
                          />
                          <span>{getColorName(selectedColors[index])}</span>
                        </>
                      ) : (
                        <span>Select Color</span>
                      )}
                      
                      {/* Dropdown Arrow */}
                      <svg 
                        className="w-5 h-5 text-[#D1D1D1] ml-auto" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Dropdown Menu */}
                    {openDropdownIndex === index && (
                      <div 
                        className={`absolute left-0 w-full bg-[#2B2D36] rounded-xl shadow-lg overflow-hidden ${
                          shouldOpenUpward ? 'bottom-full mb-1' : 'top-full mt-1'
                        }`}
                        style={{ 
                          borderRadius: '12px',
                          border: '1px solid #4A4C54',
                          zIndex: 9999
                        }}
                      >
                        {usedColors.map((color, colorIndex) => (
                          <button
                            key={colorIndex}
                            onClick={async () => {
                              // Update selected color
                              setSelectedColors(prev => ({ ...prev, [index]: color }))
                              setOpenDropdownIndex(null)
                              
                              // Crop and update image
                              if (fullCapturedImage && onUpdateCapturedImage) {
                                console.log(`Processing color selection for item ${index}, color: ${getColorName(color)}`)
                                const coordinates = findRectangleByColor(color)
                                if (coordinates) {
                                  try {
                                    console.log(`Cropping image with coordinates:`, coordinates)
                                    const croppedImage = await cropImageFromRectangle(fullCapturedImage, coordinates)
                                    console.log(`Cropped image length: ${croppedImage.length}`)
                                    onUpdateCapturedImage(index, croppedImage)
                                    console.log(`✅ Successfully updated image for item ${index} with color ${getColorName(color)}`)
                                  } catch (error) {
                                    console.error('❌ Failed to crop image:', error)
                                  }
                                } else {
                                  console.warn('⚠️ No coordinates found for selected color:', color)
                                }
                              } else {
                                console.warn('⚠️ Missing fullCapturedImage or onUpdateCapturedImage callback')
                              }
                            }}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#3A3C44] transition-colors cursor-pointer text-left"
                          >
                            <div
                              className="w-5 h-5 rounded border-2 border-white flex-shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-[#D1D1D1] font-medium">{getColorName(color)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
            )
          })}
      </div>

      {/* Footer */}
      <div className="border-t border-[#2B2D36] pt-4 pb-2">
        <div className="flex items-center space-x-4">
          <span className="text-[#D1D1D1] font-medium">Food Level</span>
          <div className="bg-[#2B2D36] text-[#D1D1D1] px-4 py-2 rounded-xl flex-1">
            {currentPercentage}% {foodLevels.length > 0 && (() => {
              const currentIndex = foodLevels.findIndex(level => Math.abs(level - currentPercentage) < 0.01)
              return currentIndex >= 0 ? `(${currentIndex + 1}/${foodLevels.length})` : `(1/${foodLevels.length})`
            })()}
          </div>
          <div className="flex space-x-4">
            <button
              onClick={onBack}
              className="bg-[#3A3C44] hover:bg-[#444650] text-[#D1D1D1] font-semibold py-2 px-8 rounded-xl transition-colors duration-200 cursor-pointer flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
            
            <button
              onClick={handleNextClick}
              disabled={!isAllColorsMapped || isSubmittingMapping}
              className={`font-semibold py-2 px-18 rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2 ${
                isAllColorsMapped && !isSubmittingMapping
                  ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer' 
                  : 'bg-[#3A3C44] text-[#8E8E8E] cursor-not-allowed'
              }`}
            >
              {isSubmittingMapping ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <span>{displayButtonText}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Loading Overlay - shows when submitting mapping */}
      {isSubmittingMapping && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        >
          <div className="flex flex-col items-center space-y-4">
            {/* Spinner */}
            <svg className="animate-spin h-16 w-16 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {/* Loading text */}
            <p className="text-white text-xl font-medium">Saving results...</p>
            <p className="text-white/80 text-sm">Please wait for confirmation</p>
          </div>
        </div>
      )}

      {/* Fullscreen Image Modal */}
      {modalImage && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
          onClick={() => setModalImage(null)}
        >
          {/* Close Button */}
          <button
            onClick={() => setModalImage(null)}
            className="absolute top-6 right-6 bg-white hover:bg-gray-200 text-gray-800 rounded-full p-2 transition-colors duration-200 shadow-lg z-[10001]"
            style={{ width: '40px', height: '40px' }}
          >
            <svg 
              className="w-6 h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>

          {/* Centered Image - High Quality Display */}
          <img 
            src={modalImage} 
            alt="Fullscreen view"
            className="max-w-[95vw] max-h-[95vh] shadow-2xl"
            style={{ 
              objectFit: 'contain',
              imageRendering: 'auto',
              WebkitFontSmoothing: 'antialiased'
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Acknowledgement Modal */}
      {showAcknowledgement && (
        <div 
          className="fixed inset-0 z-[10001] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
        >
          <div 
            className="bg-[#242835] rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col space-y-6">
              {/* Title */}
              <h2 className="text-2xl font-bold text-white text-center">
                Acknowledgement
              </h2>
              
              {/* Message */}
              <div className="text-[#D1D1D1] text-center space-y-2">
                <p className="text-sm text-[#8E8E8E]">
                  The data collection process has been finished
                </p>
              </div>
              
              {/* Checkbox */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="acknowledgement-checkbox"
                  checked={acknowledgementChecked}
                  onChange={(e) => setAcknowledgementChecked(e.target.checked)}
                  className="mt-1 w-5 h-5 text-green-600 bg-[#2B2D36] border-[#3A3C44] rounded focus:ring-green-500 focus:ring-2 cursor-pointer"
                />
                <label 
                  htmlFor="acknowledgement-checkbox" 
                  className="text-[#D1D1D1] text-sm cursor-pointer flex-1"
                >
                  Based on my review, the data mapping appears correct and everything is aligned as expected
                </label>
              </div>
              
              {/* Confirm Button */}
              <button
                onClick={handleAcknowledgementConfirm}
                disabled={!acknowledgementChecked}
                className={`w-full py-3 px-6 rounded-xl font-semibold transition-colors duration-200 ${
                  acknowledgementChecked
                    ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                    : 'bg-[#3A3C44] text-[#8E8E8E] cursor-not-allowed'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CapturedResults
