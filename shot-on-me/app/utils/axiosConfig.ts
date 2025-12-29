/**
 * Centralized Axios configuration for mobile app
 * Provides consistent timeout and error handling across all requests
 */

import axios from 'axios'

// Create axios instance with default config
const axiosInstance = axios.create({
  timeout: 20000, // 20 seconds - good for mobile networks
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor - add auth token if available
axiosInstance.interceptors.request.use(
  (config) => {
    // Add auth token from localStorage if available
    if (typeof window !== 'undefined') {
      let token = null
      try {
        token = localStorage.getItem('token')
      } catch (err) {
        // Tracking prevention or localStorage blocked
        token = null
      }
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle errors consistently
axiosInstance.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Enhanced error logging for mobile debugging
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.error('⏱️ Request timeout:', {
        url: error.config?.url,
        method: error.config?.method,
        timeout: error.config?.timeout
      })
    } else if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED') {
      console.error('🔌 Connection error:', {
        url: error.config?.url,
        message: error.message,
        code: error.code
      })
    }
    return Promise.reject(error)
  }
)

export default axiosInstance


