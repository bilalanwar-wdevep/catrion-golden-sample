import { useState } from 'react'

interface FormData {
  airline: string
  flightNumber: string
  flightClass: string
  menu: string
}

interface SystemDetailsConfirmationProps {
  formData: FormData
  onBack: () => void
  onProceed: () => void
}

const SystemDetailsConfirmation = ({ formData, onBack, onProceed }: SystemDetailsConfirmationProps) => {
  const [isConfirmed, setIsConfirmed] = useState(false)

  const handleProceed = () => {
    if (isConfirmed) {
      onProceed()
    }
  }

  return (
    <div className="bg-[#171C2A] rounded-lg shadow-xl p-8 w-full max-w-2xl">
      <h4 className="text-xl font-bold text-white mb-6">System Details</h4>
      
      <div className="space-y-6  bg-[#242835] py-4 px-4 rounded-lg">
        {/* Data Display - Two Column Layout */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Airline</label>
              <div className="bg-[#242835] rounded-lg px-4 py-3 text-white">
                {formData.airline || 'Not specified'}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Flight Class</label>
              <div className="bg-[#242835] rounded-lg px-4 py-3 text-white">
                {formData.flightClass || 'Not specified'}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Flight Number</label>
              <div className="bg-[#242835] rounded-lg px-4 py-3 text-white">
                {formData.flightNumber || 'Not specified'}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Menu Code</label>
              <div className="bg-[#242835] rounded-lg px-4 py-3 text-white">
                {formData.menu || 'Not specified'}
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Checkbox */}
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="confirmation"
            checked={isConfirmed}
            onChange={(e) => setIsConfirmed(e.target.checked)}
            className="mt-1 w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
          />
          <label htmlFor="confirmation" className="text-sm text-gray-300 leading-relaxed">
            I confirm that the entered data is correct and agree to proceed with the process.
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 pt-4">
          <button
            onClick={onBack}
            className="w-34 bg-[#171C2A] hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 cursor-pointer"
          >
            Back
          </button>
          
          <button
            onClick={handleProceed}
            disabled={!isConfirmed}
            className={`flex-1 font-semibold py-3 px-6 rounded-lg transition-colors duration-200 ${
              isConfirmed
                ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                : 'bg-gray-500 text-gray-300 cursor-not-allowed'
            }`}
          >
            Proceed
          </button>
        </div>
      </div>
    </div>
  )
}

export default SystemDetailsConfirmation
