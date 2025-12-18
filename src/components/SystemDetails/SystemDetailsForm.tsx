import { useState, useEffect, useMemo } from 'react'
import SearchableDropdown from './SearchableDropdown'
import SystemDetailsConfirmation from './SystemDetailsConfirmation'
import { BASE_URL } from '../../utils/api'

interface Dish {
  dish_id: string
  name: string
  type: string
}

interface FormData {
  airline: string
  flightNumber: string
  flightClass: string
  menu: string
  dishes?: Dish[]
}

interface SystemDetailsFormProps {
  onProceedToCamera: (formData: FormData) => void
}

interface Airline {
  airline_id: number
  name: string
}

interface Flight {
  flight_no: string
  dep_time: string
  arr_time: string
}

const SystemDetailsForm = ({ onProceedToCamera }: SystemDetailsFormProps) => {
  // Form values
  const [airline, setAirline] = useState('')
  const [airlineId, setAirlineId] = useState<number | null>(null)
  const [flightNumber, setFlightNumber] = useState('')
  const [depTime, setDepTime] = useState('')
  const [flightClass, setFlightClass] = useState('')
  const [menu, setMenu] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)

  // API data
  const [airlines, setAirlines] = useState<Airline[]>([])
  const [flights, setFlights] = useState<Flight[]>([])
  const [classes, setClasses] = useState<string[]>([])
  const [menus, setMenus] = useState<string[]>([])

  // Loading states
  const [loadingAirlines, setLoadingAirlines] = useState(false)
  const [loadingFlights, setLoadingFlights] = useState(false)
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [loadingMenus, setLoadingMenus] = useState(false)

  // Error states
  const [errorAirlines, setErrorAirlines] = useState<string | null>(null)
  const [errorFlights, setErrorFlights] = useState<string | null>(null)
  const [errorClasses, setErrorClasses] = useState<string | null>(null)
  const [errorMenus, setErrorMenus] = useState<string | null>(null)

  // Helper function to fetch with retry logic
  const fetchWithRetry = async (
    url: string,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<Response> => {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Create AbortController for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
        
        const response = await fetch(url, {
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        return response
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        // Don't retry on the last attempt
        if (attempt < maxRetries - 1) {
          // Exponential backoff: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
        }
      }
    }
    
    throw lastError || new Error('Failed to fetch after retries')
  }

  // Fetch airlines on mount
  useEffect(() => {
    const fetchAirlines = async () => {
      setLoadingAirlines(true)
      setErrorAirlines(null)
      try {
        const response = await fetchWithRetry(`${BASE_URL}/airlines`)
        const data = await response.json()
        setAirlines(data)
        setErrorAirlines(null)
        console.log('✅ Airlines fetched:', data)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch airlines'
        console.error('❌ Error fetching airlines:', error)
        setErrorAirlines(errorMessage)
        setAirlines([])
      } finally {
        setLoadingAirlines(false)
      }
    }
    fetchAirlines()
  }, [])

  // Fetch flights when airline changes
  useEffect(() => {
    if (!airlineId) {
      setFlights([])
      setFlightNumber('')
      setDepTime('')
      setFlightClass('')
      setMenu('')
      setClasses([])
      setMenus([])
      return
    }

    // Clear dependent fields immediately
    setFlightNumber('')
    setDepTime('')
    setFlightClass('')
    setMenu('')
    setClasses([])
    setMenus([])

    const fetchFlights = async () => {
      setLoadingFlights(true)
      setErrorFlights(null)
      try {
        const response = await fetchWithRetry(`${BASE_URL}/airlines/${airlineId}/flights`)
        const data = await response.json()
        setFlights(data)
        setErrorFlights(null)
        console.log('✅ Flights fetched:', data)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch flights'
        console.error('❌ Error fetching flights:', error)
        setErrorFlights(errorMessage)
        setFlights([])
      } finally {
        setLoadingFlights(false)
      }
    }
    fetchFlights()
  }, [airlineId])

  // Fetch classes when flight changes
  useEffect(() => {
    if (!flightNumber || !airlineId || !depTime) {
      setClasses([])
      setFlightClass('')
      setMenu('')
      setMenus([])
      return
    }

    // Clear dependent fields immediately
    setFlightClass('')
    setMenu('')
    setMenus([])

    const fetchClasses = async () => {
      setLoadingClasses(true)
      setErrorClasses(null)
      try {
        const response = await fetchWithRetry(
          `${BASE_URL}/flights/${flightNumber}/classes?airline_id=${airlineId}&dep_time=${encodeURIComponent(depTime)}`
        )
        const data = await response.json()
        setClasses(data)
        setErrorClasses(null)
        console.log('✅ Classes fetched:', data)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch classes'
        console.error('❌ Error fetching classes:', error)
        setErrorClasses(errorMessage)
        setClasses([])
      } finally {
        setLoadingClasses(false)
      }
    }
    fetchClasses()
  }, [flightNumber, airlineId, depTime])

  // Fetch menus when class changes
  useEffect(() => {
    if (!flightNumber || !airlineId || !depTime || !flightClass) {
      setMenus([])
      setMenu('')
      return
    }

    // Clear menu immediately
    setMenu('')

    const fetchMenus = async () => {
      setLoadingMenus(true)
      setErrorMenus(null)
      try {
        const response = await fetchWithRetry(
          `${BASE_URL}/flights/${flightNumber}/menus?airline_id=${airlineId}&dep_time=${encodeURIComponent(depTime)}&class_name=${encodeURIComponent(flightClass)}`
        )
        const data = await response.json()
        setMenus(data)
        setErrorMenus(null)
        console.log('✅ Menus fetched:', data)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch menus'
        console.error('❌ Error fetching menus:', error)
        setErrorMenus(errorMessage)
        setMenus([])
      } finally {
        setLoadingMenus(false)
      }
    }
    fetchMenus()
  }, [flightNumber, airlineId, depTime, flightClass])

  // Convert API data to dropdown options (memoized to prevent re-creation)
  const airlineOptions = useMemo(() => 
    airlines.map(a => ({ value: a.name, label: a.name })), 
    [airlines]
  )
  
  const flightNumberOptions = useMemo(() => 
    flights.map(f => ({ 
      value: f.flight_no, 
      label: f.flight_no
    })), 
    [flights]
  )
  
  const flightClassOptions = useMemo(() => 
    classes.map(c => ({ value: c, label: c })), 
    [classes]
  )
  
  const menuOptions = useMemo(() => 
    menus.map(m => ({ value: m, label: m })), 
    [menus]
  )

  // Retry functions
  const retryFetchAirlines = async () => {
    setLoadingAirlines(true)
    setErrorAirlines(null)
    try {
      const response = await fetchWithRetry(`${BASE_URL}/airlines`)
      const data = await response.json()
      setAirlines(data)
      setErrorAirlines(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch airlines'
      setErrorAirlines(errorMessage)
    } finally {
      setLoadingAirlines(false)
    }
  }

  const retryFetchFlights = async () => {
    if (!airlineId) return
    setLoadingFlights(true)
    setErrorFlights(null)
    try {
      const response = await fetchWithRetry(`${BASE_URL}/airlines/${airlineId}/flights`)
      const data = await response.json()
      setFlights(data)
      setErrorFlights(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch flights'
      setErrorFlights(errorMessage)
    } finally {
      setLoadingFlights(false)
    }
  }

  const retryFetchClasses = async () => {
    if (!flightNumber || !airlineId || !depTime) return
    setLoadingClasses(true)
    setErrorClasses(null)
    try {
      const response = await fetchWithRetry(
        `${BASE_URL}/flights/${flightNumber}/classes?airline_id=${airlineId}&dep_time=${encodeURIComponent(depTime)}`
      )
      const data = await response.json()
      setClasses(data)
      setErrorClasses(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch classes'
      setErrorClasses(errorMessage)
    } finally {
      setLoadingClasses(false)
    }
  }

  const retryFetchMenus = async () => {
    if (!flightNumber || !airlineId || !depTime || !flightClass) return
    setLoadingMenus(true)
    setErrorMenus(null)
    try {
      const response = await fetchWithRetry(
        `${BASE_URL}/flights/${flightNumber}/menus?airline_id=${airlineId}&dep_time=${encodeURIComponent(depTime)}&class_name=${encodeURIComponent(flightClass)}`
      )
      const data = await response.json()
      setMenus(data)
      setErrorMenus(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch menus'
      setErrorMenus(errorMessage)
    } finally {
      setLoadingMenus(false)
    }
  }

  // Handle airline selection
  const handleAirlineChange = (value: string) => {
    setAirline(value)
    const selectedAirline = airlines.find(a => a.name === value)
    setAirlineId(selectedAirline?.airline_id || null)
  }

  // Handle flight selection
  const handleFlightChange = (value: string) => {
    setFlightNumber(value)
    const selectedFlight = flights.find(f => f.flight_no === value)
    setDepTime(selectedFlight?.dep_time || '')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowConfirmation(true)
  }

  const handleBack = () => {
    setShowConfirmation(false)
  }

  const handleProceed = async () => {
    // Fetch dishes for the selected menu
    try {
      console.log('🔄 Fetching dishes for menu:', menu)
      const response = await fetchWithRetry(`${BASE_URL}/menus/${menu}/dishes`)
      const dishes: Dish[] = await response.json()
      console.log('✅ Dishes fetched:', dishes)
      
      // Pass form data with dishes to parent component
      onProceedToCamera({
        ...formData,
        dishes
      })
    } catch (error) {
      console.error('❌ Error fetching dishes:', error)
      // Proceed without dishes (user can still continue)
      onProceedToCamera(formData)
    }
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
      
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-[#242835] py-4 px-4" style={{ willChange: 'contents' }}>
        <div>
          <SearchableDropdown
            label="Airline"
            value={airline}
            onChange={handleAirlineChange}
            placeholder={loadingAirlines ? "Loading airlines..." : "Pick Airline Here"}
            options={airlineOptions}
          />
          {errorAirlines && (
            <div className="mt-2 flex items-center justify-between bg-red-900/20 border border-red-500/50 rounded-lg p-2">
              <div className="flex items-center space-x-2 flex-1">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-400 text-sm">Connection error. Please retry.</span>
              </div>
              <button
                type="button"
                onClick={retryFetchAirlines}
                disabled={loadingAirlines}
                className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingAirlines ? 'Retrying...' : 'Retry'}
              </button>
            </div>
          )}
        </div>

        <div>
          <SearchableDropdown
            label="Flight Number"
            value={flightNumber}
            onChange={handleFlightChange}
            placeholder={
              !airline 
                ? "Select airline first" 
                : loadingFlights 
                  ? "Loading flights..." 
                  : "Pick Flight No. Here"
            }
            options={flightNumberOptions}
            disabled={!airline}
          />
          {errorFlights && airline && (
            <div className="mt-2 flex items-center justify-between bg-red-900/20 border border-red-500/50 rounded-lg p-2">
              <div className="flex items-center space-x-2 flex-1">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-400 text-sm">Connection error. Please retry.</span>
              </div>
              <button
                type="button"
                onClick={retryFetchFlights}
                disabled={loadingFlights}
                className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingFlights ? 'Retrying...' : 'Retry'}
              </button>
            </div>
          )}
        </div>

        <div>
          <SearchableDropdown
            label="Flight Class"
            value={flightClass}
            onChange={setFlightClass}
            placeholder={
              !flightNumber 
                ? "Select flight number first" 
                : loadingClasses 
                  ? "Loading classes..." 
                  : "Pick Flight Class Here"
            }
            options={flightClassOptions}
            disabled={!flightNumber}
          />
          {errorClasses && flightNumber && (
            <div className="mt-2 flex items-center justify-between bg-red-900/20 border border-red-500/50 rounded-lg p-2">
              <div className="flex items-center space-x-2 flex-1">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-400 text-sm">Connection error. Please retry.</span>
              </div>
              <button
                type="button"
                onClick={retryFetchClasses}
                disabled={loadingClasses}
                className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingClasses ? 'Retrying...' : 'Retry'}
              </button>
            </div>
          )}
        </div>

        <div>
          <SearchableDropdown
            label="Menu"
            value={menu}
            onChange={setMenu}
            placeholder={
              !flightClass 
                ? "Select flight class first" 
                : loadingMenus 
                  ? "Loading menus..." 
                  : "Menu Code"
            }
            options={menuOptions}
            disabled={!flightClass}
          />
          {errorMenus && flightClass && (
            <div className="mt-2 flex items-center justify-between bg-red-900/20 border border-red-500/50 rounded-lg p-2">
              <div className="flex items-center space-x-2 flex-1">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-400 text-sm">Connection error. Please retry.</span>
              </div>
              <button
                type="button"
                onClick={retryFetchMenus}
                disabled={loadingMenus}
                className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingMenus ? 'Retrying...' : 'Retry'}
              </button>
            </div>
          )}
        </div>

        <button 
          type="submit"
          disabled={!airline || !flightNumber || !flightClass || !menu}
          className={`w-full font-semibold py-2 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 pb-3 ${
            airline && flightNumber && flightClass && menu
              ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
              : 'bg-gray-500 text-gray-300 cursor-not-allowed'
          }`}
        >
          <span>Next</span>
        </button>
      </form>
    </div>
  )
}

export default SystemDetailsForm
