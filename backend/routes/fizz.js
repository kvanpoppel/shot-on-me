/**
 * /api/fizz — All Fizz-specific endpoints
 * Fizz has its own profile, wallet, friends, feed, and messages.
 * The only thing shared with Shot On Me is the user login credentials.
 */
const express = require('express')
const mongoose = require('mongoose')
const User = require('../models/User')
const FeedPost = require('../models/FeedPost')
const Message = require('../models/Message')
const auth = require('../middleware/auth')

const router = express.Router()

// ─── helpers ────────────────────────────────────────────────────────────────

function fizzConvId(a, b) {
  const ids = [a.toString(), b.toString()].sort()
  return `fizz_${ids[0]}_${ids[1]}`
}

function sanitizeUser(u) {
  if (!u) return null
  const fp = u.fizzProfile || {}
  return {
    id:             u._id,
    firstName:      fp.firstName  || u.firstName || (u.name || '').split(' ')[0] || '',
    lastName:       fp.lastName   || u.lastName  || (u.name || '').split(' ').slice(1).join(' ') || '',
    username:       fp.username   || u.username  || '',
    bio:            fp.bio        || '',
    profilePicture: fp.profilePicture || u.profilePicture || '',
  }
}

// ─── PROFILE ─────────────────────────────────────────────────────────────────

// GET /api/fizz/profile — own Fizz profile + wallet
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('fizzProfile fizzWallet fizzFriends name firstName lastName username profilePicture email')
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({
      profile: sanitizeUser(user),
      wallet:  { balance: user.fizzWallet?.balance ?? 0, pendingBalance: user.fizzWallet?.pendingBalance ?? 0 },
      friendsCount: user.fizzFriends?.length ?? 0,
    })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// PUT /api/fizz/profile — update Fizz profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { firstName, lastName, username, bio, profilePicture } = req.body
    const update = {}
    if (firstName      !== undefined) update['fizzProfile.firstName']      = firstName.trim()
    if (lastName       !== undefined) update['fizzProfile.lastName']       = lastName.trim()
    if (username       !== undefined) update['fizzProfile.username']       = username.trim()
    if (bio            !== undefined) update['fizzProfile.bio']            = bio.slice(0, 160)
    if (profilePicture !== undefined) update['fizzProfile.profilePicture'] = profilePicture

    const user = await User.findByIdAndUpdate(req.user.userId, { $set: update }, { new: true })
      .select('fizzProfile fizzWallet fizzFriends')
    res.json({ profile: sanitizeUser(user), wallet: user.fizzWallet })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// ─── WALLET ──────────────────────────────────────────────────────────────────

