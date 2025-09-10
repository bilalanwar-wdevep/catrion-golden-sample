interface CapturedItem {
  id: string
  title: string
  description: string
}

interface CapturedResultsProps {
  onBack: () => void
  onNext: () => void
}

const CapturedResults = ({ onBack, onNext }: CapturedResultsProps) => {
  // Sample data - replace with actual data from API
  const capturedItems: CapturedItem[] = [
    {
      id: '1',
      title: 'Sweets',
      description: 'Dish Contains Chicken, Pasta, Corn Carrots, Brocolie, Tomatos.'
    },
    {
      id: '2',
      title: 'Camarel',
      description: 'Dish Contains Chicken, Pasta, Corn Carrots, Brocolie, Tomatos.'
    },
    {
      id: '3',
      title: 'Juice',
      description: 'Dish Contains Chicken, Pasta, Corn Carrots, Brocolie, Tomatos.'
    },
    {
      id: '4',
      title: 'Main Course',
      description: 'Dish Contains Chicken, Pasta, Corn Carrots, Brocolie, Tomatos.'
    },
    {
      id: '5',
      title: 'Dessert',
      description: 'Dish Contains Chicken, Pasta, Corn Carrots, Brocolie, Tomatos.'
    }
  ]

  return (
    <div className="bg-[#242835] rounded-lg p-6 h-full flex flex-col">
      {/* Header */}
      <h3 className="text-xl font-bold text-white mb-6">Captured Results</h3>

      {/* Results List */}
      <div className="flex-1 space-y-4 mb-6">
        {capturedItems.map((item) => (
          <div key={item.id} className="bg-[#242835] rounded-lg p-4 flex items-center space-x-4">
            {/* Placeholder Image */}
            <div className="w-16 h-16 bg-gray-400 rounded-lg flex-shrink-0"></div>
            
            {/* Content */}
            <div className="flex-1">
              <h4 className="text-white font-bold text-lg mb-1">{item.title}</h4>
              <p className="text-gray-300 text-sm">{item.description}</p>
            </div>
            
            {/* Action Button */}
            <div className="flex space-x-2">
              <button className="bg-[#171C2A] hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 cursor-pointer flex items-center space-x-2">
                <span>Reselect</span>
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
        
          <div className="bg-[#171C2A] text-white px-4 py-3 rounded-lg flex-1 ">
            75%
          </div>
          <div className="flex space-x-4">
            <button
              onClick={onBack}
              className="bg-[#171C2A] hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 cursor-pointer flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
            
            <button
              onClick={onNext}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 cursor-pointer"
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
