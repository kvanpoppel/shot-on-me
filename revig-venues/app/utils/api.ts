export function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/$/, '')
  }
  return 'https://shot-on-me.onrender.com/api'
}
