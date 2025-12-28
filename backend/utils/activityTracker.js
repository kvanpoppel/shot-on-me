const User = require('../models/User');

/**
 * Calculate user status based on lastSeen timestamp
 * @param {Date} lastSeen - Last seen timestamp
 * @returns {string} - 'online', 'away', or 'offline'
 */
function calculateStatus(lastSeen) {
  if (!lastSeen) return 'offline';
  
  const now = new Date();
  const diffMs = now - new Date(lastSeen);
  const diffMinutes = diffMs / (1000 * 60);
  
  if (diffMinutes <= 5) {
    return 'online';
  } else if (diffMinutes <= 30) {
    return 'away';
  } else {
    return 'offline';
  }
}

/**
 * Update user's lastSeen timestamp and status
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Updated user with status
 */
async function updateUserActivity(userId) {
  try {
    const now = new Date();
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        lastSeen: now,
        status: 'online' // Set to online when activity is detected
      },
      { new: true }
    );
    
    if (user) {
      // Recalculate status based on lastSeen (in case it was updated elsewhere)
      const calculatedStatus = calculateStatus(user.lastSeen);
      if (user.status !== calculatedStatus) {
        user.status = calculatedStatus;
        await user.save();
      }
    }
    
    return user;
  } catch (error) {
    console.error('Error updating user activity:', error);
    return null;
  }
}

/**
 * Get user status (online/away/offline)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User status info
 */
async function getUserStatus(userId) {
  try {
    const user = await User.findById(userId).select('lastSeen status');
    if (!user) {
      return { status: 'offline', lastSeen: null };
    }
    
    // Recalculate status if needed
    const calculatedStatus = calculateStatus(user.lastSeen);
    if (user.status !== calculatedStatus) {
      user.status = calculatedStatus;
      await user.save();
    }
    
    return {
      status: user.status,
      lastSeen: user.lastSeen
    };
  } catch (error) {
    console.error('Error getting user status:', error);
    return { status: 'offline', lastSeen: null };
  }
}

/**
 * Middleware to track user activity on authenticated requests
 */
function trackActivity(req, res, next) {
  if (req.user && req.user.userId) {
    // Update activity asynchronously (don't block request)
    updateUserActivity(req.user.userId).catch(err => {
      console.error('Failed to update activity:', err);
    });
  }
  next();
}

module.exports = {
  calculateStatus,
  updateUserActivity,
  getUserStatus,
  trackActivity
};

