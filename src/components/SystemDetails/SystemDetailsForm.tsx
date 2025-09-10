import { useState } from 'react'
import SearchableDropdown from './SearchableDropdown'
import SystemDetailsConfirmation from './SystemDetailsConfirmation'

interface FormData {
  airline: string
  flightNumber: string
  flightClass: string
  menu: string
}

interface SystemDetailsFormProps {
  onProceedToCamera: (formData: FormData) => void
}

const SystemDetailsForm = ({ onProceedToCamera }: SystemDetailsFormProps) => {
  const [airline, setAirline] = useState('SAUDI AIRLINES')
  const [flightNumber, setFlightNumber] = useState('KS124')
  const [flightClass, setFlightClass] = useState('First Class')
  const [menu, setMenu] = useState('F41QB400D9')
  const [showConfirmation, setShowConfirmation] = useState(false)

  // Dummy data for dropdowns
  const airlineOptions = [
    { value: 'SAUDI AIRLINES', label: 'SAUDI AIRLINES' },
    { value: 'EMIRATES', label: 'EMIRATES' },
    { value: 'QATAR AIRWAYS', label: 'QATAR AIRWAYS' },
    { value: 'ETIHAD AIRWAYS', label: 'ETIHAD AIRWAYS' },
    { value: 'TURKISH AIRLINES', label: 'TURKISH AIRLINES' },
    { value: 'LUFTHANSA', label: 'LUFTHANSA' },
    { value: 'BRITISH AIRWAYS', label: 'BRITISH AIRWAYS' },
    { value: 'AIR FRANCE', label: 'AIR FRANCE' },
    { value: 'KLM', label: 'KLM' },
    { value: 'SINGAPORE AIRLINES', label: 'SINGAPORE AIRLINES' }
  ]

  const flightNumberOptions = [
    { value: 'KS124', label: 'KS124' },
    { value: 'SV123', label: 'SV123' },
    { value: 'EK456', label: 'EK456' },
    { value: 'QR789', label: 'QR789' },
    { value: 'EY321', label: 'EY321' },
    { value: 'TK654', label: 'TK654' },
    { value: 'LH987', label: 'LH987' },
    { value: 'BA456', label: 'BA456' },
    { value: 'AF123', label: 'AF123' },
    { value: 'KL789', label: 'KL789' }
  ]

  const flightClassOptions = [
    { value: 'Economy', label: 'Economy' },
    { value: 'Business', label: 'Business' },
    { value: 'First Class', label: 'First Class' }
  ]

  const menuOptions = [
    { value: 'F41QB400D9', label: 'F41QB400D9' },
    { value: 'M25XC300B7', label: 'M25XC300B7' },
    { value: 'V18KL200A5', label: 'V18KL200A5' },
    { value: 'H33MN500C2', label: 'H33MN500C2' },
    { value: 'P67RT800E4', label: 'P67RT800E4' },
    { value: 'Q92UV100F6', label: 'Q92UV100F6' },
    { value: 'S15WX400G8', label: 'S15WX400G8' },
    { value: 'T48YZ700H1', label: 'T48YZ700H1' },
    { value: 'U71AB200I3', label: 'U71AB200I3' },
    { value: 'W94CD500J5', label: 'W94CD500J5' }
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowConfirmation(true)
  }

  const handleBack = () => {
    setShowConfirmation(false)
  }

  const handleProceed = () => {
    // Pass form data to parent component
    onProceedToCamera(formData)
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
        <SearchableDropdown
          label="Airline"
          value={airline}
          onChange={setAirline}
          placeholder="Pick Airline Here"
          options={airlineOptions}
        />

        <SearchableDropdown
          label="Flight Number"
          value={flightNumber}
          onChange={setFlightNumber}
          placeholder="Pick Flight No. Here"
          options={flightNumberOptions}
        />

        <SearchableDropdown
          label="Flight Class"
          value={flightClass}
          onChange={setFlightClass}
          placeholder="Pick Flight Class Here"
          options={flightClassOptions}
        />

        <SearchableDropdown
          label="Menu"
          value={menu}
          onChange={setMenu}
          placeholder="Menu Code"
          options={menuOptions}
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
