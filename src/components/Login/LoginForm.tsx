import { useState } from 'react'
import { authApi, tokenStorage, userStorage, type User } from '../../utils/api'
import poweredByQss from '../../assets/images/poweredbyqss.png'
import catrionLogo from '../../assets/images/catrion.png'

interface LoginFormProps {
  onLoginSuccess?: (user: User) => void
}

const LoginForm = ({ onLoginSuccess }: LoginFormProps) => {
  const [username, setUsername] = useState('admin@catrion.com')
  const [password, setPassword] = useState('admin1234')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Validate input
    if (!username.trim()) {
      setError('Please enter your username or email')
      setIsLoading(false)
      return
    }

    if (!password) {
      setError('Please enter your password')
      setIsLoading(false)
      return
    }

    try {
      // Call the login API
      const response = await authApi.login({
        username: username.trim(),
        password: password,
      })

      // Store token and user data
      tokenStorage.set(response.access_token)
      userStorage.set(response.user)

      console.log('✅ Login successful:', { user: response.user })

      // Call success callback with user data
      onLoginSuccess?.(response.user)
    } catch (err) {
      // Handle errors
      if (err instanceof Error) {
        setError(err.message)
        console.error('❌ Login failed:', err.message)
      } else {
        setError('An unexpected error occurred. Please try again.')
        console.error('❌ Login failed:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = () => {
    console.log('Forgot password clicked for:', username)
    // Show error message smoothly
    setError('Password reset functionality is not available at this time. Please contact your administrator.')
  }

  return (
    <div className="bg-[#171C2A] rounded-lg shadow-xl p-8 w-full max-w-md flex flex-col">
      {/* Catrion Logo - Centered above Sign In title */}

      
      <h4 className="text-xl font-bold text-white mb-6">Sign In</h4>
      
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-[#242835] py-4 px-4 flex-1">
        {/* Username or Email Field */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Username or Email
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username or email"
            required
            autoComplete="username"
            className="w-full px-4 py-2 bg-[#171C2A] text-white border border-gray-600 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
          />
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              className="w-full px-4 py-2 bg-[#171C2A] text-white border border-gray-600 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Forgot Password Link */}
        <div className="text-right">
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-sm text-green-500 hover:text-green-400 transition-colors"
          >
            Forgot Password?
          </button>
        </div>

        {/* Error Message - appears under Forgot Password */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded-lg text-sm" style={{ animation: 'fadeInSlideDown 0.3s ease-out' }}>
            {error}
          </div>
        )}

        {/* Sign In Button */}
        <button 
          type="submit"
          disabled={!username.trim() || !password || isLoading}
          className={`w-full font-semibold py-2 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 pb-3 ${
            username.trim() && password && !isLoading
              ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
              : 'bg-gray-500 text-gray-300 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Signing In...</span>
            </>
          ) : (
            <span>Sign In</span>
          )}
        </button>
      </form>
      
      {/* Powered by QSS Image */}
      <div className="mt-6 flex justify-center">
        <img 
          src={poweredByQss} 
          alt="Powered by QSS" 
          className="object-contain"
        />
      </div>
    </div>
  )
}

export default LoginForm

