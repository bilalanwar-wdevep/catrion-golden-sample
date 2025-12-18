import React from 'react'

interface CoordinateData {
  x: number
  y: number
  width: number
  height: number
  imageData: string
}

interface ReviewItem {
  itemName: string
  coordinates: {
    "100%": CoordinateData | null
    "75%": CoordinateData | null
    "50%": CoordinateData | null
    "25%": CoordinateData | null
  }
}

interface ReviewItemsProps {
  items: ReviewItem[]
}

const ReviewItems: React.FC<ReviewItemsProps> = ({ items }) => {
  return (
    <div className="h-screen w-full bg-gray-900 text-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-white">Review Captured Items</h1>
        <p className="text-gray-400 mt-1">All captured items with their images and coordinates</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {items.map((item, itemIndex) => (
            <div key={item.itemName} className="bg-gray-800 rounded-lg p-6">
              {/* Item Header */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">{item.itemName}</h2>
                <p className="text-gray-400 text-sm mt-1">Item #{itemIndex + 1}</p>
              </div>

              {/* Images Grid - 4 columns for percentages */}
              <div className="grid grid-cols-4 gap-6">
                {[100, 75, 50, 25].map((percentage) => {
                  const data = item.coordinates[percentage as keyof typeof item.coordinates]
                  const hasData = data !== null
                  
                  return (
                    <div key={percentage} className="text-center">
                      {/* Percentage Header */}
                      <div className="mb-4">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <div className={`w-3 h-3 rounded-full ${hasData ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                          <span className="text-white font-semibold text-lg">{percentage}%</span>
                        </div>
                        {hasData && (
                          <div className="text-xs text-gray-400">
                            <div>Position: ({data.x}, {data.y})</div>
                            <div>Size: {data.width} × {data.height}</div>
                          </div>
                        )}
                      </div>

                      {/* Image Container */}
                      <div className="relative">
                        {hasData ? (
                          <div className="relative inline-block">
                            <img
                              src={data.imageData}
                              alt={`${item.itemName} at ${percentage}%`}
                              className="w-full h-48 object-cover rounded-lg border border-gray-600 shadow-lg"
                            />
                            
                            {/* Draw Rectangle using Coordinates */}
                            <div
                              className="absolute border-2 border-red-500 bg-red-500 bg-opacity-20"
                              style={{
                                left: `${data.x}px`,
                                top: `${data.y}px`,
                                width: `${data.width}px`,
                                height: `${data.height}px`,
                                pointerEvents: 'none'
                              }}
                            ></div>
                            
                            {/* Rectangle Label */}
                            <div 
                              className="absolute bg-red-500 text-white text-xs px-2 py-1 rounded"
                              style={{
                                left: `${data.x}px`,
                                top: `${Math.max(data.y - 25, 5)}px`,
                                pointerEvents: 'none'
                              }}
                            >
                              Captured Area
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-48 bg-gray-700 rounded-lg border border-gray-600 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-gray-400 text-sm mb-2">No image captured</div>
                              <div className="text-gray-500 text-xs">Missing at {percentage}%</div>
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
    </div>
  )
}

export default ReviewItems
