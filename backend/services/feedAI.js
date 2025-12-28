/**
 * AI-powered feed optimization and personalization service
 * Provides intelligent feed ranking, content suggestions, and user engagement predictions
 */

const User = require('../models/User')
const FeedPost = require('../models/FeedPost')
const Venue = require('../models/Venue')

/**
 * Calculate relevance score for a post based on user behavior and preferences
 */
async function calculatePostRelevance(userId, post) {
  try {
    const user = await User.findById(userId).select('friends venueInteractions promotionPreferences')
    if (!user) return 0

    let score = 0

    // 1. Friend posts get higher priority (2x multiplier)
    const authorId = post.author?._id?.toString() || post.author?.toString()
    const isFriend = user.friends?.some(f => f.toString() === authorId) || authorId === userId
    if (isFriend) {
      score += 20
    }

    // 2. Recent posts get higher priority (time decay)
    const postAge = Date.now() - new Date(post.createdAt).getTime()
    const hoursAgo = postAge / (1000 * 60 * 60)
    if (hoursAgo < 1) score += 15
    else if (hoursAgo < 6) score += 10
    else if (hoursAgo < 24) score += 5
    else score += 1

    // 3. Venue interaction history (if user has checked in at this venue)
    if (post.checkIn?.venue || post.location?.venue) {
      const venueId = post.checkIn?.venue?._id || post.location?.venue?._id || post.checkIn?.venue || post.location?.venue
      const venueInteraction = user.venueInteractions?.find(
        vi => vi.venue?.toString() === venueId?.toString()
      )
      if (venueInteraction) {
        score += 10 + Math.min(venueInteraction.checkIns || 0, 5) // Cap at 5 bonus points
      }
    }

    // 4. Engagement signals (likes, comments, reactions)
    const engagementScore = (post.likes?.length || 0) * 0.5 +
                           (post.comments?.length || 0) * 1 +
                           (post.totalReactions || 0) * 0.3
    score += Math.min(engagementScore, 15) // Cap at 15 points

    // 5. Media content gets slight boost
    if (post.media && post.media.length > 0) {
      score += 3
    }

    // 6. Check-in posts get boost (more personal/social)
    if (post.checkIn) {
      score += 5
    }

    // 7. User's preferred venue types (if available)
    if (user.promotionPreferences?.preferredCategories && post.location?.venue) {
      // This would require venue category matching - simplified for now
      score += 2
    }

    return Math.round(score * 10) / 10 // Round to 1 decimal
  } catch (error) {
    console.error('Error calculating post relevance:', error)
    return 0
  }
}

/**
 * Rank and sort feed posts by relevance
 */
async function rankFeedPosts(userId, posts) {
  try {
    // Calculate relevance for each post
    const postsWithScores = await Promise.all(
      posts.map(async (post) => {
        const relevance = await calculatePostRelevance(userId, post)
        return { post, relevance }
      })
    )

    // Sort by relevance (descending), then by date (descending)
    postsWithScores.sort((a, b) => {
      if (Math.abs(a.relevance - b.relevance) > 1) {
        return b.relevance - a.relevance // Higher relevance first
      }
      // If relevance is similar, sort by date
      return new Date(b.post.createdAt).getTime() - new Date(a.post.createdAt).getTime()
    })

    return postsWithScores.map(item => item.post)
  } catch (error) {
    console.error('Error ranking feed posts:', error)
    // Fallback to original order
    return posts
  }
}

/**
 * Generate AI-powered content suggestions for creating posts
 */
