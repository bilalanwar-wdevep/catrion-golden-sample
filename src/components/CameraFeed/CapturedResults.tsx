interface CapturedItem {
  id: string
  title: string
  description: string
  capt_image: string
}

interface CapturedResultsProps {
  onBack: () => void
  onNext: () => void
  capturedImages: CapturedItem[]
  onRetake: (itemIndex: number) => void
}

const CapturedResults = ({ onBack, onNext, capturedImages, onRetake }: CapturedResultsProps) => {
  // Predefined meal menu items
  const menuItems = [
    {
      id: '1',
      title: 'Grilled Salmon',
      description: 'Fresh Atlantic salmon with herbs and lemon butter sauce'
    },
    {
      id: '2', 
      title: 'Beef Tenderloin',
      description: 'Premium cut with roasted vegetables and red wine reduction'
    },
    {
      id: '3',
      title: 'Chicken Marsala',
      description: 'Tender chicken breast with mushrooms and marsala wine sauce'
    },
    {
      id: '4',
      title: 'Vegetable Risotto',
      description: 'Creamy arborio rice with seasonal vegetables and parmesan'
    },
    {
      id: '5',
      title: 'Chocolate Lava Cake',
      description: 'Warm chocolate cake with molten center and vanilla ice cream'
    }
  ]

  // Create display items by combining menu items with captured images
  const displayItems = menuItems.map((item, index) => ({
    ...item,
    capt_image: capturedImages[index]?.capt_image || '',
    isActive: index === 0, // Only the first item is active
    isCompleted: index < capturedImages.length // Mark completed items
  }))

  console.log('🖼️ CapturedResults - capturedImages:', capturedImages.length)
  console.log('📋 CapturedResults - displayItems:', displayItems.length)
  console.log('🖼️ CapturedResults - displayItems with images:', displayItems.filter(item => item.capt_image).length)
  
  // Debug the first captured image
  if (capturedImages.length > 0) {
    console.log('🔍 First captured image data:', {
      title: capturedImages[0].title,
      hasImage: !!capturedImages[0].capt_image,
      imageLength: capturedImages[0].capt_image?.length,
      imageStart: capturedImages[0].capt_image?.substring(0, 50)
    })
  }

  return (
    <div className="bg-[#242835] rounded-lg p-6 h-full flex flex-col">
      {/* Header */}
      <h3 className="text-xl font-bold text-white mb-6">Captured Results</h3>

      {/* Results List */}
      <div className="flex-1 space-y-4 mb-6 overflow-y-auto">
        {displayItems.map((item, index) => (
          <div 
            key={item.id} 
            className="p-4 flex items-center space-x-4 border-b border-gray-700 transition-all duration-300 bg-[#171C2A] border-gray-600"
          >
            {/* Captured Image */}
            <div className="w-16 h-16 rounded-lg flex-shrink-0 overflow-hidden relative">
              {item.capt_image ? (
                <>
                  <img 
                    src={item.capt_image} 
                    alt={`Captured area ${index + 1}`}
                    className="w-full h-full object-cover"
                    onLoad={(e) => {
                      const img = e.target as HTMLImageElement
                      console.log('✅ Image loaded successfully for item:', item.title)
                      console.log('📏 Image dimensions:', { width: img.naturalWidth, height: img.naturalHeight })
                    }}
                    onError={(e) => console.log('❌ Image failed to load for item:', item.title, e)}
                  />
                </>
              ) : (
                <div className="w-full h-full rounded-lg flex items-center justify-center bg-gray-400">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1">
              <h4 className="font-bold text-lg mb-1 text-white">
                {item.title}
              </h4>
              <p className="text-sm text-gray-300">
                {item.description}
              </p>
            </div>
            
            {/* Action Button */}
            <div className="flex space-x-2">
              <button 
                disabled={!item.capt_image}
                onClick={() => item.capt_image && onRetake(index)}
                className={`font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2 ${
                  item.capt_image 
                    ? 'bg-gray-600 hover:bg-gray-500 text-white cursor-pointer' 
                    : 'bg-[#171C2A] text-gray-400 cursor-not-allowed'
                }`}
              >
                <span>Retake</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-600 pt-4 pb-2">
        {/* Percentage Data and Navigation Buttons - All in One Line */}
        <span className="text-white font-medium ">Percentage Data</span>
        <div className="flex items-center space-x-4">
        
          <div className="bg-[#171C2A] text-white px-4 py-2 rounded-lg flex-1 ">
            100%
          </div>
          <div className="flex space-x-4 ">
            <button
              onClick={onBack}
              className="bg-[#171C2A] hover:bg-gray-700 text-white font-semibold py-2 px-8 rounded-lg transition-colors duration-200 cursor-pointer flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
            
            <button
              onClick={onNext}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-18 rounded-lg transition-colors duration-200 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CapturedResults
