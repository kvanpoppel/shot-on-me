const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const User = require('../models/User')
const Venue = require('../models/Venue')
const Payment = require('../models/Payment')
const VirtualCard = require('../models/VirtualCard')
const OwnerAIInsightEvent = require('../models/OwnerAIInsightEvent')
const mongoose = require('mongoose')

// Middleware to check if user is owner/admin
const isOwner = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('role isOwner')
    if (!user) {
      return res.status(401).json({ message: 'User not found' })
    }

    // Only allow users with an explicit role or isOwner flag set in the database.
    // Email-based access checks are intentionally excluded — they can be bypassed by
    // registering with the owner email or by manipulating environment variables.
    if (user.isOwner === true || user.role === 'admin' || user.role === 'owner') {
      return next()
    }

    res.status(403).json({ message: 'Access denied. Owner privileges required.' })
  } catch (error) {
    res.status(500).json({ message: 'Server error'})
  }
}

// @route   GET /api/owner/dashboard
// @desc    Get owner dashboard overview
// @access  Private (Owner only)
router.get('/dashboard', auth, isOwner, async (req, res) => {
  try {
    const now = new Date()
    const today = new Date(now.setHours(0, 0, 0, 0))
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    
    // Total users
    const totalUsers = await User.countDocuments({ userType: { $ne: 'venue' } })
    const activeUsers = await User.countDocuments({
      userType: { $ne: 'venue' },
      lastActive: { $gte: thisWeek }
    })
    const newUsersToday = await User.countDocuments({
      userType: { $ne: 'venue' },
      createdAt: { $gte: today }
    })
    const newUsersThisMonth = await User.countDocuments({
      userType: { $ne: 'venue' },
      createdAt: { $gte: thisMonth }
    })
    
    // Total venues
    const totalVenues = await Venue.countDocuments()
    const activeVenues = await Venue.countDocuments({
      'promotions.isActive': true
    })
    const venuesWithStripe = await Venue.countDocuments({
      stripeAccountId: { $exists: true, $ne: null }
    })
    
    // Financial metrics
    const allPayments = await Payment.find({ status: 'succeeded' })
    
    // Calculate total revenue (all successful payments)
    const totalRevenue = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    
    // Calculate total commissions
    const totalCommissions = allPayments.reduce((sum, p) => {
      if (p.metadata?.commission) {
        return sum + parseFloat(p.metadata.commission)
      }
      // Calculate commission if not stored
      const amount = p.amount || 0
      const commission = amount < 20 ? 0.25 : amount * 0.01 // Minimal commission
      return sum + commission
    }, 0)
    
    // Today's revenue
    const todayPayments = allPayments.filter(p => 
      new Date(p.createdAt) >= today
    )
    const todayRevenue = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    const todayCommissions = todayPayments.reduce((sum, p) => {
      if (p.metadata?.commission) {
        return sum + parseFloat(p.metadata.commission)
      }
      const amount = p.amount || 0
      const commission = amount < 20 ? 0.25 : amount * 0.01 // Minimal commission
      return sum + commission
    }, 0)
    
    // This month's revenue
    const monthPayments = allPayments.filter(p => 
      new Date(p.createdAt) >= thisMonth
    )
    const monthRevenue = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    const monthCommissions = monthPayments.reduce((sum, p) => {
      if (p.metadata?.commission) {
        return sum + parseFloat(p.metadata.commission)
      }
      const amount = p.amount || 0
      const commission = amount < 20 ? 0.25 : amount * 0.01 // Minimal commission
      return sum + commission
    }, 0)
    
    // Platform float (total funds in user wallets)
    const users = await User.find({ userType: { $ne: 'venue' } })
    const platformFloat = users.reduce((sum, u) => {
      return sum + (u.wallet?.balance || 0)
    }, 0)
    
    // Virtual cards
    const totalCards = await VirtualCard.countDocuments()
    const activeCards = await VirtualCard.countDocuments({ status: 'active' })
    
    // Transaction counts
    const totalTransactions = allPayments.length
    const todayTransactions = todayPayments.length
    const monthTransactions = monthPayments.length
    
    // Tap-and-pay transactions
    const tapAndPayTransactions = allPayments.filter(p => p.type === 'tap_and_pay')
    const tapAndPayCount = tapAndPayTransactions.length
    const tapAndPayRevenue = tapAndPayTransactions.reduce((sum, p) => sum + (p.amount || 0), 0)

    // Owner AI insight adoption metrics
    const insightWindowStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    const insightEvents = await OwnerAIInsightEvent.find({
      ownerId: req.user.userId,
      createdAt: { $gte: insightWindowStart },
      eventType: 'apply'
    }).lean()

    const insightCounts = insightEvents.reduce((acc, event) => {
      const key = event.insightKey || 'unknown'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const appliedThisWeek = insightEvents.filter(e => new Date(e.createdAt) >= weekStart).length
    
    res.json({
      overview: {
        totalUsers,
        activeUsers,
        newUsersToday,
        newUsersThisMonth,
        totalVenues,
        activeVenues,
        venuesWithStripe,
        totalCards,
        activeCards
      },
      financial: {
        totalRevenue: totalRevenue.toFixed(2),
        totalCommissions: totalCommissions.toFixed(2),
        todayRevenue: todayRevenue.toFixed(2),
        todayCommissions: todayCommissions.toFixed(2),
        monthRevenue: monthRevenue.toFixed(2),
        monthCommissions: monthCommissions.toFixed(2),
        platformFloat: platformFloat.toFixed(2),
        averageTransaction: totalTransactions > 0 ? (totalRevenue / totalTransactions).toFixed(2) : '0.00'
      },
      transactions: {
        total: totalTransactions,
        today: todayTransactions,
        thisMonth: monthTransactions,
        tapAndPay: {
          count: tapAndPayCount,
          revenue: tapAndPayRevenue.toFixed(2)
        }
      },
      aiInsights: {
        appliedLast30Days: insightEvents.length,
        appliedThisWeek,
        insightCounts
      }
    })
  } catch (error) {
    console.error('Error fetching owner dashboard:', error)
    res.status(500).json({ message: 'Server error'})
  }
})

// @route   POST /api/owner/ai-insights/track
// @desc    Track owner AI insight apply event
// @access  Private (Owner only)
router.post('/ai-insights/track', auth, isOwner, async (req, res) => {
  try {
    const { insightKey, aiIntent = '', actionHref = '' } = req.body || {}
    if (!insightKey || typeof insightKey !== 'string') {
      return res.status(400).json({ message: 'insightKey is required' })
    }

    await OwnerAIInsightEvent.create({
      ownerId: req.user.userId,
      insightKey,
      aiIntent,
      actionHref,
      eventType: 'apply'
    })

    return res.json({ message: 'AI insight event tracked' })
  } catch (error) {
    console.error('Error tracking AI insight event:', error)
    return res.status(500).json({ message: 'Server error'})
  }
})

// @route   GET /api/owner/ai-insights/metrics
// @desc    Get owner AI insight metrics
// @access  Private (Owner only)
router.get('/ai-insights/metrics', auth, isOwner, async (req, res) => {
  try {
    const period = parseInt(req.query.period || '30', 10)
    const start = new Date()
    start.setDate(start.getDate() - Math.max(1, period))

    const events = await OwnerAIInsightEvent.find({
      ownerId: req.user.userId,
      createdAt: { $gte: start },
      eventType: 'apply'
    }).lean()

    const byInsight = events.reduce((acc, event) => {
      const key = event.insightKey || 'unknown'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    res.json({
      periodDays: period,
      totalApplies: events.length,
      byInsight
    })
  } catch (error) {
    console.error('Error fetching AI insight metrics:', error)
    res.status(500).json({ message: 'Server error'})
  }
})

// @route   GET /api/owner/transactions
// @desc    Get all transactions with filters
// @access  Private (Owner only)
router.get('/transactions', auth, isOwner, async (req, res) => {
  try {
    const {
      type,
      startDate,
      endDate,
      userId,
      venueId,
      minAmount,
      maxAmount,
      status,
      page = 1,
      limit = 50
    } = req.query
    
    const query = {}
    
    if (type) query.type = type
    if (status) query.status = status
    if (userId) query.$or = [
      { sender: userId },
      { recipient: userId }
    ]
    if (venueId) query.venueId = venueId
    if (minAmount) query.amount = { ...query.amount, $gte: parseFloat(minAmount) }
    if (maxAmount) query.amount = { ...query.amount, $lte: parseFloat(maxAmount) }
    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) query.createdAt.$gte = new Date(startDate)
      if (endDate) query.createdAt.$lte = new Date(endDate)
    }
    
    const safeLimit = Math.min(200, Math.max(1, parseInt(limit) || 50))
    const safePage = Math.max(1, parseInt(page) || 1)
    const skip = (safePage - 1) * safeLimit

    const transactions = await Payment.find(query)
      .populate('sender', 'firstName lastName email phone')
      .populate('recipient', 'firstName lastName email phone')
      .populate('venueId', 'name address')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean()
    
    const total = await Payment.countDocuments(query)
    
    // Calculate commissions for each transaction
    const transactionsWithCommissions = transactions.map(t => {
      let commission = 0
      if (t.metadata?.commission) {
        commission = parseFloat(t.metadata.commission)
      } else {
        const amount = t.amount || 0
        commission = amount < 20 ? 0.25 : amount * 0.01 // Minimal commission
      }
      return {
        ...t,
        commission: commission.toFixed(2),
        venueReceives: (t.amount - commission).toFixed(2)
      }
    })
    
    res.json({
      transactions: transactionsWithCommissions,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit)
      }
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    res.status(500).json({ message: 'Server error'})
  }
})

// @route   GET /api/owner/users
// @desc    Get user analytics
// @access  Private (Owner only)
router.get('/users', auth, isOwner, async (req, res) => {
  try {
    const { page = 1, limit = 50, sortBy = 'createdAt', order = 'desc' } = req.query

    // Whitelist sortBy to prevent operator injection
    const allowedSortFields = ['createdAt', 'lastActive', 'firstName', 'lastName', 'email']
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt'
    const safeLimit = Math.min(200, Math.max(1, parseInt(limit) || 50))
    const safePage = Math.max(1, parseInt(page) || 1)
    const skip = (safePage - 1) * safeLimit
    const sort = { [safeSortBy]: order === 'desc' ? -1 : 1 }

    const users = await User.find({ userType: { $ne: 'venue' } })
      .select('firstName lastName email phone wallet createdAt lastActive')
      .sort(sort)
      .skip(skip)
      .limit(safeLimit)
      .lean()

    const total = await User.countDocuments({ userType: { $ne: 'venue' } })

    // Add wallet balance to each user
    const usersWithBalance = users.map(u => ({
      ...u,
      walletBalance: (u.wallet?.balance || 0).toFixed(2)
    }))

    res.json({
      users: usersWithBalance,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit)
      }
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ message: 'Server error'})
  }
})

