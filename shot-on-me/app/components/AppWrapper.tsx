'use client'
import { useEffect } from 'react'

const CACHE_VERSION = '2026-03-19-v1'
const CACHE_VERSION_KEY = 'som_cache_version'
const OWN_CACHE_PREFIX = 'shot-on-me-'

// Sparse ambient bubbles — fewer + more transparent than login page so they feel atmospheric, not loud
const AMBIENT_BUBBLES = [
  { size: 6,  left: 5,  delay: -3,    duration: 14 },
  { size: 10, left: 14, delay: -8,    duration: 18 },
  { size: 5,  left: 24, delay: -1.5,  duration: 12 },
  { size: 8,  left: 35, delay: -11,   duration: 16 },
  { size: 4,  left: 47, delay: -5,    duration: 13 },
  { size: 9,  left: 58, delay: -7.5,  duration: 17 },
  { size: 6,  left: 68, delay: -2,    duration: 14 },
  { size: 11, left: 77, delay: -9,    duration: 19 },
  { size: 5,  left: 87, delay: -4,    duration: 12 },
  { size: 7,  left: 94, delay: -13,   duration: 15 },
]

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => { handleCacheVersion() }, [])
  return (
    <>
      {/* Ambient rising bubbles — shown app-wide behind all screens */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
        {AMBIENT_BUBBLES.map((b, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: b.size,
              height: b.size,
              left: `${b.left}%`,
              bottom: '-20px',
              background: 'radial-gradient(circle at 35% 35%, rgba(184,148,90,0.25), rgba(184,148,90,0.03))',
              border: '1px solid rgba(184,148,90,0.12)',
              animationName: 'bubble-rise',
              animationDuration: `${b.duration}s`,
              animationDelay: `${b.delay}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              animationFillMode: 'both',
            }}
          />
        ))}
        {/* Soft ambient glow pools */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-primary-500/5 blur-[100px]" />
        <div className="absolute bottom-1/4 -left-20 w-56 h-56 rounded-full bg-primary-500/4 blur-[70px]" />
        <div className="absolute top-1/3 -right-16 w-48 h-48 rounded-full bg-primary-500/4 blur-[70px]" />
      </div>
      {children}
    </>
  )
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
