const PRODUCTION_API = 'https://shot-on-me.onrender.com/api'
const PRODUCTION_SOCKET = 'https://shot-on-me.onrender.com'

export const getApiUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    let url = process.env.NEXT_PUBLIC_API_URL.trim()
    if (!url.endsWith('/api')) {
      url = url.endsWith('/') ? `${url}api` : `${url}/api`
    }
    return url
  }
  return PRODUCTION_API
}

export const getSocketUrl = (): string => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL.trim()
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/api\/?$/, '')
  }
  return PRODUCTION_SOCKET
}

export const useApiUrl = () => getApiUrl()
export const useSocketUrl = () => getSocketUrl()

export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = getApiUrl()
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  return `${cleanBase}/${cleanEndpoint}`
}
