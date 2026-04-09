'use client'
import { useEffect } from 'react'

const CACHE_VERSION = '2026-04-09-v1'
const CACHE_KEY = 'fizz_cache_version'

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(CACHE_KEY)
    if (stored === CACHE_VERSION) return
    try {
      if ('caches' in window) {
        caches.keys().then(names => {
          const ours = names.filter(n => n.startsWith('fizz-') || n.startsWith('next-') || n.startsWith('workbox-'))
          Promise.all(ours.map(n => caches.delete(n)))
        })
      }
    } catch { /* ignore */ }
    localStorage.setItem(CACHE_KEY, CACHE_VERSION)
    window.location.reload()
  }, [])
  return <>{children}</>
}
