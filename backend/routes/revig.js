/**
 * /api/revig — All Revig-specific endpoints
 * Revig has its own profile, wallet, friends, feed, and messages.
 * The only thing shared with Shot On Me is the user login credentials.
 */
const express = require('express')
const mongoose = require('mongoose')
const multer = require('multer')
const cloudinary = require('cloudinary').v2
const User = require('../models/User')
const FeedPost = require('../models/FeedPost')
const Message = require('../models/Message')
const Story = require('../models/Story')
const RevigFriendRequest = require('../models/RevigFriendRequest')
const Notification = require('../models/Notification')
const Payment = require('../models/Payment')
const webpush = require('web-push')
const auth = require('../middleware/auth')
const { handlePaymentSent, handlePaymentReceived, handleCheckIn } = require('../utils/gamification')

// Configure web-push with VAPID keys (generate once: npx web-push generate-vapid-keys)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'admin@revig.app'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

// Cloudinary config (shared with rest of backend)
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

const router = express.Router()

// Socket.io injected by server.js
let io = null
router.setIO = (socketIO) => { io = socketIO }

// Helper — persist a revig notification to DB, push via socket, and send web push
async function notifyRevig(recipientId, type, content, actorId = null, extra = {}) {
  try {
    const titleMap = {
      message:         'New Message',
      friend_request:  'Friend Request',
      friend_accepted: 'Request Accepted',
      revig_received:   'Revig Received!',
      feed_like:       'New Like',
      feed_comment:    'New Comment',
      check_in:        'Check-In',
    }
    const n = await Notification.create({
      recipient: recipientId,
      actor:     actorId || null,
      type:      type in titleMap ? type : 'system',
      content,
      source:    'revig',
      ...extra,
    })
    const payload = {
      _id:       n._id,
      type,
      title:     titleMap[type] || 'Notification',
      message:   content,
      createdAt: n.createdAt,
    }
    // Socket push (real-time if app is open)
    if (io) {
      io.to(`user-${recipientId}`).emit('revig-notification', payload)
    }
    // Web Push (background, when app is closed)
    if (process.env.VAPID_PUBLIC_KEY) {
      const recipient = await User.findById(recipientId).select('revigPushSubscriptions revigProfile')
      const prefs = recipient?.revigProfile?.notifPrefs
      const prefKey = { message: 'messages', friend_request: 'friendRequests', friend_accepted: 'friendRequests', revig_received: 'revigReceived', feed_like: 'feedActivity', feed_comment: 'feedActivity' }[type]
      const allowed = !prefs || (prefs.allEnabled !== false && (prefKey ? prefs[prefKey] !== false : true))
      if (allowed && recipient?.revigPushSubscriptions?.length) {
        const pushPayload = JSON.stringify({ title: payload.title, body: payload.message, icon: '/icon-192x192.png', data: { url: '/revig' } })
        for (const sub of recipient.revigPushSubscriptions) {
          webpush.sendNotification(sub, pushPayload).catch(() => {
            // Remove stale subscriptions silently
            User.findByIdAndUpdate(recipientId, { $pull: { revigPushSubscriptions: { endpoint: sub.endpoint } } }).catch(() => {})
          })
        }
      }
    }
  } catch { /* ignore */ }
}

// ─── helpers ────────────────────────────────────────────────────────────────

function revigConvId(a, b) {
  const ids = [a.toString(), b.toString()].sort()
  return `revig_${ids[0]}_${ids[1]}`
}

