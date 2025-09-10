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
  const [currentView, setCurrentView] = useState<'form' | 'camera'>('form')
  const [flightData, setFlightData] = useState<FlightData | null>(null)

  const handleProceedToCamera = (formData: FlightData) => {
    setFlightData(formData)
    setCurrentView('camera')
  }

  const handleBackToForm = () => {
    setCurrentView('form')
  }

  const handleNextFromCamera = () => {
    // Handle next step from camera feed
    console.log('Proceeding from camera feed')
  }

  if (currentView === 'camera' && flightData) {
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

  return (
    <div className="h-screen w-screen bg-gray-900 text-white overflow-hidden flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center p-6 overflow-hidden">
        <SystemDetailsForm onProceedToCamera={handleProceedToCamera} />
      </main>
    </div>
  )
}

export default App