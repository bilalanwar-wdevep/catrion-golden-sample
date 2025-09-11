import { useState } from 'react'
import './App.css'
import Header from './components/Header'
import { SystemDetailsForm } from './components/SystemDetails'
import { CameraFeed } from './components/CameraFeed'

interface FlightData {
  airline: string
  flightNumber: string
  flightClass: string
  menu: string
}

function App() {
  // Dummy flight data for testing camera feed
  const flightData: FlightData = {
    airline: 'SAUDI AIRLINES',
    flightNumber: 'KS124',
    flightClass: 'First Class',
    menu: 'F41QB400D9'
  }

  const handleBackToForm = () => {
    // For now, just log - you can implement navigation back to form later
    console.log('Back to form')
  }

  const handleNextFromCamera = () => {
    // Handle next step from camera feed
    console.log('Proceeding from camera feed')
  }

  return (
    <div className="h-screen w-screen bg-gray-900 text-white overflow-hidden flex flex-col">
      <Header />
      <CameraFeed 
        flightData={flightData}
        onBack={handleBackToForm}
        onNext={handleNextFromCamera}
      />
    </div>
  )
}

export default App