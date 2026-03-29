'use client'
import { useState, useEffect } from 'react'
import { isBiometricAvailable, authenticateWithBiometrics } from '../services/native'

export function useBiometrics() {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    isBiometricAvailable().then(setAvailable)
  }, [])

  const authenticate = async (reason: string): Promise<boolean> => {
    if (!available) return true // skip if not available
    return authenticateWithBiometrics(reason)
  }

  return { available, authenticate }
}
