'use client'
import { useEffect } from 'react'
const CACHE_VERSION = '2026-03-19-v1'
const CACHE_VERSION_KEY = 'som_cache_version'
const OWN_CACHE_PREFIX = 'shot-on-me-'
export default function AppWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => { handleCacheVersion() }, [])
  return <>{children}</>
}
async function handleCacheVersion() {
  if (typeof window === 'undefined') return
  const stored = localStorage.getItem(CACHE_VERSION_KEY)
  if (stored === CACHE_VERSION) return
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      const ourCaches = cacheNames.filter(n => n.startsWith(OWN_CACHE_PREFIX) || n.startsWith('next-') || n.startsWith('workbox-'))
      await Promise.all(ourCaches.map(n => caches.delete(n)))
    }
  } catch (err) { console.warn('[AppWrapper] Cache clear failed:', err) }
  localStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION)
  window.location.reload()
}
