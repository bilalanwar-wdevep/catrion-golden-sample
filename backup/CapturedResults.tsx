import { useMemo, useState } from 'react'
import { menuItems } from './menuItems'

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

interface CapturedResultsProps {
  onBack: () => void
  onNext: () => void
  capturedImages: CapturedItem[]
  onRetake: (itemIndex: number, selectedColor?: string) => void
  retakeIndex: number | null
  onResetAll: () => void
  onView: (itemIndex: number) => void
  currentPercentage: number
  isAllItemsCaptured: boolean
  buttonText: string
  generatedJson: string | null
  modelResults?: any
  fullCapturedImage?: string | null
  onUpdateCoordinates?: (detectionIndex: number, color: string) => void
  onUpdateCapturedImage?: (itemIndex: number, croppedImage: string) => void
  manualRectanglesCount?: number
  isMappingMode?: boolean
  usedColors?: string[]
}

const CapturedResults = ({ 
  onBack, 
  onNext, 
  capturedImages,
  onRetake,
  onView,
  currentPercentage, 
  isAllItemsCaptured, 
  buttonText,
  modelResults,
  manualRectanglesCount = 0,
  isMappingMode = false,
  usedColors = []
}: CapturedResultsProps) => {
  
  // State to track selected color for each menu item
  const [selectedColors, setSelectedColors] = useState<{ [itemIndex: number]: string }>({})
  
  // State to track which dropdown is open
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null)
  
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
    if (!isMappingMode) return isAllItemsCaptured
    
    const totalItems = menuItems.length
    return Object.keys(selectedColors).length === totalItems && 
           Object.values(selectedColors).every(color => color && color.trim() !== '')
  }, [isMappingMode, isAllItemsCaptured, selectedColors])
  
  // Handle Next button click
  const handleNextClick = () => {
    if (isMappingMode && isAllColorsMapped) {
      // Get detection results with coordinates
      const detectionResults = modelResults?.data?.model_results?.deetction_results || []
      
      console.log('===== COLOR TO ITEM MAPPING =====')
      menuItems.forEach((item, index) => {
        const selectedColor = selectedColors[index]
        
        // Find rectangle with matching color
        const rect = detectionResults.find((det: any, detIndex: number) => {
          const colorPalette = ['#FF0000', '#FF8800', '#FFFF00', '#00FF00', '#000000', '#0080FF', '#8000FF', '#FF1493', '#8B4513', '#808000', '#008080', '#FFFFFF']
          return colorPalette[detIndex % colorPalette.length] === selectedColor
        })
        
        const coords = rect?.coordinates || []
        console.log(`${item.title} → ${getColorName(selectedColor)} → [${coords.join(', ')}]`)
      })
      console.log('=================================')
    }
    
    onNext()
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
  const displayItems = useMemo(() => {
    // Use menuItems or generate sample items if needed
    const items = menuItems.length > 0 ? menuItems : [
      { id: '1', title: 'Sweets', description: 'Dish Contains Chicken, Pasta, Corn Carrots, Brocolie, Tomatos.' },
      { id: '2', title: 'Camarel', description: 'Dish Contains Chicken, Pasta, Corn Carrots, Brocolie, Tomatos.' },
      { id: '3', title: 'Juice', description: 'Dish Contains Chicken, Pasta, Corn Carrots, Brocolie, Tomatos.' },
      { id: '4', title: 'Sweets', description: 'Dish Contains Chicken, Pasta, Corn Carrots, Brocolie, Tomatos.' },
    ]
    
    return items.map((item, index) => {
      const capturedItem = capturedImages[index]
      return {
        ...item,
        capt_image: capturedItem?.capt_image || '',
        hasImage: !!capturedItem?.capt_image
      }
    })
  }, [capturedImages])

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
          {displayItems.map((item, index) => {
            const isLastItem = index === displayItems.length - 1
            const isSecondLastItem = index === displayItems.length - 2
            
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
                    className="w-full h-full object-cover"
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
                {isMappingMode ? (
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
                        className={`absolute left-0 mt-1 w-full bg-[#2B2D36] rounded-xl shadow-lg overflow-hidden ${
                          isLastItem || isSecondLastItem ? 'bottom-full mb-1' : 'top-full'
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
                            onClick={() => {
                              setSelectedColors(prev => ({ ...prev, [index]: color }))
                              setOpenDropdownIndex(null)
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
                ) : (
                  // Show reselect button when not in mapping mode
                  <button
                    onClick={() => onRetake(index)}
                    className="bg-[#3A3C44] hover:bg-[#444650] text-[#D1D1D1] font-medium py-2.5 px-4 rounded-xl transition-colors duration-200 flex items-center gap-2"
                    style={{ borderRadius: '12px' }}
                  >
                    <span>Reslect</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            )
          })}
      </div>

      {/* Footer */}
      <div className="border-t border-[#2B2D36] pt-4 pb-2">
        <div className="flex items-center space-x-4">
          <span className="text-[#D1D1D1] font-medium">Percentage Data</span>
          <div className="bg-[#2B2D36] text-[#D1D1D1] px-4 py-2 rounded-xl flex-1">
            {currentPercentage}%
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
              disabled={!isAllColorsMapped}
              className={`font-semibold py-2 px-18 rounded-xl transition-colors duration-200 ${
                isAllColorsMapped 
                  ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer' 
                  : 'bg-[#3A3C44] text-[#8E8E8E] cursor-not-allowed'
              }`}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CapturedResults
