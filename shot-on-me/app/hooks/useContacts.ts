'use client'
import { useState, useCallback } from 'react'
import { getContacts, NativeContact } from '../services/native'

export function useContacts() {
  const [contacts, setContacts] = useState<NativeContact[]>([])
  const [loading, setLoading] = useState(false)
  const [granted, setGranted] = useState(false)

  const loadContacts = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getContacts()
      setContacts(result)
      setGranted(result.length >= 0)
    } finally {
      setLoading(false)
    }
  }, [])

  const searchContacts = useCallback((query: string) => {
    if (!query.trim()) return contacts
    const q = query.toLowerCase()
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    )
  }, [contacts])

  return { contacts, loading, granted, loadContacts, searchContacts }
}
