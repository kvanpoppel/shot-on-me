'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { UserPlus, Trash2, Shield, User, Crown, X } from 'lucide-react'
import { getApiUrl } from '../utils/api'

interface StaffMember {
  _id: string
  user: {
    _id: string
    firstName: string
    lastName: string
    email: string
  }
  role: 'owner' | 'manager' | 'staff'
  addedAt: string
  addedBy?: {
    firstName: string
    lastName: string
  }
}

export default function StaffManager() {
  const { token, user } = useAuth()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [venueId, setVenueId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [adding, setAdding] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'manager' | 'staff'>('staff')
  const [userRole, setUserRole] = useState<'owner' | 'manager' | 'staff' | null>(null)

  useEffect(() => {
    fetchVenueAndStaff()
  }, [token, user])

  const fetchVenueAndStaff = async () => {
    if (!token || !user) return
    setLoading(true)
    try {
      // Get user's venues
      const apiUrl = getApiUrl()
      const venuesResponse = await axios.get(`${apiUrl}/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Handle both response formats: { venues: [...] } or direct array
      let venues: any[] = []
      if (Array.isArray(venuesResponse.data)) {
        venues = venuesResponse.data
      } else if (venuesResponse.data?.venues) {
        venues = venuesResponse.data.venues
      }
      
      // Find venue owned by current user or where user is staff
      // Improved venue matching: handle both populated owner object and owner ID string
      const myVenue = venues.find((v: any) => {
        const ownerId = v.owner?._id?.toString() || v.owner?.toString() || v.owner
        const userId = user.id?.toString()
        const isOwner = ownerId === userId
        
        // Check if user is staff
        const isStaff = v.staff?.some((s: any) => {
          const staffUserId = s.user?._id?.toString() || s.user?.toString() || s.user
          return staffUserId === userId
        })
        
        return isOwner || isStaff
      })

      if (myVenue) {
        setVenueId(myVenue._id?.toString() || myVenue._id)
        
        // Determine user's role
        const ownerId = myVenue.owner?._id?.toString() || myVenue.owner?.toString() || myVenue.owner
        const userId = user.id?.toString()
        if (ownerId === userId) {
          setUserRole('owner')
        } else {
          const staffMember = myVenue.staff?.find((s: any) => {
            const staffUserId = s.user?._id?.toString() || s.user?.toString() || s.user
            return staffUserId === userId
          })
          setUserRole(staffMember?.role || 'staff')
        }

        // Fetch staff list
        const staffResponse = await axios.get(`${getApiUrl()}/venues/${myVenue._id}/staff`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setStaff(staffResponse.data.staff || [])
      }
    } catch (error) {
      console.error('Failed to fetch venue/staff:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!venueId || !token || !email) return

    setAdding(true)
    try {
      await axios.post(
        `${getApiUrl()}/venues/${venueId}/staff`,
        { email, role },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setEmail('')
      setRole('staff')
      setShowAddForm(false)
      fetchVenueAndStaff()
      alert('Staff member added successfully!')
    } catch (error: any) {
      console.error('Failed to add staff:', error)
      alert(error.response?.data?.error || 'Failed to add staff member')
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveStaff = async (staffId: string) => {
    if (!venueId || !token) return
    if (!confirm('Are you sure you want to remove this staff member?')) return

    try {
      await axios.delete(
        `${getApiUrl()}/venues/${venueId}/staff/${staffId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchVenueAndStaff()
      alert('Staff member removed successfully!')
    } catch (error: any) {
      console.error('Failed to remove staff:', error)
      alert(error.response?.data?.error || 'Failed to remove staff member')
    }
  }

  const handleUpdateRole = async (staffId: string, newRole: 'manager' | 'staff') => {
    if (!venueId || !token) return

    try {
      await axios.put(
        `${getApiUrl()}/venues/${venueId}/staff/${staffId}`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchVenueAndStaff()
      alert('Staff role updated successfully!')
    } catch (error: any) {
      console.error('Failed to update role:', error)
      alert(error.response?.data?.error || 'Failed to update staff role')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-primary-500" />
      case 'manager':
        return <Shield className="w-4 h-4 text-primary-400" />
      default:
        return <User className="w-4 h-4 text-primary-400" />
    }
  }

  if (loading) {
    return (
      <div className="bg-black border border-primary-500/30 rounded-lg p-3">
        <div className="text-center py-4 text-primary-400 text-xs">Loading staff...</div>
      </div>
    )
  }

  if (!venueId) {
    return (
      <div className="bg-black border border-primary-500/30 rounded-lg p-3">
        <div className="text-center py-4 text-primary-400 text-xs">
          <p>No venue found</p>
        </div>
      </div>
    )
  }

  const isOwner = userRole === 'owner'

  return (
    <div className="bg-black border border-primary-500/30 rounded-lg p-3">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-1.5">
          <UserPlus className="w-4 h-4 text-primary-500" />
          <h2 className="text-base font-semibold text-primary-500">Team Members</h2>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center space-x-1 bg-primary-500 text-black px-2 py-1 rounded hover:bg-primary-600 transition-colors font-semibold text-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        )}
      </div>

      {showAddForm && isOwner && (
        <form onSubmit={handleAddStaff} className="mb-3 p-2 bg-black border border-primary-500/30 rounded space-y-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-primary-500">Add Staff Member</h3>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setEmail('')
              }}
              className="text-primary-400 hover:text-primary-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div>
            <label className="block text-xs font-medium text-primary-500 mb-0.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-2 py-1.5 bg-black border border-primary-500/30 rounded text-primary-500 placeholder-primary-600 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-xs"
              placeholder="staff@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-primary-500 mb-0.5">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'manager' | 'staff')}
              className="w-full px-2 py-1.5 bg-black border border-primary-500/30 rounded text-primary-500 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-xs"
            >
              <option value="staff" className="bg-black text-primary-500">Staff</option>
              <option value="manager" className="bg-black text-primary-500">Manager</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={adding}
            className="w-full bg-primary-500 text-black py-1.5 rounded font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
          >
            {adding ? 'Adding...' : 'Add Staff Member'}
          </button>
        </form>
      )}

      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {staff.length === 0 ? (
          <div className="text-center py-4 text-primary-400 text-xs">
            <p>No staff members yet</p>
            {isOwner && <p className="mt-1">Add your first team member above</p>}
          </div>
        ) : (
          staff.map((member) => (
            <div
              key={member._id}
              className="bg-black border border-primary-500/20 rounded p-2 hover:border-primary-500/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  {getRoleIcon(member.role)}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-primary-500 text-xs truncate">
                      {member.user.firstName} {member.user.lastName}
                    </p>
                    <p className="text-primary-400 text-xs truncate">{member.user.email}</p>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="capitalize bg-primary-500/20 text-primary-500 px-1.5 py-0.5 rounded text-xs">
                        {member.role}
                      </span>
                      {member.role === 'owner' && (
                        <span className="text-primary-500/60 text-xs">Owner</span>
                      )}
                    </div>
                  </div>
                </div>
                {isOwner && member.role !== 'owner' && (
                  <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                    {member.role === 'staff' ? (
                      <button
                        onClick={() => handleUpdateRole(member._id, 'manager')}
                        className="p-1 text-primary-400 hover:text-primary-500 hover:bg-primary-500/10 rounded transition-colors"
                        title="Promote to Manager"
                      >
                        <Shield className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateRole(member._id, 'staff')}
                        className="p-1 text-primary-400 hover:text-primary-500 hover:bg-primary-500/10 rounded transition-colors"
                        title="Demote to Staff"
                      >
                        <User className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveStaff(member._id)}
                      className="p-1 text-primary-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      title="Remove staff member"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

