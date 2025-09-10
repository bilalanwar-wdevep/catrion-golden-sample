interface CameraFeedPanelProps {
  flightData: {
    airline: string
    flightNumber: string
    flightClass: string
    menu: string
  }
}

const CameraFeedPanel = ({ flightData }: CameraFeedPanelProps) => {
  return (
    <div className=" bg-[#242835] rounded-lg p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <h3 className="text-xl font-bold text-white">Camera Feed</h3>
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
          <button className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 cursor-pointer">
            Capture Stream
          </button>
          <button className="bg-[#1E2330] hover:border-gray-100 text-white-500 font-semibold py-2 px-4 rounded-lg transition-colors duration-200 cursor-pointer flex items-center space-x-2">
            <span>Select</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Video Feed Area - Centered and Full Height */}
      <div className="flex-1 flex items-center justify-center bg-[#242835] rounded-lg min-h-0">
        <div className="text-center">
          {/* Loading Spinner */}
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Waiting for Video Feed</p>
        </div>
      </div>
    </div>
  )
}

export default CameraFeedPanel