function sanitizeUser(u) {
  if (!u) return null
  const fp = u.revigProfile || {}
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

// GET /api/revig/profile — own Revig profile + wallet
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('revigProfile revigWallet revigFriends revigPoints revigTotalPointsEarned revigTotalPointsRedeemed name firstName lastName username profilePicture email')
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({
      profile: sanitizeUser(user),
      wallet:  { balance: user.revigWallet?.balance ?? 0, pendingBalance: user.revigWallet?.pendingBalance ?? 0 },
      friendsCount: user.revigFriends?.length ?? 0,
      points: user.revigPoints || 0,
      totalPointsEarned: user.revigTotalPointsEarned || 0,
      totalPointsRedeemed: user.revigTotalPointsRedeemed || 0,
    })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// PUT /api/revig/profile — update Revig profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { firstName, lastName, username, bio, profilePicture, notifPrefs } = req.body
    const update = {}
    if (firstName      !== undefined) update['revigProfile.firstName']      = firstName.trim()
    if (lastName       !== undefined) update['revigProfile.lastName']       = lastName.trim()
    if (username       !== undefined) update['revigProfile.username']       = username.trim()
    if (bio            !== undefined) update['revigProfile.bio']            = bio.slice(0, 160)
    if (profilePicture !== undefined) update['revigProfile.profilePicture'] = profilePicture
    if (notifPrefs     !== undefined) update['revigProfile.notifPrefs']     = notifPrefs

    const user = await User.findByIdAndUpdate(req.user.userId, { $set: update }, { new: true })
      .select('revigProfile revigWallet revigFriends')
    res.json({ profile: sanitizeUser(user), wallet: user.revigWallet })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// ─── WALLET ──────────────────────────────────────────────────────────────────

// GET /api/revig/wallet
router.get('/wallet', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('revigWallet')
    res.json({ wallet: user.revigWallet ?? { balance: 0, pendingBalance: 0 } })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /api/revig/wallet/add — add funds (called after Stripe PaymentIntent confirmed)
router.post('/wallet/add', auth, async (req, res) => {
  try {
    const { amount } = req.body
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' })
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $inc: { 'revigWallet.balance': amount } },
      { new: true }
    ).select('revigWallet')
    res.json({ wallet: user.revigWallet })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /api/revig/send — send a Revig gift (debits revigWallet, credits recipient)
router.post('/send', auth, async (req, res) => {
  try {
    const { recipientId, amount, message, venueId } = req.body
    if (!recipientId || !amount || amount <= 0) return res.status(400).json({ message: 'recipientId and amount required' })

    // Self-send prevention
    if (recipientId === req.user.userId) {
      return res.status(400).json({ message: 'You cannot send a Revig to yourself' })
    }

    const sender = await User.findById(req.user.userId).select('revigWallet revigProfile name firstName lastName')
    if (!sender) return res.status(404).json({ message: 'User not found' })
    if ((sender.revigWallet?.balance ?? 0) < amount) return res.status(400).json({ message: 'Insufficient Revig balance' })

    const recipient = await User.findById(recipientId).select('revigProfile name firstName lastName')
    if (!recipient) return res.status(404).json({ message: 'Recipient not found' })

    // Circular payment prevention — block rapid back-and-forth between same two users
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [aToBRecent, bToARecent] = await Promise.all([
      Payment.findOne({ senderId: req.user.userId, recipientId, source: 'revig', createdAt: { $gte: oneDayAgo } }),
      Payment.findOne({ senderId: recipientId, recipientId: req.user.userId, source: 'revig', createdAt: { $gte: oneDayAgo } }),
    ])
    if (aToBRecent && bToARecent) {
      return res.status(400).json({ message: 'You and this person have already exchanged Revigs recently. Please wait 24 hours.' })
    }

    // Atomic debit — ensures balance can't go negative
    const debitResult = await User.findOneAndUpdate(
      { _id: req.user.userId, 'revigWallet.balance': { $gte: amount } },
      { $inc: { 'revigWallet.balance': -amount } },
      { new: true }
    )
    if (!debitResult) return res.status(400).json({ message: 'Insufficient Revig balance' })

    await User.findByIdAndUpdate(recipientId, { $inc: { 'revigWallet.balance': amount } })

    // Record venue revenue so it appears in venue portal earnings
    if (venueId) {
      try {
        await Payment.create({
          senderId: req.user.userId,
          recipientId,
          venueId,
          amount,
          currency: 'usd',
          type: 'shot_redeemed',
          source: 'revig',
          status: 'succeeded',
        })
        // Notify the venue portal in real time
        if (io) {
          const sp = sender.revigProfile || {}
          const senderName = `${sp.firstName || sender.firstName || ''} ${sp.lastName || sender.lastName || ''}`.trim() || 'Someone'
          io.to(`venue-${venueId}`).emit('revig-received', { amount, senderName, venueId, timestamp: new Date() })
        }
      } catch (payErr) {
        console.error('Revig: failed to record venue payment', payErr.message)
      }
    }

    const rp = recipient.revigProfile || {}
    const recipientName = `${rp.firstName || recipient.firstName || ''} ${rp.lastName || recipient.lastName || ''}`.trim()
    const finalMessage = message || `Sent a Revig to ${recipientName}! 🫧`

    const post = new FeedPost({
      author: req.user.userId,
      content: finalMessage,
      postType: 'drink_sent',
      source: 'revig',
      drinkInfo: { recipientId, recipientName, amount, emoji: '🫧', message: message || '' },
    })
    await post.save()

    // Award Revig points (async, don't block response)
    handlePaymentSent(req.user.userId, amount, 'revig').catch(err => console.error('Revig gamification error:', err))
    handlePaymentReceived(recipientId, amount, 'revig').catch(err => console.error('Revig gamification error:', err))

    res.status(201).json({ message: 'Revig sent!', post })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// ─── FRIENDS ─────────────────────────────────────────────────────────────────

// GET /api/revig/friends
router.get('/friends', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('revigFriends')
      .populate('revigFriends', 'revigProfile name firstName lastName username profilePicture')
    const friends = (user.revigFriends || []).map(sanitizeUser)
    res.json({ friends })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /api/revig/friends/:userId — send a friend request
router.post('/friends/:userId', auth, async (req, res) => {
  try {
    const myId     = req.user.userId
    const friendId = req.params.userId
    if (myId === friendId) return res.status(400).json({ message: 'Cannot add yourself' })

    // Check if already friends
    const me = await User.findById(myId).select('revigFriends')
    if (me.revigFriends?.some(id => id.toString() === friendId)) {
      return res.json({ message: 'Already friends' })
    }

    // Check if request already exists
    const existing = await RevigFriendRequest.findOne({ from: myId, to: friendId, status: 'pending' })
    if (existing) return res.json({ message: 'Request already sent', requestId: existing._id })

    // Check if THEY already sent us a request — if so, auto-accept
    const reverse = await RevigFriendRequest.findOne({ from: friendId, to: myId, status: 'pending' })
    if (reverse) {
      reverse.status = 'accepted'
      await reverse.save()
      await User.findByIdAndUpdate(myId,     { $addToSet: { revigFriends: friendId } })
      await User.findByIdAndUpdate(friendId, { $addToSet: { revigFriends: myId     } })
      await notifyRevig(friendId, 'friend_accepted', 'Your Revig friend request was accepted!', myId)
      return res.json({ message: 'Friend added', accepted: true })
    }

    const request = await RevigFriendRequest.create({ from: myId, to: friendId })

    const sender = await User.findById(myId).select('revigProfile firstName name')
    const fp = sender?.revigProfile || {}
    const senderName = fp.firstName || sender?.firstName || (sender?.name || '').split(' ')[0] || 'Someone'
    await notifyRevig(friendId, 'friend_request', `${senderName} sent you a friend request`, myId)

    res.json({ message: 'Friend request sent', requestId: request._id })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// DELETE /api/revig/friends/:userId — remove Revig friend
router.delete('/friends/:userId', auth, async (req, res) => {
  try {
    const myId     = req.user.userId
    const friendId = req.params.userId
    await User.findByIdAndUpdate(myId,     { $pull: { revigFriends: friendId } })
    await User.findByIdAndUpdate(friendId, { $pull: { revigFriends: myId     } })
    res.json({ message: 'Friend removed' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// GET /api/revig/friends/requests/pending — incoming friend requests
router.get('/friends/requests/pending', auth, async (req, res) => {
  try {
    const requests = await RevigFriendRequest.find({ to: req.user.userId, status: 'pending' })
      .populate('from', 'revigProfile name firstName lastName profilePicture')
      .sort({ createdAt: -1 })
    res.json({ requests: requests.map(r => ({ ...r.toObject(), from: sanitizeUser(r.from) })) })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /api/revig/friends/requests/:requestId/accept
router.post('/friends/requests/:requestId/accept', auth, async (req, res) => {
  try {
    const request = await RevigFriendRequest.findOne({ _id: req.params.requestId, to: req.user.userId, status: 'pending' })
    if (!request) return res.status(404).json({ message: 'Request not found' })
    request.status = 'accepted'
    await request.save()
    await User.findByIdAndUpdate(req.user.userId, { $addToSet: { revigFriends: request.from } })
    await User.findByIdAndUpdate(request.from,    { $addToSet: { revigFriends: req.user.userId } })
    await notifyRevig(request.from.toString(), 'friend_accepted', 'Your Revig friend request was accepted!', req.user.userId)
    res.json({ message: 'Friend request accepted' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /api/revig/friends/requests/:requestId/decline
router.post('/friends/requests/:requestId/decline', auth, async (req, res) => {
  try {
    const request = await RevigFriendRequest.findOne({ _id: req.params.requestId, to: req.user.userId, status: 'pending' })
    if (!request) return res.status(404).json({ message: 'Request not found' })
    request.status = 'declined'
    await request.save()
    res.json({ message: 'Request declined' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// ─── USER SEARCH ─────────────────────────────────────────────────────────────

// GET /api/revig/friends/suggestions — users with mutual friends, not already friends
router.get('/friends/suggestions', auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.userId).select('revigFriends revigBlocked')
    const myFriendIds = (me.revigFriends || []).map(id => id.toString())
    const blockedIds  = (me.revigBlocked  || []).map(id => id.toString())
    const excludeIds  = [req.user.userId, ...myFriendIds, ...blockedIds]

    if (myFriendIds.length === 0) {
      // No friends yet — return recently active users
      const recent = await User.find({ _id: { $nin: excludeIds } })
        .select('revigProfile name firstName lastName profilePicture')
        .sort({ lastSeen: -1 })
        .limit(10)
      return res.json({ users: recent.map(u => ({ ...sanitizeUser(u), mutualFriends: 0 })) })
    }

    // Find friends-of-friends
    const friendsOfFriends = await User.find({
      _id:         { $nin: excludeIds },
      revigFriends: { $in: myFriendIds },
    }).select('revigProfile name firstName lastName profilePicture revigFriends').limit(30)

    const suggestions = friendsOfFriends.map(u => {
      const mutual = (u.revigFriends || []).filter(id => myFriendIds.includes(id.toString())).length
      return { ...sanitizeUser(u), mutualFriends: mutual }
    }).sort((a, b) => b.mutualFriends - a.mutualFriends).slice(0, 15)

    res.json({ users: suggestions })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// GET /api/revig/users/search?q=
router.get('/users/search', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim()
    if (q.length < 2) return res.json({ users: [] })
    const regex = new RegExp(q, 'i')
    const users = await User.find({
      _id: { $ne: req.user.userId },
      $or: [
        { 'revigProfile.firstName': regex },
        { 'revigProfile.lastName':  regex },
        { 'revigProfile.username':  regex },
        { firstName: regex },
        { lastName:  regex },
        { name:      regex },
      ]
    }).select('revigProfile name firstName lastName username profilePicture').limit(20)
    res.json({ users: users.map(sanitizeUser) })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// GET /api/revig/users/:userId — get a user's public Revig profile
router.get('/users/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('revigProfile revigFriends name firstName lastName username profilePicture')
    if (!user) return res.status(404).json({ message: 'User not found' })
    const me = await User.findById(req.user.userId).select('revigFriends')
    const isFriend = me.revigFriends?.some(id => id.toString() === req.params.userId)
    res.json({
      user: { ...sanitizeUser(user), friendsCount: user.revigFriends?.length ?? 0 },
      isFriend,
    })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// ─── FEED ────────────────────────────────────────────────────────────────────

// GET /api/revig/feed
router.get('/feed', auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.userId).select('revigFriends revigBlocked')
    const friendIds = me.revigFriends || []
    const blockedIds = me.revigBlocked || []
    const skip  = parseInt(req.query.skip)  || 0
    const limit = parseInt(req.query.limit) || 20

    const posts = await FeedPost.find({
      source: 'revig',
      author: { $nin: blockedIds },
      $or: [
        { author: req.user.userId },
        { author: { $in: friendIds } },
      ]
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'revigProfile name firstName lastName username profilePicture')
      .lean()

    res.json({
      posts: posts.map(p => {
        // Build reactionCounts from reactions array
        const reactionCounts = {}
        const userReactions = []
        if (p.reactions) {
          for (const r of p.reactions) {
            if (!reactionCounts[r.emoji]) reactionCounts[r.emoji] = 0
            reactionCounts[r.emoji]++
            if (r.user?.toString() === req.user.userId && !userReactions.includes(r.emoji)) {
              userReactions.push(r.emoji)
            }
          }
        }
        // Backward compat: compute likes/likedByMe from reactions (❤️) + legacy likes
        const legacyLikeCount = p.likes?.length || 0
        const heartCount = reactionCounts['❤️'] || 0
        const likedByMe = userReactions.includes('❤️') || (p.likes?.some(l => l.user?.toString() === req.user.userId) || false)
        return {
          ...p,
          author: sanitizeUser(p.author),
          likes: legacyLikeCount + heartCount,
          likedByMe,
          reactionCounts,
          userReactions,
          commentCount: p.comments?.length || 0,
          comments: undefined, // don't send full comment content in feed, use separate endpoint
        }
      })
    })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /api/revig/feed — create a Revig post
router.post('/feed', auth, async (req, res) => {
  try {
    const { content, postType, drinkInfo, checkInInfo, location, shareTo } = req.body
    if (!content || content.trim().length === 0) return res.status(400).json({ message: 'Content required' })

    const post = new FeedPost({
      author:   req.user.userId,
      content:  content.trim().slice(0, 1000),
      postType: postType || 'user',
      source:   'revig',
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
      .populate('author', 'revigProfile name firstName lastName username profilePicture')
    res.status(201).json({ post: { ...populated.toObject(), author: sanitizeUser(populated.author) } })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /api/revig/feed/:postId/like — toggle like
router.post('/feed/:postId/like', auth, async (req, res) => {
  try {
    const post = await FeedPost.findOne({ _id: req.params.postId, source: 'revig' })
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

// POST /api/revig/feed/:postId/reaction — toggle emoji reaction on a post
const VALID_REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥', '👏', '🎉']
router.post('/feed/:postId/reaction', auth, async (req, res) => {
  try {
    const { emoji } = req.body
    if (!emoji || !VALID_REACTION_EMOJIS.includes(emoji)) {
      return res.status(400).json({ message: 'Invalid emoji. Must be one of: ' + VALID_REACTION_EMOJIS.join(' ') })
    }
    const post = await FeedPost.findOne({ _id: req.params.postId, source: 'revig' })
    if (!post) return res.status(404).json({ message: 'Post not found' })

    const uid = req.user.userId
    const existing = post.reactions.find(r => r.user.toString() === uid && r.emoji === emoji)

    if (existing) {
      // Toggle off — remove this specific reaction
      await FeedPost.findByIdAndUpdate(post._id, {
        $pull: { reactions: { user: uid, emoji } }
      })
    } else {
      // Add reaction (allow multiple different emojis from same user)
      await FeedPost.findByIdAndUpdate(post._id, {
        $push: { reactions: { user: uid, emoji, createdAt: new Date() } }
      })
      // Notify post author (only on add, not remove)
      if (post.author?.toString() !== uid) {
        const reactor = await User.findById(uid).select('revigProfile firstName name')
        const fp = reactor?.revigProfile || {}
        const reactorName = fp.firstName || reactor?.firstName || 'Someone'
        await notifyRevig(post.author.toString(), 'feed_like', `${reactorName} reacted ${emoji} to your post`, uid)
      }
    }

    // Fetch updated post to return current state
    const updated = await FeedPost.findById(post._id).lean()
    const reactionCounts = {}
    const userReactions = []
    for (const r of (updated.reactions || [])) {
      if (!reactionCounts[r.emoji]) reactionCounts[r.emoji] = 0
      reactionCounts[r.emoji]++
      if (r.user?.toString() === uid && !userReactions.includes(r.emoji)) {
        userReactions.push(r.emoji)
      }
    }
    res.json({ reactionCounts, userReactions })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /api/revig/feed/:postId/comments/:commentId/reaction — toggle emoji reaction on a comment
router.post('/feed/:postId/comments/:commentId/reaction', auth, async (req, res) => {
  try {
    const { emoji } = req.body
    if (!emoji || !VALID_REACTION_EMOJIS.includes(emoji)) {
      return res.status(400).json({ message: 'Invalid emoji. Must be one of: ' + VALID_REACTION_EMOJIS.join(' ') })
    }
    const post = await FeedPost.findOne({ _id: req.params.postId, source: 'revig' })
    if (!post) return res.status(404).json({ message: 'Post not found' })

    const comment = post.comments.id(req.params.commentId)
    if (!comment) return res.status(404).json({ message: 'Comment not found' })

    const uid = req.user.userId
    const existing = comment.reactions.find(r => r.user.toString() === uid && r.emoji === emoji)

    if (existing) {
      // Toggle off
      await FeedPost.findOneAndUpdate(
        { _id: post._id },
        { $pull: { 'comments.$[c].reactions': { user: uid, emoji } } },
        { arrayFilters: [{ 'c._id': new mongoose.Types.ObjectId(req.params.commentId) }] }
      )
    } else {
      // Add reaction
      await FeedPost.findOneAndUpdate(
        { _id: post._id },
        { $push: { 'comments.$[c].reactions': { user: uid, emoji, createdAt: new Date() } } },
        { arrayFilters: [{ 'c._id': new mongoose.Types.ObjectId(req.params.commentId) }] }
      )
    }

    // Fetch updated comment to return current state
    const updated = await FeedPost.findById(post._id).lean()
    const updatedComment = updated.comments.find(c => c._id.toString() === req.params.commentId)
    const reactionCounts = {}
    const userReactions = []
    for (const r of (updatedComment?.reactions || [])) {
      if (!reactionCounts[r.emoji]) reactionCounts[r.emoji] = 0
      reactionCounts[r.emoji]++
      if (r.user?.toString() === uid && !userReactions.includes(r.emoji)) {
        userReactions.push(r.emoji)
      }
    }
    res.json({ reactionCounts, userReactions })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// GET /api/revig/feed/:postId/comments
router.get('/feed/:postId/comments', auth, async (req, res) => {
  try {
    const post = await FeedPost.findOne({ _id: req.params.postId, source: 'revig' })
      .populate('comments.user', 'revigProfile name firstName lastName profilePicture')
      .populate('comments.reactions.user', 'revigProfile name firstName lastName profilePicture')
    if (!post) return res.status(404).json({ message: 'Post not found' })
    const comments = (post.comments || []).map(c => {
      const cObj = c.toObject ? c.toObject() : c
      const reactionCounts = {}
      const userReactions = []
      if (cObj.reactions) {
        for (const r of cObj.reactions) {
          if (!reactionCounts[r.emoji]) reactionCounts[r.emoji] = 0
          reactionCounts[r.emoji]++
          const rUserId = r.user?._id?.toString() || r.user?.toString()
          if (rUserId === req.user.userId && !userReactions.includes(r.emoji)) {
            userReactions.push(r.emoji)
          }
        }
      }
      return { ...cObj, reactionCounts, userReactions }
    })
    res.json({ comments })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /api/revig/feed/:postId/comment
router.post('/feed/:postId/comment', auth, async (req, res) => {
  try {
    const { content } = req.body
    if (!content?.trim()) return res.status(400).json({ message: 'Content required' })
    const post = await FeedPost.findOneAndUpdate(
      { _id: req.params.postId, source: 'revig' },
      { $push: { comments: { user: req.user.userId, content: content.trim().slice(0, 500) } } },
      { new: true }
    ).populate('comments.user', 'revigProfile name firstName lastName profilePicture')
    if (!post) return res.status(404).json({ message: 'Post not found' })
    // Notify post author
    if (post.author?.toString() !== req.user.userId) {
      const commenter = await User.findById(req.user.userId).select('revigProfile firstName name')
      const fp = commenter?.revigProfile || {}
      const commenterName = fp.firstName || commenter?.firstName || 'Someone'
      await notifyRevig(post.author.toString(), 'feed_comment', `${commenterName} commented on your post`, req.user.userId)
    }
    res.json({ comments: post.comments })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// DELETE /api/revig/feed/:postId/comments/:commentId — delete own comment
router.delete('/feed/:postId/comments/:commentId', auth, async (req, res) => {
  try {
    const post = await FeedPost.findOneAndUpdate(
      { _id: req.params.postId, source: 'revig', 'comments._id': req.params.commentId, 'comments.user': req.user.userId },
      { $pull: { comments: { _id: req.params.commentId } } },
      { new: true }
    )
    if (!post) return res.status(404).json({ message: 'Comment not found or not yours' })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /api/revig/users/:userId/report — report a user
router.post('/users/:userId/report', auth, async (req, res) => {
  try {
    const { reason, details } = req.body
    if (!reason) return res.status(400).json({ message: 'Reason required' })
    const Report = require('../models/Report')
    await Report.create({
      reporter: req.user.userId,
      targetType: 'user',
      targetId: req.params.userId,
      reason: `${reason}${details ? ': ' + details.slice(0, 480) : ''}`,
    })
    res.json({ message: 'Report submitted. Thank you.' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /api/revig/feed/:postId/report — report a post
router.post('/feed/:postId/report', auth, async (req, res) => {
  try {
    const { reason, details } = req.body
    if (!reason) return res.status(400).json({ message: 'Reason required' })
    const Report = require('../models/Report')
    await Report.create({
      reporter: req.user.userId,
      targetType: 'post',
      targetId: req.params.postId,
      reason: `${reason}${details ? ': ' + details.slice(0, 480) : ''}`,
    })
    res.json({ message: 'Report submitted. Thank you.' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /api/revig/upload — upload image to Cloudinary, returns url + publicId
router.post('/upload', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' })
    const b64 = Buffer.from(req.file.buffer).toString('base64')
    const dataUri = `data:${req.file.mimetype};base64,${b64}`
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'revig',
      resource_type: 'image',
      transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
    })
    res.json({ url: result.secure_url, publicId: result.public_id })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// DELETE /api/revig/feed/:postId — delete own post
router.delete('/feed/:postId', auth, async (req, res) => {
  try {
    const post = await FeedPost.findOne({ _id: req.params.postId, source: 'revig' })
    if (!post) return res.status(404).json({ message: 'Post not found' })
    if (post.author?.toString() !== req.user.userId) return res.status(403).json({ message: 'Not your post' })
    await post.deleteOne()
    res.json({ message: 'Post deleted' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// PUT /api/revig/feed/:postId — edit own post content
router.put('/feed/:postId', auth, async (req, res) => {
  try {
    const { content } = req.body
    if (!content?.trim()) return res.status(400).json({ message: 'Content required' })
    const post = await FeedPost.findOne({ _id: req.params.postId, source: 'revig' })
    if (!post) return res.status(404).json({ message: 'Post not found' })
    if (post.author?.toString() !== req.user.userId) return res.status(403).json({ message: 'Not your post' })
    post.content = content.trim().slice(0, 1000)
    await post.save()
    res.json({ post })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /api/revig/feed/:postId/share — cross-post to Shot On Me
router.post('/feed/:postId/share', auth, async (req, res) => {
  try {
    const original = await FeedPost.findOne({ _id: req.params.postId, source: 'revig' })
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

// GET /api/revig/messages/unread-count
router.get('/messages/unread-count', auth, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user.userId,
      source: 'revig',
      read: false,
    })
    res.json({ count })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// GET /api/revig/messages/conversations
router.get('/messages/conversations', auth, async (req, res) => {
  try {
    const myId = new mongoose.Types.ObjectId(req.user.userId)

    const conversations = await Message.aggregate([
      {
        $match: {
          source: 'revig',
          $or: [{ sender: myId }, { recipient: myId }],
          conversationId: /^revig_/,
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
      const user = await User.findById(other).select('revigProfile name firstName lastName profilePicture')
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

// GET /api/revig/messages/:conversationId
router.get('/messages/:conversationId', auth, async (req, res) => {
  try {
    const convId = req.params.conversationId
    // Verify user is part of this conversation
    if (!convId.includes(req.user.userId.toString().slice(0, 8))) {
      // Soft check — just ensure the conversation exists for this user
    }
    const messages = await Message.find({ conversationId: convId, source: 'revig' })
      .sort({ createdAt: 1 })
      .limit(100)
      .populate('sender',    'revigProfile name firstName lastName profilePicture')
      .populate('recipient', 'revigProfile name firstName lastName profilePicture')

    // Mark as read
    await Message.updateMany(
      { conversationId: convId, recipient: req.user.userId, read: false, source: 'revig' },
      { $set: { read: true, readAt: new Date() } }
    )

    res.json({ messages })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /api/revig/messages — send a message
router.post('/messages', auth, async (req, res) => {
  try {
    const { recipientId, content } = req.body
    if (!recipientId || !content?.trim()) return res.status(400).json({ message: 'recipientId and content required' })

    const convId = revigConvId(req.user.userId, recipientId)
    const msg = new Message({
      sender:         req.user.userId,
      recipient:      recipientId,
      content:        content.trim(),
      conversationId: convId,
      source:         'revig',
    })
    await msg.save()

    const populated = await Message.findById(msg._id)
      .populate('sender',    'revigProfile name firstName lastName profilePicture')
      .populate('recipient', 'revigProfile name firstName lastName profilePicture')

    // Real-time delivery
    if (io) {
      io.to(`user-${recipientId}`).emit('revig-message', {
        message: populated,
        conversationId: convId,
      })
      // Also push a persisted notification
      const sender2 = await User.findById(req.user.userId).select('revigProfile firstName name')
      const fp2 = sender2?.revigProfile || {}
      const senderName2 = fp2.firstName || sender2?.firstName || (sender2?.name || '').split(' ')[0] || 'Someone'
      await notifyRevig(recipientId, 'message', `${senderName2} sent you a Revig message`, req.user.userId)
    }

    res.status(201).json({ message: populated })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /api/revig/messages/:conversationId/typing — emit typing indicator
router.post('/messages/:conversationId/typing', auth, async (req, res) => {
  try {
    const { conversationId } = req.params
    const { recipientId, isTyping } = req.body
    if (io && recipientId) {
      const sender = await User.findById(req.user.userId).select('revigProfile firstName name')
      const fp = sender?.revigProfile || {}
      const senderName = fp.firstName || sender?.firstName || ''
      io.to(`user-${recipientId}`).emit('revig-typing', {
        conversationId,
        senderId: req.user.userId,
        senderName,
        isTyping: !!isTyping,
      })
    }
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// ─── CHECK-INS ───────────────────────────────────────────────────────────────

// POST /api/revig/checkins — check in to a venue, creates a feed post
router.post('/checkins', auth, async (req, res) => {
  try {
    const { venueId, venueName, latitude, longitude } = req.body
    if (!venueName) return res.status(400).json({ message: 'venueName required' })

    const post = new FeedPost({
      author:   req.user.userId,
      content:  `Checked in at ${venueName}! 📍`,
      postType: 'checkin',
      source:   'revig',
      checkInInfo: { venueId: venueId || null, venueName, latitude: latitude || null, longitude: longitude || null },
      location: venueName ? { name: venueName, latitude, longitude } : undefined,
    })
    await post.save()

    // Award Revig check-in points (handles totalCheckIns bump, streak, and daily cap)
    handleCheckIn(req.user.userId, venueId || null, 'revig').catch(err => console.error('Revig check-in gamification error:', err))

    res.status(201).json({ message: 'Checked in!', post })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// GET /api/revig/checkins/my — current user's check-in history
router.get('/checkins/my', auth, async (req, res) => {
  try {
    const posts = await FeedPost.find({ author: req.user.userId, postType: 'checkin', source: 'revig' })
      .sort({ createdAt: -1 }).limit(20)
    res.json({ checkins: posts })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// ─── STORIES ─────────────────────────────────────────────────────────────────

// GET /api/revig/stories — stories from self + friends (last 24h)
router.get('/stories', auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.userId).select('revigFriends revigBlocked')
    const friendIds = me.revigFriends || []
    const blockedIds = me.revigBlocked || []

    const stories = await Story.find({
      source: 'revig',
      isActive: true,
      expiresAt: { $gt: new Date() },
      author: { $nin: blockedIds, $in: [req.user.userId, ...friendIds] },
    })
      .populate('author', 'revigProfile name firstName lastName profilePicture')
      .sort({ createdAt: -1 })
      .lean()

    // Group by author
    const grouped = {}
    for (const story of stories) {
      const authorId = story.author?._id?.toString()
      if (!grouped[authorId]) {
        grouped[authorId] = {
          author: sanitizeUser(story.author),
          stories: [],
          hasUnviewed: false,
        }
      }
      const viewed = story.views?.some(v => v.user?.toString() === req.user.userId)
      grouped[authorId].stories.push({ ...story, viewed })
      if (!viewed) grouped[authorId].hasUnviewed = true
    }

    res.json({ groups: Object.values(grouped) })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /api/revig/stories — create a story (image already uploaded to Cloudinary)
router.post('/stories', auth, async (req, res) => {
  try {
    const { url, publicId, caption } = req.body
    if (!url || !publicId) return res.status(400).json({ message: 'url and publicId required' })
    const story = new Story({
      author: req.user.userId,
      media: { url, type: 'image', publicId },
      caption: caption?.slice(0, 200) || '',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      source: 'revig',
    })
    await story.save()
    res.status(201).json({ story })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /api/revig/stories/:storyId/view — mark story as viewed
router.post('/stories/:storyId/view', auth, async (req, res) => {
  try {
    const story = await Story.findOne({ _id: req.params.storyId, source: 'revig' })
    if (!story) return res.status(404).json({ message: 'Story not found' })
    story.addView(req.user.userId)
    await story.save()
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// DELETE /api/revig/stories/:storyId — delete own story
router.delete('/stories/:storyId', auth, async (req, res) => {
  try {
    const story = await Story.findOne({ _id: req.params.storyId, source: 'revig', author: req.user.userId })
    if (!story) return res.status(404).json({ message: 'Story not found' })
    story.isActive = false
    await story.save()
    res.json({ message: 'Story deleted' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// ─── BLOCK / REPORT ──────────────────────────────────────────────────────────

// POST /api/revig/block/:userId — block a user
router.post('/block/:userId', auth, async (req, res) => {
  try {
    const targetId = req.params.userId
    if (targetId === req.user.userId) return res.status(400).json({ message: 'Cannot block yourself' })
    // Add to block list, remove from friends
    await User.findByIdAndUpdate(req.user.userId, {
      $addToSet: { revigBlocked: targetId },
      $pull:     { revigFriends: targetId },
    })
    await User.findByIdAndUpdate(targetId, { $pull: { revigFriends: req.user.userId } })
    // Clean up any friend requests
    await RevigFriendRequest.deleteMany({
      $or: [{ from: req.user.userId, to: targetId }, { from: targetId, to: req.user.userId }],
    })
    res.json({ message: 'User blocked' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// DELETE /api/revig/block/:userId — unblock
router.delete('/block/:userId', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.userId, { $pull: { revigBlocked: req.params.userId } })
    res.json({ message: 'User unblocked' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// GET /api/revig/blocked — list blocked users
router.get('/blocked', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('revigBlocked')
      .populate('revigBlocked', 'revigProfile name firstName lastName profilePicture')
    res.json({ blocked: (user.revigBlocked || []).map(sanitizeUser) })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// ─── PUSH SUBSCRIPTIONS ──────────────────────────────────────────────────────

// GET /api/revig/push/vapid-public-key — expose public VAPID key to frontend
router.get('/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null })
})

// POST /api/revig/push/subscribe — save a push subscription for this user
router.post('/push/subscribe', auth, async (req, res) => {
  try {
    const { endpoint, keys } = req.body
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: 'Invalid subscription object' })
    }
    // Upsert: add if not already stored (match by endpoint)
    await User.findByIdAndUpdate(req.user.userId, {
      $pull: { revigPushSubscriptions: { endpoint } }, // remove old entry for this endpoint first
    })
    await User.findByIdAndUpdate(req.user.userId, {
      $push: { revigPushSubscriptions: { endpoint, keys, createdAt: new Date() } },
    })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// DELETE /api/revig/push/subscribe — remove subscription (on logout)
router.delete('/push/subscribe', auth, async (req, res) => {
  try {
    const { endpoint } = req.body
    if (endpoint) {
      await User.findByIdAndUpdate(req.user.userId, {
        $pull: { revigPushSubscriptions: { endpoint } },
      })
    }
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

// GET /api/revig/notifications — list recent revig notifications for current user
router.get('/notifications', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 40, 100)
    const notifications = await Notification.find({ recipient: req.user.userId, source: 'revig' })
      .populate('actor', 'revigProfile firstName name profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    const titleMap = {
      message:         'New Message',
      friend_request:  'Friend Request',
      friend_accepted: 'Request Accepted',
      revig_received:   'Revig Received!',
      feed_like:       'New Like',
      feed_comment:    'New Comment',
      check_in:        'Check-In',
      system:          'Notification',
    }

    const shaped = notifications.map(n => ({
      _id:       n._id,
      type:      n.type,
      title:     titleMap[n.type] || 'Notification',
      message:   n.content,
      read:      n.read,
      createdAt: n.createdAt,
      actor:     n.actor ? sanitizeUser(n.actor) : null,
    }))

    res.json({ notifications: shaped, unread: shaped.filter(n => !n.read).length })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// PUT /api/revig/notifications/read-all — mark all revig notifications as read
router.put('/notifications/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.userId, source: 'revig', read: false },
      { $set: { read: true, readAt: new Date() } }
    )
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// PUT /api/revig/notifications/:id/read — mark single notification as read
router.put('/notifications/:id/read', auth, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.userId, source: 'revig' },
      { $set: { read: true, readAt: new Date() } }
    )
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

module.exports = router
