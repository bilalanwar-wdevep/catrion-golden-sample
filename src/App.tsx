import './App.css'
import { useState, useEffect } from 'react'
import { CameraFeed } from './components/CameraFeed'
import { SystemDetailsForm } from './components/SystemDetails'
import LoginForm from './components/Login'
import Header from './components/Header'
import { tokenStorage, userStorage, type User } from './utils/api'

interface Dish {
  dish_id: string
  name: string
  type: string
}

interface FlightData {
  airline: string
  flightNumber: string
  flightClass: string
  menu: string
  dishes?: Dish[]
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showCameraFeed, setShowCameraFeed] = useState(false)
  const [flightData, setFlightData] = useState<FlightData>({
    airline: '',
    flightNumber: '',
    flightClass: '',
    menu: '',
    dishes: []
  })

  const [user, setUser] = useState<User | null>(null)

  // Check for existing authentication on mount
  useEffect(() => {
    const token = tokenStorage.get()
    const storedUser = userStorage.get()
    
    if (token && storedUser) {
      console.log('✅ Found existing authentication:', storedUser)
      setUser(storedUser)
      setIsLoggedIn(true)
    }
  }, [])

  const handleLoginSuccess = (userData: User) => {
    console.log('✅ User logged in:', userData)
    setUser(userData)
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    tokenStorage.remove()
    userStorage.remove()
    setUser(null)
    setIsLoggedIn(false)
    setShowCameraFeed(false)
    console.log('✅ User logged out')
  }

  const handleProceedToCamera = (formData: FlightData) => {
    console.log('📦 Proceeding to camera with data:', formData)
    setFlightData(formData)
    setShowCameraFeed(true)
  }

  const handleBackToForm = () => {
    setShowCameraFeed(false)
    console.log('Back to form clicked')
  }

  return (
    <div className="h-screen w-screen bg-gray-900 text-white overflow-hidden flex flex-col">
      {!isLoggedIn ? (
        <div className="flex items-center justify-center h-full">
          <LoginForm onLoginSuccess={handleLoginSuccess} />
        </div>
      ) : (
        <>
          <Header onLogout={handleLogout} />
          <div className="flex-1 overflow-hidden">
            {!showCameraFeed ? (
              <div className="flex items-center justify-center h-full">
                <SystemDetailsForm onProceedToCamera={handleProceedToCamera} />
              </div>
            ) : (
              <CameraFeed 
                flightData={flightData}
                onBack={handleBackToForm}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default App