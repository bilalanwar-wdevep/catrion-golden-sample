import { useState } from 'react'
import FormInput from './FormInput'
import SystemDetailsConfirmation from './SystemDetailsConfirmation'

interface FormData {
  airline: string
  flightNumber: string
  flightClass: string
  menu: string
}

const SystemDetailsForm = () => {
  const [airline, setAirline] = useState('')
  const [flightNumber, setFlightNumber] = useState('')
  const [flightClass, setFlightClass] = useState('')
  const [menu, setMenu] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowConfirmation(true)
  }

  const handleBack = () => {
    setShowConfirmation(false)
  }

  const handleProceed = () => {
    // Handle final submission logic here
    console.log('Final submission:', { airline, flightNumber, flightClass, menu })
    // You can add API call or navigation logic here
  }

  const formData: FormData = {
    airline,
    flightNumber,
    flightClass,
    menu
  }

  if (showConfirmation) {
    return (
      <SystemDetailsConfirmation
        formData={formData}
        onBack={handleBack}
        onProceed={handleProceed}
      />
    )
  }

  return (
    <div className="bg-[#171C2A] rounded-lg shadow-xl p-8 w-full max-w-md">
      <h4 className="text-xl font-bold text-white mb-6">System Details</h4>
      
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-[#242835] py-4 px-4">
        <FormInput
          label="Airline"
          value={airline}
          onChange={setAirline}
          placeholder="Pick Airline Here"
        />

        <FormInput
          label="Flight Number"
          value={flightNumber}
          onChange={setFlightNumber}
          placeholder="Pick Flight No. Here"
        />

        <FormInput
          label="Flight Class"
          value={flightClass}
          onChange={setFlightClass}
          placeholder="Pick Flight Class Here"
        />

        <FormInput
          label="Menu"
          value={menu}
          onChange={setMenu}
          placeholder="Menu Code"
        />

        <button 
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 pb-3 cursor-pointer"
        >
          <span>Next</span>
        </button>
      </form>
    </div>
  )
}

export default SystemDetailsForm
