// API Configuration
export const BASE_URL = 'http://10.0.0.36:9080'
export const BACKEND_API_URL = 'http://10.0.0.99:8000'

// API Response Types
export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

export interface User {
  user_id: number
  username: string
  email: string
  full_name: string | null
  is_active: boolean
  is_admin: boolean
  created_at: string
}

export interface LoginRequest {
  username: string // Can be username OR email
  password: string
}

export interface ApiError {
  detail?: string
  message?: string
}

// Token Management
export const TOKEN_KEY = 'catrion_access_token'
export const USER_KEY = 'catrion_user'

export const tokenStorage = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch (error) {
      console.error('Error getting token from storage:', error)
      return null
    }
  },
  
  set: (token: string): void => {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch (error) {
      console.error('Error saving token to storage:', error)
    }
  },
  
  remove: (): void => {
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    } catch (error) {
      console.error('Error removing token from storage:', error)
    }
  }
}

export const userStorage = {
  get: (): User | null => {
    try {
      const userStr = localStorage.getItem(USER_KEY)
      return userStr ? JSON.parse(userStr) : null
    } catch (error) {
      console.error('Error getting user from storage:', error)
      return null
    }
  },
  
  set: (user: User): void => {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    } catch (error) {
      console.error('Error saving user to storage:', error)
    }
  },
  
  remove: (): void => {
    try {
      localStorage.removeItem(USER_KEY)
    } catch (error) {
      console.error('Error removing user from storage:', error)
    }
  }
}

// Auth API Functions
export const authApi = {
  /**
   * Login with username/email and password
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle different error status codes
        if (response.status === 401) {
          throw new Error('Incorrect username/email or password')
        } else if (response.status === 403) {
          throw new Error('Account is inactive. Please contact support.')
        } else if (response.status === 422) {
          const errorMsg = data.detail || data.message || 'Invalid input format'
          throw new Error(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg)
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later.')
        } else {
          const errorMsg = data.detail || data.message || 'Login failed'
          throw new Error(errorMsg)
        }
      }

      return data as LoginResponse
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.')
      }
      // Re-throw if it's already an Error
      if (error instanceof Error) {
        throw error
      }
      // Fallback for unknown errors
      throw new Error('An unexpected error occurred. Please try again.')
    }
  },

  /**
   * Get current user information (requires authentication)
   */
  getCurrentUser: async (): Promise<User> => {
    const token = tokenStorage.get()
    if (!token) {
      throw new Error('No authentication token found')
    }

    try {
      const response = await fetch(`${BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          tokenStorage.remove()
          userStorage.remove()
          throw new Error('Session expired. Please login again.')
        } else if (response.status === 403) {
          throw new Error('Account is inactive. Please contact support.')
        } else {
          const errorMsg = data.detail || data.message || 'Failed to fetch user information'
          throw new Error(errorMsg)
        }
      }

      return data as User
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.')
      }
      if (error instanceof Error) {
        throw error
      }
      throw new Error('An unexpected error occurred. Please try again.')
    }
  }
}

// Backend API Functions (for camera feed)
export interface UserDishMappingRequest {
  type: 'user_dish_mapping'
  data: {
    flight_details: {
      flight_number: string
    }
    menu_details: {
      menu_code: string
    }
    food_level: number
    dish_results: Array<{
      dish_id: string
      dish_bbox: number[] // [x, y, width, height] or [] if not detected
    }>
  }
}

export const backendApi = {
  /**
   * Send user dish mapping to backend
   */
  sendUserDishMapping: async (mappingData: UserDishMappingRequest['data']): Promise<void> => {
    try {
      const requestData: UserDishMappingRequest = {
        type: 'user_dish_mapping',
        data: mappingData
      }

      const response = await fetch(`${BACKEND_API_URL}/post_request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`)
      }

      // 200 OK - success (no body expected)
      return
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.')
      }
      // Re-throw if it's already an Error
      if (error instanceof Error) {
        throw error
      }
      // Fallback for unknown errors
      throw new Error('An unexpected error occurred. Please try again.')
    }
  }
}

