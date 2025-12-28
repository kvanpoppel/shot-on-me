const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Venue = require('../models/Venue');
const Payment = require('../models/Payment');
const stripeUtils = require('../utils/stripe');

// Get venue earnings and payout information
router.get('/earnings', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Find venue owned by user
    const venue = await Venue.findOne({ owner: req.user.userId });
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    if (!venue.stripeAccountId) {
      return res.json({
        connected: false,
        message: 'Stripe account not connected',
        earnings: {
          total: 0,
          pending: 0,
          available: 0
        },
        payouts: []
      });
    }

    // Get date range
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get payments redeemed at this venue
    const payments = await Payment.find({
      venueId: venue._id,
      type: { $in: ['shot_redeemed', 'transfer'] },
      status: 'succeeded',
      createdAt: { $gte: start, $lte: end }
    }).sort({ createdAt: -1 });

    // Calculate earnings
    const totalEarnings = payments.reduce((sum, p) => sum + p.amount, 0);

    // Get Stripe account balance if connected
    let stripeBalance = { available: 0, pending: 0 };
    try {
      if (stripeUtils.isStripeConfigured()) {
        const stripe = stripeUtils.stripe;
        const balance = await stripe.balance.retrieve({
          stripeAccount: venue.stripeAccountId
        });
        stripeBalance = {
          available: balance.available[0]?.amount / 100 || 0,
          pending: balance.pending[0]?.amount / 100 || 0
        };
      }
    } catch (error) {
      console.error('Error fetching Stripe balance:', error);
    }

    // Get payout history from Stripe
    let payouts = [];
    try {
      if (stripeUtils.isStripeConfigured()) {
        const stripe = stripeUtils.stripe;
        const stripePayouts = await stripe.payouts.list({
          limit: 20
        }, {
          stripeAccount: venue.stripeAccountId
        });
        payouts = stripePayouts.data.map(p => ({
          id: p.id,
          amount: p.amount / 100,
          currency: p.currency,
          status: p.status,
          arrivalDate: new Date(p.arrival_date * 1000),
          createdAt: new Date(p.created * 1000)
        }));
      }
    } catch (error) {
      console.error('Error fetching payouts:', error);
    }

    res.json({
      connected: true,
      venue: {
        id: venue._id,
        name: venue.name
      },
      earnings: {
        total: totalEarnings,
        available: stripeBalance.available,
        pending: stripeBalance.pending,
        period: {
          start,
          end
        }
      },
      recentPayments: payments.slice(0, 10).map(p => ({
        id: p._id,
        amount: p.amount,
        createdAt: p.createdAt,
        sender: p.senderId
      })),
      payouts
    });
  } catch (error) {
    console.error('Error fetching venue earnings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get payout history
router.get('/history', auth, async (req, res) => {
  try {
    // Find venue owned by user
    const venue = await Venue.findOne({ owner: req.user.userId });
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found', payouts: [] });
    }

    if (!venue.stripeAccountId) {
      return res.json({ payouts: [] });
    }

    // Get payout history from Stripe
    let payouts = [];
    try {
      if (stripeUtils.isStripeConfigured()) {
        const stripe = stripeUtils.stripe;
        const stripePayouts = await stripe.payouts.list({
          limit: 50
        }, {
          stripeAccount: venue.stripeAccountId
        });
        payouts = stripePayouts.data.map(p => ({
          _id: p.id,
          amount: p.amount / 100,
          status: p.status,
          arrivalDate: new Date(p.arrival_date * 1000).toISOString(),
          createdAt: new Date(p.created * 1000).toISOString(),
          stripePayoutId: p.id
        }));
      }
    } catch (error) {
      console.error('Error fetching payout history:', error);
    }

    res.json({ payouts });
  } catch (error) {
    console.error('Error fetching payout history:', error);
    res.status(500).json({ message: 'Server error', error: error.message, payouts: [] });
  }
});

// Request payout (transfer to venue's bank account)
router.post('/request-payout', auth, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    // Find venue owned by user
    const venue = await Venue.findOne({ owner: req.user.userId });
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    if (!venue.stripeAccountId) {
      return res.status(400).json({ 
        message: 'Stripe account not connected',
        error: 'Please connect your Stripe account first'
      });
    }

    if (!stripeUtils.isStripeConfigured()) {
      return res.status(503).json({ 
        error: 'Stripe is not configured',
        message: 'Payment processing is currently unavailable'
      });
    }

    // Check available balance
    const stripe = stripeUtils.stripe;
    const balance = await stripe.balance.retrieve({
      stripeAccount: venue.stripeAccountId
    });

    const availableBalance = balance.available[0]?.amount / 100 || 0;
    if (availableBalance < amount) {
      return res.status(400).json({ 
        message: 'Insufficient balance',
        available: availableBalance,
        requested: amount
      });
    }

    // Create payout
    const payout = await stripe.payouts.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
    }, {
      stripeAccount: venue.stripeAccountId
    });

    res.json({
      success: true,
      payout: {
        id: payout.id,
        amount: payout.amount / 100,
        status: payout.status,
        arrivalDate: new Date(payout.arrival_date * 1000),
        createdAt: new Date(payout.created * 1000)
      }
    });
  } catch (error) {
    console.error('Error requesting payout:', error);
    res.status(500).json({ 
      message: 'Failed to request payout',
      error: error.message 
    });
  }
});

module.exports = router;