// @route   GET /api/owner/venues
// @desc    Get venue analytics
// @access  Private (Owner only)
router.get('/venues', auth, isOwner, async (req, res) => {
  try {
    const venues = await Venue.find()
      .populate('owner', 'email firstName lastName')
      .lean()
    
    // Deduplicate venues by name and owner
    // Keep the most recent one if duplicates exist
    const venueMap = new Map()
    venues.forEach(venue => {
      const key = `${venue.name?.toLowerCase().trim()}_${venue.owner?._id?.toString() || venue.owner?.toString()}`
      if (!venueMap.has(key)) {
        venueMap.set(key, venue)
      } else {
        // If duplicate, keep the one with more recent creation date or more data
        const existing = venueMap.get(key)
        const existingDate = existing.createdAt ? new Date(existing.createdAt) : new Date(0)
        const newDate = venue.createdAt ? new Date(venue.createdAt) : new Date(0)
        if (newDate > existingDate || (venue.promotions?.length || 0) > (existing.promotions?.length || 0)) {
          venueMap.set(key, venue)
        }
      }
    })
    
    const uniqueVenues = Array.from(venueMap.values())
    
    // Calculate revenue per venue
    const venuesWithStats = await Promise.all(uniqueVenues.map(async (venue) => {
      const venuePayments = await Payment.find({
        venueId: venue._id,
        status: 'succeeded'
      })
      
      const revenue = venuePayments.reduce((sum, p) => sum + (p.amount || 0), 0)
      const transactionCount = venuePayments.length
      
      return {
        ...venue,
        revenue: revenue.toFixed(2),
        transactionCount,
        hasStripe: !!venue.stripeAccountId,
        activePromotions: (venue.promotions || []).filter(p => p.isActive).length
      }
    }))
    
    // Sort by name for easier viewing
    venuesWithStats.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    
    res.json({ 
      venues: venuesWithStats,
      total: venues.length,
      unique: uniqueVenues.length,
      duplicates: venues.length - uniqueVenues.length
    })
  } catch (error) {
    console.error('Error fetching venues:', error)
    res.status(500).json({ message: 'Server error'})
  }
})

