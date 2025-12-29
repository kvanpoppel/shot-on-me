'use client'

import { useState, useRef } from 'react'
import { Upload, Image as ImageIcon, X, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { useApiUrl } from '../utils/api'

interface CustomCardDesignProps {
  onDesignUploaded?: () => void
}

export default function CustomCardDesign({ onDesignUploaded }: CustomCardDesignProps) {
  const { user, token } = useAuth()
  const API_URL = useApiUrl()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, etc.)')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.[0] || !token) {
      setError('Please select an image file')
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(false)

    try {
      const formData = new FormData()
      formData.append('image', fileInputRef.current.files[0])

      const response = await axios.post(`${API_URL}/card-designs/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      setSuccess(true)
      if (onDesignUploaded) {
        onDesignUploaded()
      }

      // Reset after 3 seconds
      setTimeout(() => {
        setSuccess(false)
        setPreview(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }, 3000)

    } catch (error: any) {
      console.error('Error uploading card design:', error)
      setError(error.response?.data?.message || 'Failed to upload card design. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!token) return

    try {
      await axios.delete(`${API_URL}/card-designs/my-design`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPreview(null)
      setSuccess(true)
      if (onDesignUploaded) {
        onDesignUploaded()
      }
    } catch (error: any) {
      console.error('Error removing design:', error)
      setError('Failed to remove design')
    }
  }

  return (
    <div className="bg-black/40 border border-primary-500/15 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <ImageIcon className="w-5 h-5 text-primary-500" />
        <h3 className="text-primary-500 font-semibold">Custom Card Design</h3>
      </div>

      <p className="text-primary-400/80 text-sm font-light mb-4">
        Upload your own image to personalize your Tap & Pay card. "Shot On Me" branding will be automatically added to ensure brand visibility.
      </p>

      {preview && (
        <div className="relative mb-4">
          <div className="relative w-full h-48 bg-black/60 rounded-lg overflow-hidden border border-primary-500/20">
            <img
              src={preview}
              alt="Card design preview"
              className="w-full h-full object-cover"
            />
            {/* Simulated "Shot On Me" branding overlay */}
            <div className="absolute bottom-2 right-2 bg-primary-500/90 text-black px-2 py-1 rounded text-xs font-bold">
              Shot On Me
            </div>
          </div>
          <p className="text-primary-400/60 text-xs mt-2 text-center">
            Preview: "Shot On Me" branding will appear in bottom-right corner
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-emerald-400 text-sm">Card design updated successfully!</p>
        </div>
      )}

      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="card-design-upload"
        />
        <label
          htmlFor="card-design-upload"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500/10 border border-primary-500/30 text-primary-500 rounded-lg font-medium hover:bg-primary-500/20 transition-colors cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span className="text-sm">Choose Image</span>
        </label>

        {preview && (
          <>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 text-black rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Uploading...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Apply Design</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                setPreview(null)
                if (fileInputRef.current) {
                  fileInputRef.current.value = ''
                }
              }}
              className="px-3 py-2.5 bg-black/40 border border-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      <p className="text-primary-400/50 text-xs font-light">
        Recommended: 672x424px image. Max 5MB. JPG, PNG, or WebP.
      </p>
    </div>
  )
}



