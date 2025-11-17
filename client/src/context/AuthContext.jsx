import React, { createContext, useState, useContext, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  // Token expiration time (2 days in milliseconds)
  const TOKEN_EXPIRY_DAYS = 2
  const TOKEN_EXPIRY_MS = TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000

  // Helper function to set axios default headers with token
  const setAxiosAuthHeader = (token) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      console.log('✅ Axios auth header set with token')
    } else {
      delete axios.defaults.headers.common['Authorization']
      console.log('✅ Axios auth header removed')
    }
  }

  // Helper function to set token with expiry
  const setTokenWithExpiry = (token) => {
    const now = new Date()
    const expiry = now.getTime() + TOKEN_EXPIRY_MS
    localStorage.setItem('token', token)
    localStorage.setItem('tokenExpiry', expiry.toString())
    
    // Set axios default headers immediately
    setAxiosAuthHeader(token)
  }

  // Helper function to check if token is expired
  const isTokenExpired = () => {
    const expiry = localStorage.getItem('tokenExpiry')
    if (!expiry) return true
    
    const now = new Date().getTime()
    return now > parseInt(expiry)
  }

  // Helper function to clear token and expiry
  const clearToken = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('tokenExpiry')
    localStorage.removeItem('user')
    setAxiosAuthHeader(null)
  }

  // Separate async function for token validation
  const validateToken = async (token) => {
    try {
      // Set the token in headers before making the verification request
      setAxiosAuthHeader(token)
      
      const response = await axios.get('http://localhost:5000/api/auth/verify', {
        timeout: 5000
      })
      
      if (response.data.valid) {
        setTokenWithExpiry(token) // Refresh expiry on successful verification
        return true
      } else {
        throw new Error('Token validation failed')
      }
    } catch (error) {
      console.error('Token validation error:', error.message)
      
      // If backend is not available, we'll assume the token is valid for client-side purposes
      // but we'll still check the expiry time
      if (error.code === 'ECONNREFUSED' || error.message.includes('timeout') || error.message.includes('Network Error')) {
        console.log('Backend unavailable, using client-side token validation')
        setTokenWithExpiry(token) // Refresh expiry anyway
        return true
      }
      
      // If it's an authorization error, the token might be invalid
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('Token invalid according to server')
        return false
      }
      
      return false
    }
  }

  // Initialize authentication on app load
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🔄 Initializing authentication...')
      
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')
      
      if (token && userData) {
        try {
          console.log('📝 Found token and user data in localStorage')
          
          // Check if token is expired
          if (isTokenExpired()) {
            console.log('❌ Token expired on page load')
            clearToken()
            setLoading(false)
            setIsInitialized(true)
            return
          }

          const parsedUser = JSON.parse(userData)
          console.log('👤 Parsed user data:', parsedUser)
          
          // Validate token with backend (or use client-side validation if backend is down)
          console.log('🔐 Validating token with server...')
          const isValid = await validateToken(token)
          
          if (isValid) {
            setUser(parsedUser)
            console.log('✅ User authenticated:', parsedUser.username)
          } else {
            throw new Error('Token validation failed')
          }
          
        } catch (error) {
          console.error('❌ Error initializing auth:', error.message)
          clearToken()
          setUser(null)
        }
      } else {
        console.log('ℹ️ No token found, user not authenticated')
        clearToken() // Ensure clean state
      }
      
      setLoading(false)
      setIsInitialized(true)
      console.log('✅ Auth initialization complete')
    }

    initializeAuth()
  }, [])

  // Auto-logout when token expires
  useEffect(() => {
    if (!user) return

    const checkTokenExpiry = () => {
      if (isTokenExpired()) {
        console.log('⏰ Token expired, auto-logging out...')
        logout()
      }
    }

    // Check every 30 seconds
    const interval = setInterval(checkTokenExpiry, 30000)
    return () => clearInterval(interval)
  }, [user])

  const login = async (username, password) => {
    try {
      console.log('🔐 Attempting login for user:', username)
      
      // Clear any existing token first to ensure clean state
      setAxiosAuthHeader(null)
      
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        username,
        password
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      console.log('✅ Login response received:', response.data)
      
      const { token, user } = response.data
      
      if (!token) {
        throw new Error('No token received from server')
      }
      
      if (!user) {
        throw new Error('No user data received from server')
      }
      
      // Store token with expiry and set axios headers
      setTokenWithExpiry(token)
      localStorage.setItem('user', JSON.stringify(user))
      
      setUser(user)
      
      console.log('✅ Login successful for:', user.username)
      console.log('✅ Token stored and axios headers configured')
      
      // Verify the header is actually set
      console.log('🔍 Current axios headers:', axios.defaults.headers.common['Authorization'] ? 'SET' : 'NOT SET')
      
      return { success: true, user }
      
    } catch (error) {
      console.error('❌ Login error:', error)
      
      let errorMessage = 'Login failed. Please try again.'
      
      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to server. Please make sure the backend is running on port 5000.'
      } else if (error.response) {
        // Server responded with error status
        errorMessage = error.response.data?.error || `Server error: ${error.response.status}`
        
        // Log detailed error info for debugging
        console.error('Server error details:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        })
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'No response from server. Please check your connection.'
        console.error('No response received. Request:', error.request)
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timeout. Server is taking too long to respond.'
      } else if (error.message.includes('Network Error')) {
        errorMessage = 'Network error. Please check your internet connection.'
      } else if (error.message.includes('No token received')) {
        errorMessage = 'Server response incomplete. Please try again.'
      }
      
      // Clear any partial authentication data
      clearToken()
      setUser(null)
      
      return { 
        success: false, 
        error: errorMessage 
      }
    }
  }

  const logout = async () => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        // Ensure the token is set in headers for the logout request
        setAxiosAuthHeader(token)
        
        // Try to call backend logout endpoint if available
        await axios.post('http://localhost:5000/api/auth/logout', {}, {
          timeout: 3000
        }).catch(error => {
          // It's okay if logout fails on backend - we'll still clear client-side
          console.log('ℹ️ Backend logout optional - clearing client-side session')
        })
      }
    } catch (error) {
      console.log('ℹ️ Logout - proceeding with client-side cleanup')
    } finally {
      clearToken()
      setUser(null)
      console.log('✅ User logged out successfully')
    }
  }

  // Get remaining token time in minutes
  const getRemainingTime = () => {
    if (!user || isTokenExpired()) return 0
    
    const expiry = parseInt(localStorage.getItem('tokenExpiry'))
    const now = new Date().getTime()
    return Math.max(0, Math.round((expiry - now) / 60000)) // Convert to minutes
  }

  // Get remaining token time in human readable format
  const getRemainingTimeFormatted = () => {
    const minutes = getRemainingTime()
    if (minutes === 0) return 'Expired'
    
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return `${hours} hour${hours !== 1 ? 's' : ''}${remainingMinutes > 0 ? ` ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}` : ''}`
    } else {
      const days = Math.floor(minutes / 1440)
      const hours = Math.floor((minutes % 1440) / 60)
      return `${days} day${days !== 1 ? 's' : ''}${hours > 0 ? ` ${hours} hour${hours !== 1 ? 's' : ''}` : ''}`
    }
  }

  // Refresh token (extend session)
  const refreshToken = async () => {
    const token = localStorage.getItem('token')
    if (!token) return false

    try {
      const isValid = await validateToken(token)
      if (isValid) {
        console.log('✅ Session refreshed successfully')
        return true
      }
      return false
    } catch (error) {
      console.error('Error refreshing token:', error)
      return false
    }
  }

  // Function to manually set auth header (useful for direct API calls)
  const setAuthHeader = (token = null) => {
    const authToken = token || localStorage.getItem('token')
    if (authToken) {
      setAxiosAuthHeader(authToken)
      return true
    }
    return false
  }

  // Function to check if auth header is set
  const isAuthHeaderSet = () => {
    return !!axios.defaults.headers.common['Authorization']
  }

  // Function to get current token
  const getToken = () => {
    return localStorage.getItem('token')
  }

  // Function to manually reinitialize auth (useful after token updates)
  const reinitializeAuth = async () => {
    setLoading(true)
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    if (token && userData && !isTokenExpired()) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      setAxiosAuthHeader(token)
    } else {
      clearToken()
      setUser(null)
    }
    
    setLoading(false)
  }

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user && !isTokenExpired(),
    isInitialized,
    getRemainingTime,
    getRemainingTimeFormatted,
    refreshToken,
    tokenExpiryDays: TOKEN_EXPIRY_DAYS,
    setAuthHeader,
    isAuthHeaderSet,
    getToken,
    reinitializeAuth
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}