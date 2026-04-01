export const getApiUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    let url = process.env.NEXT_PUBLIC_API_URL.trim()
    if (!url.endsWith('/api')) {
      url = url.endsWith('/') ? `${url}api` : `${url}/api`
    }
    return url
  }
  return 'https://shot-on-me.onrender.com/api'
}

export function useApiUrl() {
  return getApiUrl()
}