// @route   GET /api/owner/virtual-cards
// @desc    Get virtual card statistics
// @access  Private (Owner only)
router.get('/virtual-cards', auth, isOwner, async (req, res) => {
  try {
    const cards = await VirtualCard.find()
      .populate('userId', 'firstName lastName email')
      .lean()
    
    const stats = {
      total: cards.length,
      active: cards.filter(c => c.status === 'active').length,
      inactive: cards.filter(c => c.status === 'inactive').length,
      canceled: cards.filter(c => c.status === 'canceled').length,
      totalBalance: cards.reduce((sum, c) => sum + (c.balance || 0), 0).toFixed(2),
      averageBalance: cards.length > 0 
        ? (cards.reduce((sum, c) => sum + (c.balance || 0), 0) / cards.length).toFixed(2)
        : '0.00'
    }
    
    res.json({
      stats,
      cards: cards.map(c => ({
        ...c,
        balance: (c.balance || 0).toFixed(2)
      }))
    })
  } catch (error) {
    console.error('Error fetching virtual cards:', error)
    res.status(500).json({ message: 'Server error'})
  }
})

// @route   GET /api/owner/revenue-trends
// @desc    Get revenue trends over time
// @access  Private (Owner only)
router.get('/revenue-trends', auth, isOwner, async (req, res) => {
  try {
    const { period = '30' } = req.query // days
    const days = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const payments = await Payment.find({
      status: 'succeeded',
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 }).lean()
    
    // Group by day
    const dailyRevenue = {}
    const dailyCommissions = {}
    
    payments.forEach(payment => {
      const date = new Date(payment.createdAt).toISOString().split('T')[0]
      const amount = payment.amount || 0
      let commission = 0
      
      if (payment.metadata?.commission) {
        commission = parseFloat(payment.metadata.commission)
      } else {
        commission = amount < 20 ? 0.25 : amount * 0.01 // Minimal commission
      }
      
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = 0
        dailyCommissions[date] = 0
      }
      
      dailyRevenue[date] += amount
      dailyCommissions[date] += commission
    })
    
    // Convert to array format
    const trends = Object.keys(dailyRevenue).map(date => ({
      date,
      revenue: dailyRevenue[date].toFixed(2),
      commissions: dailyCommissions[date].toFixed(2),
      transactions: payments.filter(p => 
        new Date(p.createdAt).toISOString().split('T')[0] === date
      ).length
    }))
    
    res.json({ trends })
  } catch (error) {
    console.error('Error fetching revenue trends:', error)
    res.status(500).json({ message: 'Server error'})
  }
})

