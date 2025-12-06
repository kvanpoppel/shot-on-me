'use client'

import { ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import Providers from './Providers'

export default function AppWrapper({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <Providers>
        {children}
      </Providers>
    </ErrorBoundary>
  )
}