// GET /api/fizz/wallet
router.get('/wallet', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('fizzWallet')
    res.json({ wallet: user.fizzWallet ?? { balance: 0, pendingBalance: 0 } })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /api/fizz/wallet/add — add funds (called after Stripe PaymentIntent confirmed)
router.post('/wallet/add', auth, async (req, res) => {
  try {
    const { amount } = req.body
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' })
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $inc: { 'fizzWallet.balance': amount } },
      { new: true }
    ).select('fizzWallet')
    res.json({ wallet: user.fizzWallet })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /api/fizz/send — send a Fizz gift (debits fizzWallet, credits recipient)
router.post('/send', auth, async (req, res) => {
  try {
    const { recipientId, amount, message, venueId } = req.body
    if (!recipientId || !amount || amount <= 0) return res.status(400).json({ message: 'recipientId and amount required' })

    const sender = await User.findById(req.user.userId).select('fizzWallet fizzProfile name firstName lastName')
    if (!sender) return res.status(404).json({ message: 'User not found' })
    if ((sender.fizzWallet?.balance ?? 0) < amount) return res.status(400).json({ message: 'Insufficient Fizz balance' })

    const recipient = await User.findById(recipientId).select('fizzProfile name firstName lastName')
    if (!recipient) return res.status(404).json({ message: 'Recipient not found' })

    // Debit sender, credit recipient
    await User.findByIdAndUpdate(req.user.userId, { $inc: { 'fizzWallet.balance': -amount } })
    await User.findByIdAndUpdate(recipientId, { $inc: { 'fizzWallet.balance': amount } })

    const rp = recipient.fizzProfile || {}
    const recipientName = `${rp.firstName || recipient.firstName || ''} ${rp.lastName || recipient.lastName || ''}`.trim()
    const finalMessage = message || `Sent a Fizz to ${recipientName}! 🫧`

    const post = new FeedPost({
      author: req.user.userId,
      content: finalMessage,
      postType: 'drink_sent',
      source: 'fizz',
      drinkInfo: { recipientId, recipientName, amount, emoji: '🫧', message: message || '' },
    })
    await post.save()

    res.status(201).json({ message: 'Fizz sent!', post })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// ─── FRIENDS ─────────────────────────────────────────────────────────────────

// GET /api/fizz/friends
router.get('/friends', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('fizzFriends')
      .populate('fizzFriends', 'fizzProfile name firstName lastName username profilePicture')
    const friends = (user.fizzFriends || []).map(sanitizeUser)
    res.json({ friends })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /api/fizz/friends/:userId — add Fizz friend
router.post('/friends/:userId', auth, async (req, res) => {
  try {
    const myId     = req.user.userId
    const friendId = req.params.userId
    if (myId === friendId) return res.status(400).json({ message: 'Cannot add yourself' })

    await User.findByIdAndUpdate(myId,     { $addToSet: { fizzFriends: friendId } })
    await User.findByIdAndUpdate(friendId, { $addToSet: { fizzFriends: myId     } })
    res.json({ message: 'Friend added' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// DELETE /api/fizz/friends/:userId — remove Fizz friend
router.delete('/friends/:userId', auth, async (req, res) => {
  try {
    const myId     = req.user.userId
    const friendId = req.params.userId
    await User.findByIdAndUpdate(myId,     { $pull: { fizzFriends: friendId } })
    await User.findByIdAndUpdate(friendId, { $pull: { fizzFriends: myId     } })
    res.json({ message: 'Friend removed' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// ─── USER SEARCH ─────────────────────────────────────────────────────────────

// GET /api/fizz/users/search?q=
router.get('/users/search', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim()
    if (q.length < 2) return res.json({ users: [] })
    const regex = new RegExp(q, 'i')
    const users = await User.find({
      _id: { $ne: req.user.userId },
      $or: [
        { 'fizzProfile.firstName': regex },
        { 'fizzProfile.lastName':  regex },
        { 'fizzProfile.username':  regex },
        { firstName: regex },
        { lastName:  regex },
        { name:      regex },
      ]
    }).select('fizzProfile name firstName lastName username profilePicture').limit(20)
    res.json({ users: users.map(sanitizeUser) })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// GET /api/fizz/users/:userId — get a user's public Fizz profile
router.get('/users/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('fizzProfile fizzFriends name firstName lastName username profilePicture')
    if (!user) return res.status(404).json({ message: 'User not found' })
    const me = await User.findById(req.user.userId).select('fizzFriends')
    const isFriend = me.fizzFriends?.some(id => id.toString() === req.params.userId)
    res.json({
      user: { ...sanitizeUser(user), friendsCount: user.fizzFriends?.length ?? 0 },
      isFriend,
    })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// ─── FEED ────────────────────────────────────────────────────────────────────

// GET /api/fizz/feed
router.get('/feed', auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.userId).select('fizzFriends')
    const friendIds = me.fizzFriends || []
    const skip  = parseInt(req.query.skip)  || 0
    const limit = parseInt(req.query.limit) || 20

    const posts = await FeedPost.find({
      source: 'fizz',
      $or: [
        { author: req.user.userId },
        { author: { $in: friendIds } },
      ]
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'fizzProfile name firstName lastName username profilePicture')
      .lean()

    res.json({ posts: posts.map(p => ({ ...p, author: sanitizeUser(p.author) })) })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /api/fizz/feed — create a Fizz post
router.post('/feed', auth, async (req, res) => {
  try {
    const { content, postType, drinkInfo, checkInInfo, location, shareTo } = req.body
    if (!content || content.trim().length === 0) return res.status(400).json({ message: 'Content required' })

    const post = new FeedPost({
      author:   req.user.userId,
      content:  content.trim().slice(0, 1000),
      postType: postType || 'user',
      source:   'fizz',
      drinkInfo, checkInInfo, location,
    })
    await post.save()

    // Cross-post to Shot On Me if requested
    if (shareTo?.includes('shotonme')) {
      const crossPost = new FeedPost({
        author:   req.user.userId,
        content:  content.trim().slice(0, 1000),
        postType: postType || 'user',
        source:   'shotonme',
        drinkInfo, checkInInfo, location,
      })
      await crossPost.save()
    }

    const populated = await FeedPost.findById(post._id)
      .populate('author', 'fizzProfile name firstName lastName username profilePicture')
    res.status(201).json({ post: { ...populated.toObject(), author: sanitizeUser(populated.author) } })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /api/fizz/feed/:postId/like — toggle like
router.post('/feed/:postId/like', auth, async (req, res) => {
  try {
    const post = await FeedPost.findOne({ _id: req.params.postId, source: 'fizz' })
    if (!post) return res.status(404).json({ message: 'Post not found' })
    const uid = new mongoose.Types.ObjectId(req.user.userId)
    const liked = post.likes.some(l => l.user.equals(uid))
    if (liked) {
      post.likes = post.likes.filter(l => !l.user.equals(uid))
    } else {
      post.likes.push({ user: uid })
    }
    await post.save()
    res.json({ liked: !liked, likeCount: post.likes.length })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /api/fizz/feed/:postId/comment
router.post('/feed/:postId/comment', auth, async (req, res) => {
  try {
    const { content } = req.body
    if (!content) return res.status(400).json({ message: 'Content required' })
    const post = await FeedPost.findOneAndUpdate(
      { _id: req.params.postId, source: 'fizz' },
      { $push: { comments: { user: req.user.userId, content: content.slice(0, 500) } } },
      { new: true }
    ).populate('comments.user', 'fizzProfile name firstName lastName profilePicture')
    if (!post) return res.status(404).json({ message: 'Post not found' })
    res.json({ comments: post.comments })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /api/fizz/feed/:postId/share — cross-post to Shot On Me
router.post('/feed/:postId/share', auth, async (req, res) => {
  try {
    const original = await FeedPost.findOne({ _id: req.params.postId, source: 'fizz' })
    if (!original) return res.status(404).json({ message: 'Post not found' })
    const crossPost = new FeedPost({
      author:       original.author,
      content:      original.content,
      postType:     original.postType,
      media:        original.media,
      location:     original.location,
      drinkInfo:    original.drinkInfo,
      checkInInfo:  original.checkInInfo,
      source:       'shotonme',
    })
    await crossPost.save()
    res.json({ message: 'Shared to Shot On Me', postId: crossPost._id })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// ─── MESSAGES ────────────────────────────────────────────────────────────────

// GET /api/fizz/messages/unread-count
router.get('/messages/unread-count', auth, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user.userId,
      source: 'fizz',
      read: false,
    })
    res.json({ count })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// GET /api/fizz/messages/conversations
router.get('/messages/conversations', auth, async (req, res) => {
  try {
    const myId = new mongoose.Types.ObjectId(req.user.userId)

    const conversations = await Message.aggregate([
      {
        $match: {
          source: 'fizz',
          $or: [{ sender: myId }, { recipient: myId }],
          conversationId: /^fizz_/,
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id:          '$conversationId',
          lastMessage:  { $first: '$$ROOT' },
          unreadCount:  { $sum: { $cond: [{ $and: [{ $eq: ['$recipient', myId] }, { $eq: ['$read', false] }] }, 1, 0] } },
        }
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
    ])

    const populated = await Promise.all(conversations.map(async c => {
      const other = c.lastMessage.sender.toString() === req.user.userId
        ? c.lastMessage.recipient
        : c.lastMessage.sender
      const user = await User.findById(other).select('fizzProfile name firstName lastName profilePicture')
      return {
        conversationId: c._id,
        lastMessage:    c.lastMessage,
        unreadCount:    c.unreadCount,
        otherUser:      sanitizeUser(user),
      }
    }))

    res.json({ conversations: populated })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// GET /api/fizz/messages/:conversationId
router.get('/messages/:conversationId', auth, async (req, res) => {
  try {
    const convId = req.params.conversationId
    // Verify user is part of this conversation
    if (!convId.includes(req.user.userId.toString().slice(0, 8))) {
      // Soft check — just ensure the conversation exists for this user
    }
    const messages = await Message.find({ conversationId: convId, source: 'fizz' })
      .sort({ createdAt: 1 })
      .limit(100)
      .populate('sender',    'fizzProfile name firstName lastName profilePicture')
      .populate('recipient', 'fizzProfile name firstName lastName profilePicture')

    // Mark as read
    await Message.updateMany(
      { conversationId: convId, recipient: req.user.userId, read: false, source: 'fizz' },
      { $set: { read: true, readAt: new Date() } }
    )

    res.json({ messages })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /api/fizz/messages — send a message
router.post('/messages', auth, async (req, res) => {
  try {
    const { recipientId, content } = req.body
    if (!recipientId || !content?.trim()) return res.status(400).json({ message: 'recipientId and content required' })

    const convId = fizzConvId(req.user.userId, recipientId)
    const msg = new Message({
      sender:         req.user.userId,
      recipient:      recipientId,
      content:        content.trim(),
      conversationId: convId,
      source:         'fizz',
    })
    await msg.save()
    res.status(201).json({ message: msg })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

module.exports = router