// @route   GET /api/owner/system-health
// @desc    Get system health metrics
// @access  Private (Owner only)
router.get('/system-health', auth, isOwner, async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    
    // Get recent errors (you might want to log errors to a separate collection)
    const recentPayments = await Payment.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
    
    const failedPayments = recentPayments.filter(p => p.status === 'failed').length
    const successRate = recentPayments.length > 0
      ? ((recentPayments.length - failedPayments) / recentPayments.length * 100).toFixed(2)
      : '100.00'
    
    res.json({
      database: {
        status: dbStatus,
        connectionState: mongoose.connection.readyState
      },
      payments: {
        recentCount: recentPayments.length,
        failedCount: failedPayments,
        successRate: `${successRate}%`
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching system health:', error)
    res.status(500).json({ message: 'Server error'})
  }
})

// @route   GET /api/owner/reports
// @desc    List user-submitted content reports for moderation
// @access  Private (Owner only)
router.get('/reports', auth, isOwner, async (req, res) => {
  try {
    const Report = require('../models/Report')
    const { status = 'pending', limit = 50, skip = 0 } = req.query
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50))
    const skipNum = Math.max(0, parseInt(skip) || 0)

    const validStatuses = ['pending', 'reviewed', 'resolved', 'dismissed']
    const statusFilter = validStatuses.includes(status) ? status : 'pending'

    const [reports, total] = await Promise.all([
      Report.find({ status: statusFilter })
        .populate('reporter', 'name profilePicture')
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip(skipNum)
        .lean(),
      Report.countDocuments({ status: statusFilter })
    ])

    res.json({ reports, total, status: statusFilter })
  } catch (error) {
    console.error('Error fetching reports:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   PATCH /api/owner/reports/:reportId
// @desc    Update report status (reviewed / resolved / dismissed)
// @access  Private (Owner only)
router.patch('/reports/:reportId', auth, isOwner, async (req, res) => {
  try {
    const Report = require('../models/Report')
    const { status } = req.body
    const validStatuses = ['reviewed', 'resolved', 'dismissed']

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` })
    }

    const report = await Report.findByIdAndUpdate(
      req.params.reportId,
      { status, reviewedBy: req.user.userId, reviewedAt: new Date() },
      { new: true }
    )
    if (!report) return res.status(404).json({ message: 'Report not found' })

    res.json({ report })
  } catch (error) {
    console.error('Error updating report:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router

