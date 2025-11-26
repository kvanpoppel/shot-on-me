'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { X, Camera, CreditCard, Settings, User, Shield } from 'lucide-react'
import SecureCardElement from './CardElement'
import PermissionsManager from './PermissionsManager'

import { useApiUrl } from '../utils/api'

interface SettingsMenuProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsMenu({ isOpen, onClose }: SettingsMenuProps) {
  const { user, token, updateUser } = useAuth()
  const API_URL = useApiUrl()
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showCreditCard, setShowCreditCard] = useState(false)
  const [showPermissions, setShowPermissions] = useState(false)
  const [firstName, setFirstName] = useState(user?.firstName || '')
  const [lastName, setLastName] = useState(user?.lastName || '')
  const [saving, setSaving] = useState(false)
  const [locationVisible, setLocationVisible] = useState((user as any)?.location?.isVisible ?? true)

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '')
      setLastName(user.lastName || '')
      setLocationVisible((user as any).location?.isVisible ?? true)
    }
  }, [user])

  const handleProfilePicture = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (file) {
        try {
          const reader = new FileReader()
          reader.onloadend = async () => {
            try {
              const base64String = reader.result as string
              const response = await axios.put(
                `${API_URL}/users/me/profile-picture`,
                { profilePicture: base64String },
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                }
              )
              await updateUser({ profilePicture: response.data.profilePicture })
              alert('Profile picture updated!')
            } catch (error: any) {
              alert(error.response?.data?.error || 'Failed to update profile picture')
            }
          }
          reader.readAsDataURL(file)
        } catch (error: any) {
          alert(error.response?.data?.error || 'Failed to update profile picture')
        }
      }
    }
    input.click()
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)

    try {
      await axios.put(
        `${API_URL}/users/me`,
        { firstName, lastName },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      await updateUser({ firstName, lastName })
      alert('Profile updated successfully!')
      setShowEditProfile(false)
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleAddCreditCardSecure = async (paymentMethodId: string) => {
    if (!token) return
    setSaving(true)

    try {
      await axios.post(
        `${API_URL}/payments/add-payment-method`,
        { paymentMethodId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setShowCreditCard(false)
      alert('Credit card added successfully!')
      if (updateUser) {
        await updateUser({})
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to add credit card'
      alert(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  const handleAddCreditCardError = (error: string) => {
    alert(error)
    setSaving(false)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-black/95 border border-primary-500/20 rounded-lg p-6 max-w-md w-full backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary-500 tracking-tight">Edit Profile</h3>
              <button
                onClick={() => setShowEditProfile(false)}
                className="text-primary-400/70 hover:text-primary-500 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-primary-500 text-sm font-medium mb-1 tracking-tight">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 placeholder-primary-500/40 focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/30 backdrop-blur-sm font-light"
                />
              </div>
              <div>
                <label className="block text-primary-500 text-sm font-medium mb-1 tracking-tight">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 placeholder-primary-500/40 focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/30 backdrop-blur-sm font-light"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-primary-500 text-black py-2.5 rounded-lg font-medium hover:bg-primary-600 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditProfile(false)}
                  className="flex-1 bg-black/40 border border-primary-500/20 text-primary-500 py-2.5 rounded-lg font-medium hover:bg-primary-500/10 transition-all backdrop-blur-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Credit Card Modal */}
      {showCreditCard && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-black/95 border border-primary-500/20 rounded-lg p-6 max-w-md w-full backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary-500 tracking-tight">Add Credit Card</h3>
              <button
                onClick={() => {
                  setShowCreditCard(false)
                  setSaving(false)
                }}
                className="text-primary-400/70 hover:text-primary-500 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <SecureCardElement
                onSuccess={handleAddCreditCardSecure}
                onError={handleAddCreditCardError}
                disabled={saving}
              />
              <button
                type="button"
                onClick={() => {
                  setShowCreditCard(false)
                  setSaving(false)
                }}
                className="w-full bg-black/40 border border-primary-500/20 text-primary-500 py-2.5 rounded-lg font-medium hover:bg-primary-500/10 transition-all backdrop-blur-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Options */}
      <div className="fixed inset-0 bg-black/80 z-[55]" onClick={onClose} />
      <div className="fixed left-0 top-0 bottom-0 w-80 bg-black/95 backdrop-blur-md border-r border-primary-500/10 z-[55] overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-primary-500 tracking-tight">Settings</h2>
            <button
              onClick={onClose}
              className="p-2 text-primary-400/70 hover:text-primary-500 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setShowEditProfile(true)}
              className="w-full flex items-center space-x-3 px-4 py-2.5 text-left text-primary-400/80 hover:bg-primary-500/10 hover:text-primary-500 rounded-lg transition-all font-light"
            >
              <User className="w-5 h-5" />
              <span>Edit Profile</span>
            </button>

            <button
              onClick={handleProfilePicture}
              className="w-full flex items-center space-x-3 px-4 py-2.5 text-left text-primary-400/80 hover:bg-primary-500/10 hover:text-primary-500 rounded-lg transition-all font-light"
            >
              <Camera className="w-5 h-5" />
              <span>Change Profile Picture</span>
            </button>

            <button
              onClick={() => setShowCreditCard(true)}
              className="w-full flex items-center space-x-3 px-4 py-2.5 text-left text-primary-400/80 hover:bg-primary-500/10 hover:text-primary-500 rounded-lg transition-all font-light"
            >
              <CreditCard className="w-5 h-5" />
              <span>Add Credit Card</span>
            </button>

            <button
              onClick={() => setShowPermissions(true)}
              className="w-full flex items-center space-x-3 px-4 py-2.5 text-left text-primary-400/80 hover:bg-primary-500/10 hover:text-primary-500 rounded-lg transition-all font-light"
            >
              <Shield className="w-5 h-5" />
              <span>App Permissions</span>
            </button>

            <button
              onClick={() => alert('Notifications settings coming soon!')}
              className="w-full flex items-center space-x-3 px-4 py-2.5 text-left text-primary-400/80 hover:bg-primary-500/10 hover:text-primary-500 rounded-lg transition-all font-light"
            >
              <Settings className="w-5 h-5" />
              <span>Notification Settings</span>
            </button>
          </div>

          {/* Location Sharing Toggle */}
          <div className="mt-6 pt-6 border-t border-primary-500/10">
            <h3 className="text-sm font-semibold text-primary-500 mb-3 tracking-tight">Location Sharing</h3>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 bg-black/40 border border-primary-500/15 rounded-lg backdrop-blur-sm cursor-pointer hover:bg-black/50 transition-all">
                <div>
                  <p className="text-sm font-medium text-primary-500">Share Location with Friends</p>
                  <p className="text-xs text-primary-400/70 font-light">Let friends see where you are</p>
                </div>
                <input
                  type="checkbox"
                  checked={locationVisible}
                  onChange={async (e) => {
                    if (!token) return
                    const newVisibility = e.target.checked
                    setLocationVisible(newVisibility)
                    try {
                      // Only update if user has location
                      if ((user as any)?.location?.latitude && (user as any)?.location?.longitude) {
                        await axios.put(
                          `${API_URL}/location/update`,
                          { 
                            latitude: (user as any).location.latitude,
                            longitude: (user as any).location.longitude,
                            isVisible: newVisibility
                          },
                          { headers: { Authorization: `Bearer ${token}` } }
                        )
                        if (updateUser) {
                          await updateUser({ location: { ...(user as any).location, isVisible: newVisibility } } as any)
                        }
                      }
                    } catch (error) {
                      console.error('Failed to update location visibility:', error)
                      setLocationVisible(!newVisibility) // Revert on error
                    }
                  }}
                  className="w-5 h-5 border-primary-500/30 text-primary-500 focus:ring-primary-500 bg-black/40 rounded"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Permissions Manager */}
      {showPermissions && (
        <PermissionsManager 
          showOnMount={true}
          onComplete={() => setShowPermissions(false)}
        />
      )}
    </>
  )
}