async function generateContentSuggestions(userId, context = {}) {
  try {
    const user = await User.findById(userId).select('firstName venueInteractions')
    if (!user) return []

    const suggestions = []

    // 1. Check-in suggestions based on nearby venues or recent activity
    if (context.nearbyVenues && context.nearbyVenues.length > 0) {
      const topVenue = context.nearbyVenues[0]
      suggestions.push({
        type: 'checkin',
        text: `Check in at ${topVenue.name}?`,
        venueId: topVenue._id,
        priority: 8
      })
    }

    // 2. Time-based suggestions
    const hour = new Date().getHours()
    if (hour >= 17 && hour < 22) {
      suggestions.push({
        type: 'prompt',
        text: 'Share your evening plans! 🍻',
        priority: 5
      })
    } else if (hour >= 22 || hour < 2) {
      suggestions.push({
        type: 'prompt',
        text: 'What\'s happening tonight? 🌙',
        priority: 6
      })
    }

    // 3. Friend activity suggestions
    if (context.recentFriendActivity && context.recentFriendActivity.length > 0) {
      const friend = context.recentFriendActivity[0]
      suggestions.push({
        type: 'prompt',
        text: `${friend.name} just checked in nearby! Share your location?`,
        priority: 7
      })
    }

    // 4. Venue interaction suggestions
    if (user.venueInteractions && user.venueInteractions.length > 0) {
      const favoriteVenue = user.venueInteractions
        .sort((a, b) => (b.checkIns || 0) - (a.checkIns || 0))[0]
      
      if (favoriteVenue) {
        suggestions.push({
          type: 'prompt',
          text: `Back at your favorite spot? Check in!`,
          priority: 4
        })
      }
    }

    // Sort by priority and return top 3
    return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 3)
  } catch (error) {
    console.error('Error generating content suggestions:', error)
    return []
  }
}

/**
 * Predict user engagement likelihood for a post
 */
async function predictEngagement(userId, post) {
  try {
    const user = await User.findById(userId).select('friends venueInteractions')
    if (!user) return { likelihood: 0.5, factors: [] }

    const factors = []
    let likelihood = 0.5 // Base 50%

    // Friend post = higher engagement
    const authorId = post.author?._id?.toString() || post.author?.toString()
    const isFriend = user.friends?.some(f => f.toString() === authorId)
    if (isFriend) {
      likelihood += 0.2
      factors.push('Friend post')
    }

    // Venue match = higher engagement
    if (post.checkIn?.venue || post.location?.venue) {
      const venueId = post.checkIn?.venue?._id || post.location?.venue?._id
      const hasVenueHistory = user.venueInteractions?.some(
        vi => vi.venue?.toString() === venueId?.toString()
      )
      if (hasVenueHistory) {
        likelihood += 0.15
        factors.push('Venue match')
      }
    }

    // Recent post = higher engagement
    const hoursAgo = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60)
    if (hoursAgo < 1) {
      likelihood += 0.1
      factors.push('Recent post')
    }

    // High engagement = higher likelihood
    const totalEngagement = (post.likes?.length || 0) + (post.comments?.length || 0)
    if (totalEngagement > 10) {
      likelihood += 0.1
      factors.push('High engagement')
    }

    return {
      likelihood: Math.min(likelihood, 0.95), // Cap at 95%
      factors
    }
  } catch (error) {
    console.error('Error predicting engagement:', error)
    return { likelihood: 0.5, factors: [] }
  }
}

/**
 * Get personalized feed recommendations
 */
async function getPersonalizedFeed(userId, limit = 20) {
  try {
    const user = await User.findById(userId).select('friends venueInteractions')
    if (!user) return []

    // Get posts from friends and followed venues
    const friendIds = user.friends || []
    const query = friendIds.length > 0
      ? { author: { $in: [...friendIds, userId] } }
      : {}

    const posts = await FeedPost.find(query)
      .populate('author', 'firstName lastName profilePicture')
      .populate('checkIn.venue', 'name')
      .populate('location.venue', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 2) // Get more to filter/rank

    // Rank posts by relevance
    const rankedPosts = await rankFeedPosts(userId, posts)

    return rankedPosts.slice(0, limit)
  } catch (error) {
    console.error('Error getting personalized feed:', error)
    return []
  }
}

module.exports = {
  calculatePostRelevance,
  rankFeedPosts,
  generateContentSuggestions,
  predictEngagement,
  getPersonalizedFeed
}

