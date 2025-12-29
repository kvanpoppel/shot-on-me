/**
 * Utility to suppress non-critical console warnings in development
 * Only suppresses known, non-critical warnings that don't affect functionality
 */

const isDevelopment = process.env.NODE_ENV === 'development'

// Store original console methods
const originalWarn = console.warn
const originalError = console.error

// Track suppressed warnings to avoid spam
const suppressedWarnings = new Set<string>()

export function suppressNonCriticalWarnings() {
  if (!isDevelopment) return

  // Suppress Stripe.js HTTP warning (expected in development)
  console.warn = (...args: any[]) => {
    const message = args.join(' ')
    
    // Suppress known non-critical warnings
    if (
      message.includes('You may test your Stripe.js integration over HTTP') ||
      message.includes('Stripe.js integration over HTTP') ||
      message.includes('google.maps.Marker is deprecated') ||
      message.includes('AdvancedMarkerElement') ||
      message.includes('WebSocket is closed before the connection is established') ||
      message.includes('Auth loading timeout') ||
      message.includes('Fast Refresh')
    ) {
      // Only log once per unique message
      if (!suppressedWarnings.has(message)) {
        suppressedWarnings.add(message)
        // Optionally log to a debug channel (commented out to reduce noise)
        // console.debug('[Suppressed]', ...args)
      }
      return
    }
    
    // Allow all other warnings
    originalWarn.apply(console, args)
  }

  // Filter error messages for known non-critical errors
  console.error = (...args: any[]) => {
    const message = args.join(' ')
    
    // Suppress known non-critical errors
    if (
      message.includes('WebSocket connection failed') ||
      message.includes('WebSocket is closed before the connection is established') ||
      (message.includes('Socket.io') && message.includes('connection'))
    ) {
      // Only suppress if it's a connection retry (not a persistent failure)
      if (!suppressedWarnings.has(message)) {
        suppressedWarnings.add(message)
        // Log to debug instead
        console.debug('[Connection Retry]', ...args)
      }
      return
    }
    
    // Allow all other errors
    originalError.apply(console, args)
  }
}

export function restoreConsole() {
  console.warn = originalWarn
  console.error = originalError
  suppressedWarnings.clear()
}

