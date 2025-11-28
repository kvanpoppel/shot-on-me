# Multi-User/Team Support Implementation

## ✅ What Was Implemented

### 1. Database Model Updates
- **Venue Model**: Added `staff` array with:
  - `user`: Reference to User
  - `role`: 'owner', 'manager', or 'staff'
  - `addedAt`: Timestamp
  - `addedBy`: Who added them

### 2. Backend API Endpoints

#### Staff Management
- `GET /api/venues/:id/staff` - Get all staff members (including owner)
- `POST /api/venues/:id/staff` - Add staff member (owner only)
- `PUT /api/venues/:id/staff/:staffId` - Update staff role (owner only)
- `DELETE /api/venues/:id/staff/:staffId` - Remove staff member (owner only)

#### Access Control
- Created `venueAccess.js` utility with:
  - `checkVenueAccess()` - Check if user has access to venue
  - `getUserVenues()` - Get all venues user has access to

#### Updated Routes
- All venue routes now check staff access, not just ownership
- Promotions, schedules, and venue updates work for managers and staff
- Stripe Connect still requires owner access

### 3. Frontend Components

#### StaffManager Component
- View all team members
- Add new staff by email
- Update roles (promote/demote)
- Remove staff members
- Role-based UI (only owners see management options)

#### Updated Components
- **PromotionsManager**: Now works for staff members too
- **Settings Page**: Added StaffManager component

### 4. Role-Based Permissions

#### Owner
- Full access to everything
- Can add/remove staff
- Can manage Stripe connection
- Can update roles

#### Manager
- Can create/edit/delete promotions
- Can update schedules
- Can send notifications
- Can view analytics and redemptions
- Cannot manage staff or Stripe

#### Staff
- Can view promotions
- Can redeem codes (if implemented)
- Limited access to most features
- Cannot make changes

## 🎯 How It Works

### Adding Staff
1. Owner goes to Settings → Team Members
2. Clicks "Add" button
3. Enters staff member's email
4. Selects role (Manager or Staff)
5. Staff member must already have an account
6. They can now log in and access the venue

### Access Control Flow
1. User logs into venue portal
2. System checks if user is owner OR staff member
3. If yes, they see the dashboard
4. Permissions are checked per action (create promotion, etc.)

### Real-Time Updates
- All staff members see updates in real-time via Socket.io
- When one person creates a promotion, all others see it instantly

## 📋 Usage Examples

### Scenario 1: Small Venue
- **Kate (Owner)**: Full access, manages everything
- **Manager**: Handles day-to-day promotions
- **Bartender (Staff)**: Views promotions, redeems codes

### Scenario 2: Large Venue
- **Owner**: Oversees everything, manages Stripe
- **Day Manager**: Manages day shift promotions
- **Night Manager**: Manages night shift promotions
- **Multiple Staff**: View and redeem codes

## 🔒 Security

- Staff members can only access venues they're added to
- Role-based permissions enforced on backend
- Owners can't be removed or demoted
- Email must match existing user account

## 🚀 Next Steps (Optional Enhancements)

1. **Invite System**: Send email invites to non-registered users
2. **Activity Log**: Track who made what changes
3. **Permission Granularity**: More specific permissions (e.g., "can edit promotions but not delete")
4. **Multi-Venue Staff**: One person managing multiple venues
5. **Staff Notifications**: Notify staff when added/removed

## 📝 Notes

- Staff members must register first before being added
- Owner role is permanent (can't be changed)
- All changes are real-time via Socket.io
- Staff access works across all venue portal features

