import CameraFeedPanel from './CameraFeedPanel'
import CapturedResults from './CapturedResults'

interface FlightData {
  airline: string
  flightNumber: string
  flightClass: string
  menu: string
}

interface CameraFeedProps {
  flightData: FlightData
  onBack: () => void
  onNext: () => void
}

const CameraFeed = ({ flightData, onBack, onNext }: CameraFeedProps) => {
  return (
    <div className="h-screen w-full bg-gray-900 text-white overflow-hidden flex flex-col">
      {/* Main Content - Two Panel Layout */}
      <div className="flex-1 flex gap-6 p-6 pb-8 overflow-hidden">
        {/* Left Panel - Camera Feed */}
        <div className="flex-1 ">
          <CameraFeedPanel flightData={flightData} />
        </div>
        
        {/* Right Panel - Captured Results */}
        <div className="flex-1">
          <CapturedResults onBack={onBack} onNext={onNext} />
        </div>
      </div>
    </div>
  )
}

export default CameraFeed
