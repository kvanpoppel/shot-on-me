import Venue from '../models/Venue.js';

/**
 * Check if a user has access to a venue (as owner or staff)
 * @param {Object} user - The user object
 * @param {String} venueId - The venue ID
 * @param {String} requiredRole - Optional: 'owner', 'manager', or 'staff'
 * @returns {Object} { hasAccess: boolean, role: string, venue: Object }
 */
export async function checkVenueAccess(user, venueId, requiredRole = null) {
  try {
    const venue = await Venue.findById(venueId).populate('staff.user', 'firstName lastName email userType');
    
    if (!venue) {
      console.log(`❌ Venue not found: ${venueId}`);
      return { hasAccess: false, role: null, venue: null };
    }

    const venueOwnerId = venue.owner.toString();
    const userId = user._id.toString();
    
    console.log(`Checking access: User ${userId} (${user.email}) for Venue ${venueId}`);
    console.log(`Venue owner: ${venueOwnerId}, Required role: ${requiredRole || 'any'}`);

    // Check if user is the owner
    if (venueOwnerId === userId) {
      console.log(`✅ User is owner of venue`);
      if (!requiredRole || requiredRole === 'owner') {
        return { hasAccess: true, role: 'owner', venue };
      }
      // Owner has all permissions, so even if requiredRole is 'manager' or 'staff', owner should have access
      return { hasAccess: true, role: 'owner', venue };
    }

    // Check if user is admin
    if (user.userType === 'admin') {
      return { hasAccess: true, role: 'admin', venue };
    }

    // Check if user is staff
    const staffMember = venue.staff.find(
      s => s.user._id.toString() === user._id.toString()
    );

    if (staffMember) {
      const userRole = staffMember.role;
      console.log(`✅ User is staff with role: ${userRole}`);
      
      // Check role requirements
      if (requiredRole) {
        const roleHierarchy = { owner: 3, manager: 2, staff: 1 };
        if (roleHierarchy[userRole] >= roleHierarchy[requiredRole]) {
          return { hasAccess: true, role: userRole, venue };
        }
        console.log(`❌ User role ${userRole} insufficient for required role ${requiredRole}`);
        return { hasAccess: false, role: userRole, venue };
      }
      
      return { hasAccess: true, role: userRole, venue };
    }

    console.log(`❌ User ${userId} has no access to venue ${venueId}`);
    return { hasAccess: false, role: null, venue };
  } catch (error) {
    console.error('Error checking venue access:', error);
    return { hasAccess: false, role: null, venue: null };
  }
}

/**
 * Get all venues a user has access to (as owner or staff)
 * @param {Object} user - The user object
 * @returns {Array} Array of venues with access info
 */
export async function getUserVenues(user) {
  try {
    // Get venues where user is owner
    const ownedVenues = await Venue.find({ owner: user._id, isActive: true })
      .populate('owner', 'firstName lastName email')
      .select('-promotions -schedule');

    // Get venues where user is staff
    const staffVenues = await Venue.find({
      'staff.user': user._id,
      isActive: true
    })
      .populate('owner', 'firstName lastName email')
      .populate('staff.user', 'firstName lastName email')
      .select('-promotions -schedule');

    // Combine and add role info
    const allVenues = [
      ...ownedVenues.map(v => ({ venue: v, role: 'owner' })),
      ...staffVenues.map(v => {
        const staffMember = v.staff.find(s => s.user._id.toString() === user._id.toString());
        return { venue: v, role: staffMember?.role || 'staff' };
      })
    ];

    return allVenues;
  } catch (error) {
    console.error('Error getting user venues:', error);
    return [];
  }
}

