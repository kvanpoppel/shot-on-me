/**
 * Centralized Axios configuration for mobile app
 * Provides consistent timeout and error handling across all requests
 */

import axios from 'axios'

// Create axios instance with default config
const axiosInstance = axios.create({
  timeout: 20000, // 20 seconds - good for mobile networks
  withCredentials: true, // Send HttpOnly session cookie on every request
  headers: {
    'Content-Type': 'application/json'
  }
})

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


