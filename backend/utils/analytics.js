// Basic analytics tracking
// In production, integrate with Google Analytics, Mixpanel, or similar

const analytics = {
  // Track user actions
  track: (event, properties = {}) => {
    const eventData = {
      timestamp: new Date().toISOString(),
      event,
      properties,
      environment: process.env.NODE_ENV || 'development'
    };

    // In development, just log
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics:', JSON.stringify(eventData, null, 2));
    } else {
      // In production, send to analytics service
      // Example: mixpanel.track(event, properties);
      // Example: analytics.track(event, properties);
    }
  },

  // Track API usage
  trackAPI: (endpoint, method, userId, duration, statusCode) => {
    analytics.track('api_request', {
      endpoint,
      method,
      userId: userId || 'anonymous',
      duration,
      statusCode,
      success: statusCode < 400
    });
  },

  // Track user registration
  trackRegistration: (userId, userType) => {
    analytics.track('user_registered', {
      userId,
      userType
    });
  },

  // Track check-ins
  trackCheckIn: (userId, venueId, pointsEarned) => {
    analytics.track('check_in', {
      userId,
      venueId,
      pointsEarned
    });
  },

  // Track payments
  trackPayment: (userId, amount, type, success) => {
    analytics.track('payment', {
      userId,
      amount,
      type,
      success
    });
  },

  // Track venue actions
  trackVenueAction: (venueId, action, userId) => {
    analytics.track('venue_action', {
      venueId,
      action,
      userId: userId || 'anonymous'
    });
  }
};

module.exports = analytics;


