/**
 * Feed optimization utilities
 * Request deduplication, caching, and performance helpers
 */

// Request cache with TTL
const requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>()

/**
 * Cached fetch with deduplication
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 30000 // 30 seconds default
): Promise<T> {
  const cached = requestCache.get(key)
  const now = Date.now()

  // Return cached data if still valid
  if (cached && (now - cached.timestamp) < cached.ttl) {
    return cached.data as T
  }

  // Check if request is already in flight
  const inFlightKey = `${key}_inflight`
  if (requestCache.has(inFlightKey)) {
    // Wait for existing request
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const cached = requestCache.get(key)
        if (cached && (now - cached.timestamp) < cached.ttl) {
          clearInterval(checkInterval)
          resolve(cached.data as T)
        }
      }, 100)
    })
  }

  // Mark as in flight
  requestCache.set(inFlightKey, { data: null, timestamp: now, ttl: 5000 })

  try {
    const data = await fetcher()
    // Cache the result
    requestCache.set(key, { data, timestamp: now, ttl })
    requestCache.delete(inFlightKey)
    return data
  } catch (error) {
    requestCache.delete(inFlightKey)
    throw error
  }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Clear cache for a specific key or all cache
 */
export function clearCache(key?: string) {
  if (key) {
    requestCache.delete(key)
  } else {
    requestCache.clear()
  }
}

/**
 * Generate Cloudinary optimized image URL
 */
export function getOptimizedImageUrl(
  url: string,
  width?: number,
  quality: 'auto' | 'low' | 'medium' | 'high' = 'auto'
): string {
  if (!url.includes('cloudinary.com')) {
    return url
  }

  const transformations: string[] = []
  if (width) {
    transformations.push(`w_${width}`)
  }
  transformations.push(`q_${quality}`)
  transformations.push('f_auto') // Auto format (WebP when supported)

  const insertIndex = url.indexOf('/upload/') + 8
  return url.slice(0, insertIndex) + transformations.join(',') + '/' + url.slice(insertIndex)
}

/**
 * Generate Cloudinary video thumbnail URL
 */
export function getVideoThumbnailUrl(url: string, width: number = 400, height: number = 300): string {
  if (!url.includes('cloudinary.com')) {
    return url
  }

  const transformations = `w_${width},h_${height},c_fill,q_auto:low,f_auto`
  const insertIndex = url.indexOf('/upload/') + 8
  return url.slice(0, insertIndex) + transformations + '/' + url.slice(insertIndex)
}

