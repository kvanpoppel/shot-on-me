'use client'

import { ReactNode, useEffect } from 'react'
import ErrorBoundary from './ErrorBoundary'
import Providers from './Providers'
import { suppressNonCriticalWarnings, restoreConsole } from '../utils/consoleSuppress'

export default function AppWrapper({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Suppress non-critical console warnings in development
    if (process.env.NODE_ENV === 'development') {
      suppressNonCriticalWarnings()
    }

    // Cleanup on unmount
    return () => {
      if (process.env.NODE_ENV === 'development') {
        restoreConsole()
      }
    }
  }, [])

  return (
    <ErrorBoundary>
      <Providers>
        {children}
      </Providers>
    </ErrorBoundary>
  )
}

