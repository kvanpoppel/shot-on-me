const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const feedAI = require('../services/feedAI')

/**
 * GET /api/feed-ai/rank
 * Rank feed posts by AI-calculated relevance
 */
router.post('/rank', auth, async (req, res) => {
  try {
    const { posts } = req.body
    if (!posts || !Array.isArray(posts)) {
      return res.status(400).json({ message: 'Posts array required' })
    }

    const rankedPosts = await feedAI.rankFeedPosts(req.user.userId, posts)
    res.json({ posts: rankedPosts })
  } catch (error) {
    console.error('Error ranking posts:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

/**
 * GET /api/feed-ai/suggestions
 * Get AI-powered content suggestions for creating posts
 */
router.get('/suggestions', auth, async (req, res) => {
  try {
    const { nearbyVenues, recentFriendActivity } = req.query
    const context = {
      nearbyVenues: nearbyVenues ? JSON.parse(nearbyVenues) : [],
      recentFriendActivity: recentFriendActivity ? JSON.parse(recentFriendActivity) : []
    }

    const suggestions = await feedAI.generateContentSuggestions(req.user.userId, context)
    res.json({ suggestions })
  } catch (error) {
    console.error('Error getting suggestions:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

/**
 * POST /api/feed-ai/predict-engagement
 * Predict user engagement likelihood for posts
 */
router.post('/predict-engagement', auth, async (req, res) => {
  try {
    const { posts } = req.body
    if (!posts || !Array.isArray(posts)) {
      return res.status(400).json({ message: 'Posts array required' })
    }

    const predictions = await Promise.all(
      posts.map(async (post) => {
        const prediction = await feedAI.predictEngagement(req.user.userId, post)
        return {
          postId: post._id,
          ...prediction
        }
      })
    )

    res.json({ predictions })
  } catch (error) {
    console.error('Error predicting engagement:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

/**
 * GET /api/feed-ai/personalized
 * Get fully personalized AI-ranked feed
 */
router.get('/personalized', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20
    const posts = await feedAI.getPersonalizedFeed(req.user.userId, limit)
    res.json({ posts })
  } catch (error) {
    console.error('Error getting personalized feed:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router

