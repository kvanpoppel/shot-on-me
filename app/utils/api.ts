/**
 * Dynamically determines the API URL based on the current hostname
 * This allows the app to work on mobile devices accessing via IP address
 * 
 * IMPORTANT: This must be called at runtime in the browser, not at module load time
 */
export const getApiUrl = (): string => {
  // If environment variable is set, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    console.log('Using env API URL:', process.env.NEXT_PUBLIC_API_URL)
    return process.env.NEXT_PUBLIC_API_URL
  }
  
  // If running in browser, use current hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    // If accessing via IP address (mobile), use that IP for backend
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const url = `https://shot-on-me.onrender.com/api`
      console.log('Using Render API URL:', url)
      return url
    }
  }
  
  // Default to localhost for server-side rendering
  console.log('Using localhost API URL')
  return 'http://localhost:5000/api'
}

export const getSocketUrl = (): string => {
  // If environment variable is set, use it (remove /api if present)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace('/api', '')
  }
  
  // If running in browser, use current hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:5000`
    }
  }
  
  // Default to localhost for server-side rendering
  return 'http://localhost:5000'
}

// For backward compatibility, export a getter function
// Components should use useApiUrl() hook instead, but this works too
export const getAPI_URL = () => getApiUrl()
export const getSOCKET_URL = () => getSocketUrl()

// Hook to get API URL at runtime (use in components)
export const useApiUrl = () => {
  if (typeof window !== 'undefined') {
    return getApiUrl()
  }
  return 'http://localhost:5000/api'
}

export const useSocketUrl = () => {
  if (typeof window !== 'undefined') {
    return getSocketUrl()
  }
  return 'http://localhost:5000'
}

// Functions are already exported above, no need to re-export

