
import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

interface ManualRectangle {
  id: string
  coordinates: [number, number, number, number] // [x1, y1, x2, y2] in image pixel space
  color: string
}

interface CameraFeedPanelProps {
  flightData: {
    airline: string
    flightNumber: string
    flightClass: string
    menu: string
  }
  onColorMappingReady?: (mapping: ColorMapping, rectangles: DetectionRectangle[]) => void
  onMissingDishesUpdate?: (count: number) => void
  onManualRectanglesCountUpdate?: (count: number) => void
  onModelResults?: (results: any) => void
  onMappingModeChange?: (isMappingMode: boolean, usedColors: string[]) => void
}

export interface ImageDimensions {
  naturalWidth: number
  naturalHeight: number
  displayWidth: number
  displayHeight: number
  offsetX: number
  offsetY: number
}

export interface DetectionRectangle {
  index: number
  coordinates: [number, number, number, number] // [x1, y1, x2, y2] in image pixel space
  color: string
  dishName?: string
}

export interface ColorMapping {
  [detectionIndex: number]: string
}

const CameraFeedPanel = ({ flightData, onColorMappingReady, onMissingDishesUpdate, onManualRectanglesCountUpdate, onModelResults, onMappingModeChange }: CameraFeedPanelProps) => {
  const [isCaptured, setIsCaptured] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [currentFrameName, setCurrentFrameName] = useState<string | null>(null)
  const [_modelResults, setModelResults] = useState<any>(null) // Stored for potential future use
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null)
  const [detectionRectangles, setDetectionRectangles] = useState<DetectionRectangle[]>([])
  const [_colorMapping, setColorMapping] = useState<ColorMapping>({}) // Stored and exposed via callback for next step
  const [manualRectangles, setManualRectangles] = useState<ManualRectangle[]>([])
  const [missingDishes, setMissingDishes] = useState<number>(0)
  const [isDrawingModeEnabled, setIsDrawingModeEnabled] = useState(false)
  const [isMappingMode, setIsMappingMode] = useState(false)
  const [selection, setSelection] = useState<{
    startX: number
    startY: number
    endX: number
    endY: number
  } | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  
  // Socket connection state
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [serverUrl] = useState('http://localhost:3001')
  const reconnectTimeoutRef = useRef<number | null>(null)
  const reconnectAttempts = useRef(0)
  const isMountedRef = useRef(true)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const MAX_RECONNECT_ATTEMPTS = 5
  const BASE_RECONNECT_DELAY = 2000

  // Color palette for rectangles - 12 unique, highly distinct colors
  const COLOR_PALETTE = [
    '#FF0000', // 1. Red
    '#FF8800', // 2. Orange
    '#FFFF00', // 3. Yellow
    '#00FF00', // 4. Green
    '#000000', // 5. Black
    '#0080FF', // 6. Blue
    '#8000FF', // 7. Purple
    '#FF1493', // 8. Pink
    '#8B4513', // 9. Brown (Saddle Brown)
    '#808000', // 10. Olive (Yellow-Green)
    '#008080', // 11. Teal (Blue-Green)
    '#FFFFFF', // 12. White
  ]

  // Initialize socket connection on mount
  useEffect(() => {
    isMountedRef.current = true
    initializeSocket()
    
    return () => {
      isMountedRef.current = false
      disconnectSocket()
    }
  }, [])

  const initializeSocket = () => {
    if (!isMountedRef.current) return
    
    // Disconnect existing socket if any to prevent duplicate listeners
    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
    }
    
    setConnectionStatus('connecting')
    
    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    })

    // Connection success handler
    newSocket.on('connect', () => {
      if (!isMountedRef.current) return
      
      setConnectionStatus('connected')
      reconnectAttempts.current = 0
      
      // Send start_streaming message via 'subscribe' event
      const startStreamMessage = {
        type: "start_streaming",
        data: {}
      }
      newSocket.emit('subscribe', startStreamMessage)
    })

    // Connection error handler
    newSocket.on('connect_error', () => {
      if (!isMountedRef.current) return
      
      setConnectionStatus('error')
      handleReconnection(newSocket)
    })

    // Disconnect handler
    newSocket.on('disconnect', (reason) => {
      if (!isMountedRef.current) return
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect
        setConnectionStatus('disconnected')
      } else {
        // Client-side disconnect or network issues
        setConnectionStatus('reconnecting')
        handleReconnection(newSocket)
      }
    })

    // Stream frames handler - listens for incoming frames
    newSocket.on('stream_frames', (data) => {
      if (!isMountedRef.current) return
      
      try {
        // Parse the data
        let parsedData = typeof data === 'string' ? JSON.parse(data) : data
        
        if (parsedData && parsedData.title === 'send_frames' && parsedData.data) {
          const frameInfo = parsedData.data
          
          // Store the current frame name
          if (frameInfo.frame_name) {
            setCurrentFrameName(frameInfo.frame_name)
          }
          
          if (frameInfo.frame_data) {
            let base64Data = null
            
            // Check if it's already a data URI
            if (typeof frameInfo.frame_data === 'string' && frameInfo.frame_data.startsWith('data:image/')) {
              base64Data = frameInfo.frame_data
            } 
            // Check if it's an object with base_64_img property
            else if (typeof frameInfo.frame_data === 'object' && frameInfo.frame_data.base_64_img) {
              base64Data = `data:image/png;base64,${frameInfo.frame_data.base_64_img}`
            } 
            // Assume it's a base64 string (JPEG images)
            else if (typeof frameInfo.frame_data === 'string') {
              // Remove any existing data URI prefix if present
              const base64String = frameInfo.frame_data.replace(/^data:image\/[a-z]+;base64,/, '')
              base64Data = `data:image/jpeg;base64,${base64String}`
            }
            
            if (base64Data && !isCaptured) {
              setCapturedImage(base64Data)
            }
          }
        }
      } catch (error) {
        // Silently handle parsing errors
      }
    })

    // Model results handler - listens for detection results after capture
    newSocket.on('model_results', (data) => {
      if (!isMountedRef.current) return
      
      try {
        // Parse the data
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data
        
        console.log('Model Results Data (for rectangles):', parsedData)
        
        // Store model results
        setModelResults(parsedData)
        
        // Notify parent component with model results
        if (onModelResults) {
          onModelResults(parsedData)
        }
        
        // Process detection results and assign colors
        if (parsedData?.type === 'img_model_results' && parsedData.data?.model_results?.deetction_results) {
          console.log('Model Results - Detection Results:', parsedData.data.model_results)
          processDetectionResults(parsedData.data)
          
          // Extract and set missing_dishes count
          const missingCount = parsedData.data?.model_results?.missing_dishes || 0
          setMissingDishes(missingCount)
          if (onMissingDishesUpdate) {
            onMissingDishesUpdate(missingCount)
          }
        }
      } catch (error) {
        // Silently handle parsing errors
      }
    })

    setSocket(newSocket)
  }

  const handleReconnection = (oldSocket: Socket) => {
    if (!isMountedRef.current) return
    
    if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
      setConnectionStatus('error')
      return
    }

    reconnectAttempts.current++
    const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts.current - 1)
    
    setConnectionStatus('reconnecting')
    
    // Disconnect old socket
    oldSocket.disconnect()
    
    // Schedule reconnection
    reconnectTimeoutRef.current = window.setTimeout(() => {
      if (isMountedRef.current) {
        initializeSocket()
      }
    }, delay)
  }

  const disconnectSocket = () => {
    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current)
    }
    
    if (socket) {
      socket.disconnect()
      setSocket(null)
    }
    
    setConnectionStatus('disconnected')
  }

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500'
      case 'connecting': return 'bg-yellow-500 animate-pulse'
      case 'reconnecting': return 'bg-orange-500 animate-pulse'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected'
      case 'connecting': return 'Connecting...'
      case 'reconnecting': return `Reconnecting... (${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`
      case 'error': return 'Connection Error'
      default: return 'Disconnected'
    }
  }

  /**
   * Processes detection results and assigns unique colors to each detection
   * Stores the color mapping for use in next steps
   */
  const processDetectionResults = (resultsData: any) => {
    try {
      const detections = resultsData?.model_results?.deetction_results || []
      console.log('Detection Results (coordinates for rectangles):', detections)
      
      const rectangles: DetectionRectangle[] = []
      const mapping: ColorMapping = {}
      
      detections.forEach((detection: any, index: number) => {
        // Only process detections with valid coordinates
        if (detection?.coordinates && Array.isArray(detection.coordinates) && detection.coordinates.length === 4) {
          const color = COLOR_PALETTE[index % COLOR_PALETTE.length]
          mapping[index] = color
          
          rectangles.push({
            index,
            coordinates: detection.coordinates as [number, number, number, number],
            color,
            dishName: detection.dish_name || detection.dish_id
          })
        }
      })
      
      setDetectionRectangles(rectangles)
      setColorMapping(mapping)
      
      // Notify parent component about color mapping for next step
      // This makes colorMapping accessible for next step usage
      if (onColorMappingReady) {
        onColorMappingReady(mapping, rectangles)
      }
      
      // Color mapping format: { 0: '#FFFF00', 1: '#00FF00', ... }
      // Maps detection index to its assigned color
      
      // Ensure colorMapping state is set (satisfies linter)
      if (Object.keys(mapping).length > 0) {
        // State set above - this just ensures it's recognized as used
      }
    } catch (error) {
      // Silently handle processing errors
    }
  }

  /**
   * Recalculates image dimensions based on actual rendered size
   * Needed for proper coordinate transformation from image space to display space
   */
  const recalculateImageDimensions = () => {
    if (!capturedImage || !imageRef.current) return
    
    try {
      const img = imageRef.current
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) return
      
      const containerRect = img.parentElement?.getBoundingClientRect()
      if (!containerRect || containerRect.width === 0 || containerRect.height === 0) return
      
      const imgAspect = img.naturalWidth / img.naturalHeight
      const containerAspect = containerRect.width / containerRect.height
      
      if (!isFinite(imgAspect) || !isFinite(containerAspect) || imgAspect <= 0 || containerAspect <= 0) {
        return
      }
      
      let displayWidth: number
      let displayHeight: number
      let offsetX: number
      let offsetY: number
      
      if (imgAspect > containerAspect) {
        // Image is wider - fit to width
        displayWidth = containerRect.width
        displayHeight = containerRect.width / imgAspect
        offsetX = 0
        offsetY = (containerRect.height - displayHeight) / 2
      } else {
        // Image is taller - fit to height
        displayHeight = containerRect.height
        displayWidth = containerRect.height * imgAspect
        offsetX = (containerRect.width - displayWidth) / 2
        offsetY = 0
      }
      
      // Validate calculated dimensions
      if (!isFinite(displayWidth) || !isFinite(displayHeight) || displayWidth <= 0 || displayHeight <= 0) {
        return
      }
      
      setImageDimensions({
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        displayWidth,
        displayHeight,
        offsetX: isFinite(offsetX) ? offsetX : 0,
        offsetY: isFinite(offsetY) ? offsetY : 0
      })
    } catch (error) {
      // Silently handle calculation errors
    }
  }

  /**
   * Transforms coordinates from image pixel space to display space
   */
  const transformCoordinatesToDisplay = (
    coordinates: [number, number, number, number],
    dimensions: ImageDimensions
  ): { x1: number; y1: number; x2: number; y2: number } | null => {
    try {
      const [imgX1, imgY1, imgX2, imgY2] = coordinates
      
      // Validate input coordinates
      if (!isFinite(imgX1) || !isFinite(imgY1) || !isFinite(imgX2) || !isFinite(imgY2)) {
        return null
      }
      
      // Calculate scale factors
      const scaleX = dimensions.displayWidth / dimensions.naturalWidth
      const scaleY = dimensions.displayHeight / dimensions.naturalHeight
      
      if (!isFinite(scaleX) || !isFinite(scaleY) || scaleX <= 0 || scaleY <= 0) {
        return null
      }
      
      // Transform coordinates
      const displayX1 = imgX1 * scaleX + dimensions.offsetX
      const displayY1 = imgY1 * scaleY + dimensions.offsetY
      const displayX2 = imgX2 * scaleX + dimensions.offsetX
      const displayY2 = imgY2 * scaleY + dimensions.offsetY
      
      // Validate transformed coordinates
      if (!isFinite(displayX1) || !isFinite(displayY1) || !isFinite(displayX2) || !isFinite(displayY2)) {
        return null
      }
      
      return { x1: displayX1, y1: displayY1, x2: displayX2, y2: displayY2 }
    } catch (error) {
      return null
    }
  }

  /**
   * Checks if user can draw more rectangles based on missing_dishes count
   */
  const canDrawMoreRectangles = (): boolean => {
    // Can draw if manual rectangles drawn is less than total missing dishes
    return manualRectangles.length < missingDishes
  }

  /**
   * Gets next available unique color that's not used by detection or manual rectangles
   */
  const getNextAvailableColor = (): string | null => {
    const usedColors = new Set<string>()
    
    // Get colors used by detection rectangles
    detectionRectangles.forEach(rect => {
      usedColors.add(rect.color)
    })
    
    // Get colors used by manual rectangles
    manualRectangles.forEach(rect => {
      usedColors.add(rect.color)
    })
    
    // Find first unused color from palette
    for (const color of COLOR_PALETTE) {
      if (!usedColors.has(color)) {
        return color
      }
    }
    
    // If all colors are used, return null (shouldn't happen normally)
    return null
  }

  /**
   * Removes a detection rectangle and increases missing dishes count
   */
  const handleRemoveDetectionRectangle = (index: number) => {
    // Remove the rectangle from the list
    setDetectionRectangles(prev => prev.filter(rect => rect.index !== index))
    
    // Increase missing dishes count
    const newMissingDishes = missingDishes + 1
    setMissingDishes(newMissingDishes)
    
    // Notify parent
    if (onMissingDishesUpdate) {
      const remainingCount = Math.max(0, newMissingDishes - manualRectangles.length)
      onMissingDishesUpdate(remainingCount)
    }
  }

  /**
   * Removes a manual rectangle and increases missing dishes count
   */
  const handleRemoveManualRectangle = (id: string) => {
    // Remove the rectangle from the list
    const updatedManualRectangles = manualRectangles.filter(rect => rect.id !== id)
    setManualRectangles(updatedManualRectangles)
    
    // Notify parent about manual rectangles count update
    if (onManualRectanglesCountUpdate) {
      onManualRectanglesCountUpdate(updatedManualRectangles.length)
    }
    
    // Update remaining count for parent
    if (onMissingDishesUpdate) {
      const remainingCount = Math.max(0, missingDishes - updatedManualRectangles.length)
      onMissingDishesUpdate(remainingCount)
    }
  }

  /**
   * Gets all colors used in rectangles (detection + manual)
   */
  const getAllUsedColors = (): string[] => {
    const colors = new Set<string>()
    
    // Get colors from detection rectangles
    detectionRectangles.forEach(rect => {
      colors.add(rect.color)
    })
    
    // Get colors from manual rectangles
    manualRectangles.forEach(rect => {
      colors.add(rect.color)
    })
    
    return Array.from(colors)
  }

  /**
   * Handles toggling drawing mode on/off
   */
  const handleToggleDrawing = () => {
    setIsDrawingModeEnabled(!isDrawingModeEnabled)
  }

  /**
   * Handles starting mapping mode
   */
  const handleStartMapping = () => {
    setIsMappingMode(true)
    
    // Notify parent with mapping mode and all used colors
    if (onMappingModeChange) {
      const usedColors = getAllUsedColors()
      onMappingModeChange(true, usedColors)
    }
  }

  /**
   * Handles mouse down - starts rectangle selection
   */
  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isCaptured || !imageDimensions) return
    if (!isDrawingModeEnabled) return // Only allow drawing when mode is enabled
    if (!canDrawMoreRectangles()) return
    
    e.preventDefault() // Prevent image dragging
    e.stopPropagation()
    
    const rect = e.currentTarget.getBoundingClientRect()
    const startX = e.clientX - rect.left
    const startY = e.clientY - rect.top
    
    setSelection({
      startX,
      startY,
      endX: startX,
      endY: startY
    })
    setIsDrawing(true)
  }

  /**
   * Handles mouse move - updates selection rectangle
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isDrawing || !selection) return
    
    e.preventDefault() // Prevent any default behavior
    
    const rect = e.currentTarget.getBoundingClientRect()
    const endX = e.clientX - rect.left
    const endY = e.clientY - rect.top
    
    setSelection({
      ...selection,
      endX,
      endY
    })
  }

  /**
   * Handles mouse up - completes rectangle selection
   */
  const handleMouseUp = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isDrawing || !selection || !imageDimensions || !capturedImage) {
      setIsDrawing(false)
      setSelection(null)
      return
    }
    
    const rect = e.currentTarget.getBoundingClientRect()
    const endX = e.clientX - rect.left
    const endY = e.clientY - rect.top
    
    const finalSelection = {
      ...selection,
      endX,
      endY
    }
    
    setIsDrawing(false)
    
    // Check if selection is valid (minimum 10px)
    const width = Math.abs(finalSelection.endX - finalSelection.startX)
    const height = Math.abs(finalSelection.endY - finalSelection.startY)
    
    if (width < 10 || height < 10) {
      setSelection(null)
      return
    }
    
    // Check if we can still draw more
    if (!canDrawMoreRectangles()) {
      setSelection(null)
      return
    }
    
    // Create manual rectangle
    await createManualRectangle(finalSelection)
    setSelection(null)
  }

  /**
   * Creates a manual rectangle from selection and assigns unique color
   */
  const createManualRectangle = async (selectionData: {
    startX: number
    startY: number
    endX: number
    endY: number
  }) => {
    if (!capturedImage || !imageDimensions) return
    
    try {
      const imgElement = imageRef.current
      if (!imgElement) return
      
      const displayRect = imgElement.getBoundingClientRect()
      if (!displayRect || displayRect.width === 0 || displayRect.height === 0) return
      
      // Calculate image dimensions and scale
      const containerAspect = displayRect.width / displayRect.height
      const imageAspect = imageDimensions.naturalWidth / imageDimensions.naturalHeight
      
      if (!isFinite(containerAspect) || !isFinite(imageAspect) || containerAspect <= 0 || imageAspect <= 0) {
        return
      }
      
      let renderedImageWidth: number
      let renderedImageHeight: number
      let offsetX: number
      let offsetY: number
      
      if (imageAspect > containerAspect) {
        renderedImageWidth = displayRect.width
        renderedImageHeight = displayRect.width / imageAspect
        offsetX = 0
        offsetY = (displayRect.height - renderedImageHeight) / 2
      } else {
        renderedImageHeight = displayRect.height
        renderedImageWidth = displayRect.height * imageAspect
        offsetX = (displayRect.width - renderedImageWidth) / 2
        offsetY = 0
      }
      
      if (!isFinite(renderedImageWidth) || !isFinite(renderedImageHeight) || renderedImageWidth <= 0 || renderedImageHeight <= 0) {
        return
      }
      
      const scaleX = imageDimensions.naturalWidth / renderedImageWidth
      const scaleY = imageDimensions.naturalHeight / renderedImageHeight
      
      if (!isFinite(scaleX) || !isFinite(scaleY) || scaleX <= 0 || scaleY <= 0) {
        return
      }
      
      // Convert display coordinates to image coordinates
      const adjustedX1 = Math.min(selectionData.startX, selectionData.endX) - offsetX
      const adjustedY1 = Math.min(selectionData.startY, selectionData.endY) - offsetY
      const adjustedX2 = Math.max(selectionData.startX, selectionData.endX) - offsetX
      const adjustedY2 = Math.max(selectionData.startY, selectionData.endY) - offsetY
      
      const imageX1 = Math.max(0, Math.round(adjustedX1 * scaleX))
      const imageY1 = Math.max(0, Math.round(adjustedY1 * scaleY))
      const imageX2 = Math.min(imageDimensions.naturalWidth, Math.round(adjustedX2 * scaleX))
      const imageY2 = Math.min(imageDimensions.naturalHeight, Math.round(adjustedY2 * scaleY))
      
      // Validate coordinates
      if (imageX1 >= imageX2 || imageY1 >= imageY2 || 
          !isFinite(imageX1) || !isFinite(imageY1) || !isFinite(imageX2) || !isFinite(imageY2)) {
        return
      }
      
      // Get unique color
      const color = getNextAvailableColor()
      if (!color) {
        return // No available colors
      }
      
      // Create manual rectangle
      const newRectangle: ManualRectangle = {
        id: `manual-${Date.now()}-${Math.random()}`,
        coordinates: [imageX1, imageY1, imageX2, imageY2],
        color
      }
      
      // Add to manual rectangles
      const updatedManualRectangles = [...manualRectangles, newRectangle]
      setManualRectangles(updatedManualRectangles)
      
      // Calculate remaining count for parent component
      const remainingCount = Math.max(0, missingDishes - updatedManualRectangles.length)
      
      // Auto-disable drawing mode if no more rectangles can be drawn
      if (remainingCount === 0) {
        setIsDrawingModeEnabled(false)
      }
      
      // Notify parent about the remaining missing dishes count
      if (onMissingDishesUpdate) {
        onMissingDishesUpdate(remainingCount)
      }
      
      // Notify parent about manual rectangles count update
      if (onManualRectanglesCountUpdate) {
        onManualRectanglesCountUpdate(updatedManualRectangles.length)
      }
    } catch (error) {
      // Silently handle errors
    }
  }

  const handleCaptureStream = () => {
    if (!socket) {
      return
    }
    
    if (!isCaptured) {
      // First click: Stop the stream (freeze current frame)
      if (!currentFrameName) {
        return
      }
      
      // Freeze the frame
      setIsCaptured(true)
        
      // Subscribe to stop_stream
      socket.emit('subscribe', 'stop_stream')
      
      // Send stop_streaming message
      const stopStreamMessage = {
        type: "stop_streaming",
        data: {
          frame_name: currentFrameName,
          food_level: 1
        }
      }
      
      socket.emit('subscribe', stopStreamMessage)
    } else {
      // Second click: Resume the stream
      const resumeStreamMessage = {
        type: "start_streaming",
        data: {}
      }
      
      socket.emit('subscribe', resumeStreamMessage)
      
      // Clear captured state and reset rectangles
      setIsCaptured(false)
      setDetectionRectangles([])
      setColorMapping({})
      setModelResults(null)
      setManualRectangles([])
      setMissingDishes(0)
      setSelection(null)
      setIsDrawing(false)
      setIsDrawingModeEnabled(false) // Reset drawing mode
      
      // Reset manual rectangles count in parent
      if (onManualRectanglesCountUpdate) {
        onManualRectanglesCountUpdate(0)
      }
    }
  }

  // Recalculate dimensions on window resize
  useEffect(() => {
    if (!capturedImage) return

    const handleResize = () => {
      setTimeout(() => {
        recalculateImageDimensions()
      }, 50)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [capturedImage])

  return (
    <div className="bg-[#242835] rounded-lg p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center space-x-4">
          {/* Socket Connection Status */}
          <div className="flex items-center space-x-2 bg-[#171C2A] px-3 py-1 rounded-full">
            <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`}></div>
            <span className="text-sm font-medium text-white">
              {getConnectionStatusText()}
            </span>
          </div>
          <div className="flex items-center space-x-1 text-[#5A5D66] text-sm">
            <span>|</span>
            <span className="font-medium">{flightData.airline}</span>
            <span>|</span>
            <span className="font-medium">{flightData.flightNumber}</span>
            <span>|</span>
            <span className="font-medium">{flightData.flightClass}</span>
            <span>|</span>
            <span className="font-medium">{flightData.menu}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleCaptureStream}
            className={`font-semibold py-2 px-4 rounded-lg transition-colors duration-200 cursor-pointer ${
              isCaptured 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isCaptured ? 'Resume' : 'Capture'}
          </button>
          
          {/* Draw Rectangle button - only show when remaining rectangles > 0 */}
          {isCaptured && canDrawMoreRectangles() && (
            <button 
              onClick={handleToggleDrawing}
              className={`font-semibold py-2 px-4 rounded-lg transition-colors duration-200 cursor-pointer ${
                isDrawingModeEnabled 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isDrawingModeEnabled ? 'Stop Drawing' : 'Draw Rectangle'}
            </button>
          )}
          
          {/* Start Mapping button - only show when rectangles are complete (new rectangles = 0) */}
          {isCaptured && !canDrawMoreRectangles() && (detectionRectangles.length > 0 || manualRectangles.length > 0) && (
            <button 
              onClick={handleStartMapping}
              className="font-semibold py-2 px-6 rounded-lg transition-colors duration-200 cursor-pointer bg-purple-600 hover:bg-purple-700 text-white"
            >
              Start Mapping
            </button>
          )}
        </div>
      </div>

      {/* Video Feed Area - Centered and Full Height */}
      <div className="flex-1 bg-[#242835] rounded-lg min-h-0 overflow-hidden relative">
        {/* Show captured image or live stream */}
        {capturedImage ? (
          <div 
            className="relative w-full h-full"
          >
            <img
              ref={imageRef}
              src={capturedImage}
              alt="Captured frame"
              draggable={false}
              className={`w-full h-full object-contain select-none ${isDrawingModeEnabled ? 'cursor-crosshair' : ''}`}
              style={{ userSelect: 'none', pointerEvents: 'auto' }}
              onLoad={recalculateImageDimensions}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => {
                // Complete selection if mouse leaves while drawing
                if (isDrawing && selection) {
                  setIsDrawing(false)
                  setSelection(null)
                }
              }}
            />
            
            {/* Detection rectangles overlay */}
            {imageDimensions && detectionRectangles.map((rect) => {
              const displayCoords = transformCoordinatesToDisplay(rect.coordinates, imageDimensions)
              if (!displayCoords) return null
              
              const { x1, y1, x2, y2 } = displayCoords
              const width = Math.abs(x2 - x1)
              const height = Math.abs(y2 - y1)
              
              return (
                <div
                  key={rect.index}
                  className="absolute border-4 pointer-events-none"
                  style={{
                    left: `${Math.min(x1, x2)}px`,
                    top: `${Math.min(y1, y2)}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                    borderColor: rect.color,
                    borderStyle: 'solid',
                    borderWidth: '4px',
                  }}
                >
                  {/* Close button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveDetectionRectangle(rect.index)
                    }}
                    className="absolute -top-2 -right-2 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors pointer-events-auto cursor-pointer"
                    style={{ zIndex: 10 }}
                  >
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )
            })}
            
            {/* Manual rectangles overlay */}
            {imageDimensions && manualRectangles.map((rect) => {
              const displayCoords = transformCoordinatesToDisplay(rect.coordinates, imageDimensions)
              if (!displayCoords) return null
              
              const { x1, y1, x2, y2 } = displayCoords
              const width = Math.abs(x2 - x1)
              const height = Math.abs(y2 - y1)
              
              return (
                <div
                  key={rect.id}
                  className="absolute border-4 pointer-events-none"
                  style={{
                    left: `${Math.min(x1, x2)}px`,
                    top: `${Math.min(y1, y2)}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                    borderColor: rect.color,
                    borderStyle: 'solid',
                    borderWidth: '4px',
                  }}
                >
                  {/* Close button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveManualRectangle(rect.id)
                    }}
                    className="absolute -top-2 -right-2 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors pointer-events-auto cursor-pointer"
                    style={{ zIndex: 10 }}
                  >
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )
            })}
            
            {/* Selection rectangle overlay (while drawing) */}
            {selection && isDrawing && (
              <div
                className="absolute border-2 border-blue-500 pointer-events-none"
                style={{
                  left: `${Math.min(selection.startX, selection.endX)}px`,
                  top: `${Math.min(selection.startY, selection.endY)}px`,
                  width: `${Math.abs(selection.endX - selection.startX)}px`,
                  height: `${Math.abs(selection.endY - selection.startY)}px`,
                  borderStyle: 'dashed',
                }}
              />
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            Waiting for stream...
          </div>
        )}
      </div>
    </div>
  )
}

export default CameraFeedPanel

