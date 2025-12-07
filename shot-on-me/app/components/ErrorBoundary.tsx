'use client'

import React, { Component, ReactNode } from 'react'
import { X, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ ErrorBoundary caught an error:', error)
    console.error('Error message:', error.message)
    console.error('Error name:', error.name)
    console.error('Error stack:', error.stack)
    console.error('Component stack:', errorInfo.componentStack)
    
    // Log to console with more detail for mobile debugging
    if (typeof window !== 'undefined') {
      console.error('Full error object:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      })
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4">
          <div className="bg-black border-2 border-red-500 rounded-lg p-6 max-w-md w-full text-center">
            <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-500 mb-2">Application Error</h2>
            <p className="text-primary-400 text-sm mb-2">
              {this.state.error?.message || 'A client-side exception has occurred'}
            </p>
            {this.state.error?.stack && (
              <details className="text-left mt-4 mb-4">
                <summary className="text-primary-500 text-xs cursor-pointer mb-2">Error Details</summary>
                <pre className="text-xs text-primary-400 overflow-auto max-h-32 bg-black/50 p-2 rounded">
                  {this.state.error.stack.substring(0, 500)}
                </pre>
              </details>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="bg-primary-500 text-black px-6 py-2 rounded-lg font-semibold hover:bg-primary-600 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    // Clear service worker cache and reload
                    if ('serviceWorker' in navigator) {
                      navigator.serviceWorker.getRegistrations().then(registrations => {
                        registrations.forEach(registration => registration.unregister())
                      })
                    }
                    // Clear all caches
                    if ('caches' in window) {
                      caches.keys().then(names => {
                        names.forEach(name => caches.delete(name))
                      })
                    }
                    window.location.reload()
                  }
                }}
                className="bg-black border border-primary-500 text-primary-500 px-6 py-2 rounded-lg font-semibold hover:bg-primary-500/10 flex items-center justify-center gap-2"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

