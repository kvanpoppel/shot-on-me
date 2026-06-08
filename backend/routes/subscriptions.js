const express = require('express');
const auth = require('../middleware/auth');
const Venue = require('../models/Venue');
const router = express.Router();

const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

// Plan config — single source of truth
const PLANS = {
  basic: {
    name: 'Pro',
    monthlyPrice: 2900, // cents
    features: ['Unlimited deals', 'AI suggestions', 'Full analytics', 'Recurring deals'],
  },
  premium: {
    name: 'Business',
    monthlyPrice: 9900,
    features: ['Everything in Pro', 'Featured placement', 'Advanced automation', 'Priority support'],
  },
};

const TIER_RANK = { free: 0, basic: 1, premium: 2 };

// ──────────────────────────────────────────────────
// POST /api/subscriptions/checkout — create Stripe Checkout session
// ──────────────────────────────────────────────────
router.post('/checkout', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Payments not configured' });

    const { tier } = req.body;
    if (!PLANS[tier]) return res.status(400).json({ error: 'Invalid plan' });

    const venue = await Venue.findOne({
      $or: [{ owner: req.user.userId }, { 'staff.user': req.user.userId }]
    }).populate('owner');
    if (!venue) return res.status(404).json({ error: 'No venue found' });

    // Only owner can change subscription
    if (venue.owner._id.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only the venue owner can manage subscriptions' });
    }

    const plan = PLANS[tier];
    const currentTier = venue.subscriptionTier || 'free';
    const currentRank = TIER_RANK[currentTier] || 0;
    const targetRank = TIER_RANK[tier] || 0;

    // Check downgrade restrictions
    if (targetRank < currentRank) {
      // Count active promotions for downgrade check
      if (tier === 'free') {
        const activePromos = (venue.promotions || []).filter(p => p.isActive).length;
        if (activePromos > 2) {
          return res.status(400).json({
            error: `You have ${activePromos} active deals. Free plan allows 2. End ${activePromos - 2} deals before downgrading.`
          });
        }
      }
    }

    // If venue already has a Stripe subscription, create portal session for plan change
    if (venue.stripeSubscriptionId && venue.stripeCustomerId) {
      try {
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: venue.stripeCustomerId,
          return_url: `${process.env.VENUE_PORTAL_URL || 'https://venue.shotonme.com'}/dashboard/settings?billing=done`,
        });
        return res.json({ url: portalSession.url, type: 'portal' });
      } catch (portalErr) {
        console.error('Portal session failed, falling back to checkout:', portalErr.message);
      }
    }

    // Create or reuse Stripe customer
    let customerId = venue.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: venue.owner.email,
        name: venue.name,
        metadata: { venueId: venue._id.toString(), userId: req.user.userId },
      });
      customerId = customer.id;
      venue.stripeCustomerId = customerId;
      await venue.save();
    }

    // Create Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Shot On Me ${plan.name} Plan`,
            description: plan.features.join(' · '),
          },
          unit_amount: plan.monthlyPrice,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      subscription_data: {
        metadata: {
          venueId: venue._id.toString(),
          tier,
        },
        proration_behavior: 'create_prorations',
      },
      success_url: `${process.env.VENUE_PORTAL_URL || 'https://venue.shotonme.com'}/dashboard/settings?upgraded=${tier}`,
      cancel_url: `${process.env.VENUE_PORTAL_URL || 'https://venue.shotonme.com'}/dashboard/settings?canceled=true`,
      allow_promotion_codes: true,
    });

    res.json({ url: session.url, type: 'checkout' });
  } catch (err) {
    console.error('Subscription checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ──────────────────────────────────────────────────
// POST /api/subscriptions/portal — Stripe Billing Portal for managing existing sub
// ──────────────────────────────────────────────────
router.post('/portal', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Payments not configured' });

    const venue = await Venue.findOne({
      $or: [{ owner: req.user.userId }, { 'staff.user': req.user.userId }]
    });
    if (!venue) return res.status(404).json({ error: 'No venue found' });
    if (!venue.stripeCustomerId) return res.status(400).json({ error: 'No billing account found' });

    const session = await stripe.billingPortal.sessions.create({
      customer: venue.stripeCustomerId,
      return_url: `${process.env.VENUE_PORTAL_URL || 'https://venue.shotonme.com'}/dashboard/settings?billing=done`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Billing portal error:', err);
    res.status(500).json({ error: 'Failed to open billing portal' });
  }
});

// ──────────────────────────────────────────────────
// POST /api/subscriptions/change — switch plan (up or down)
// For venues with existing subscription — handles proration
// ──────────────────────────────────────────────────
router.post('/change', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Payments not configured' });

    const { tier } = req.body;
    if (!PLANS[tier] && tier !== 'free') return res.status(400).json({ error: 'Invalid plan' });

    const venue = await Venue.findOne({ owner: req.user.userId });
    if (!venue) return res.status(404).json({ error: 'No venue found or not the owner' });

    const currentTier = venue.subscriptionTier || 'free';

    // Downgrade to free = cancel subscription
    if (tier === 'free') {
      const activePromos = (venue.promotions || []).filter(p => p.isActive).length;
      if (activePromos > 2) {
        return res.status(400).json({
          error: `You have ${activePromos} active deals. Free plan allows 2. End ${activePromos - 2} deals before downgrading.`
        });
      }

      if (venue.stripeSubscriptionId) {
        // Cancel at period end — they keep access until subscription expires
        await stripe.subscriptions.update(venue.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
        return res.json({
          message: 'Your subscription will cancel at the end of the current billing period. You keep full access until then.',
          downgradePending: true,
        });
      }

      // No stripe sub — just set to free
      venue.subscriptionTier = 'free';
      await venue.save();
      return res.json({ message: 'Switched to free plan', tier: 'free' });
    }

    // Upgrade or switch paid tiers
    if (!venue.stripeSubscriptionId) {
      // No existing subscription — redirect to checkout
      return res.status(400).json({ error: 'No active subscription. Use /checkout to start one.' });
    }

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(venue.stripeSubscriptionId);
    const currentItem = subscription.items.data[0];

    // Update subscription with new price — Stripe handles proration automatically
    const updated = await stripe.subscriptions.update(venue.stripeSubscriptionId, {
      items: [{
        id: currentItem.id,
        price_data: {
          currency: 'usd',
          product: currentItem.price.product,
          unit_amount: PLANS[tier].monthlyPrice,
          recurring: { interval: 'month' },
        },
      }],
      proration_behavior: 'always_invoice',
      metadata: { tier, venueId: venue._id.toString() },
    });

    // Update venue tier immediately for upgrades
    venue.subscriptionTier = tier;
    venue.subscriptionExpiresAt = new Date(updated.current_period_end * 1000);
    await venue.save();

    res.json({
      message: `Switched to ${PLANS[tier].name} plan. Billing has been pro-rated.`,
      tier,
      currentPeriodEnd: venue.subscriptionExpiresAt,
    });
  } catch (err) {
    console.error('Subscription change error:', err);
    res.status(500).json({ error: 'Failed to change plan' });
  }
});

// ──────────────────────────────────────────────────
// GET /api/subscriptions/status — current subscription status
// ──────────────────────────────────────────────────
router.get('/status', auth, async (req, res) => {
  try {
    const venue = await Venue.findOne({
      $or: [{ owner: req.user.userId }, { 'staff.user': req.user.userId }]
    });
    if (!venue) return res.status(404).json({ error: 'No venue found' });

    const result = {
      tier: venue.subscriptionTier || 'free',
      expiresAt: venue.subscriptionExpiresAt,
      hasStripeSubscription: !!venue.stripeSubscriptionId,
      cancelPending: false,
    };

    // Check if cancellation is pending
    if (venue.stripeSubscriptionId && stripe) {
      try {
        const sub = await stripe.subscriptions.retrieve(venue.stripeSubscriptionId);
        result.cancelPending = sub.cancel_at_period_end;
        result.currentPeriodEnd = new Date(sub.current_period_end * 1000);
      } catch { /* sub may not exist */ }
    }

    res.json(result);
  } catch (err) {
    console.error('Subscription status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ──────────────────────────────────────────────────
// POST /api/subscriptions/webhook — Stripe webhook handler
// ──────────────────────────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(503).send();

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode === 'subscription') {
        const venueId = session.subscription
          ? (await stripe.subscriptions.retrieve(session.subscription))?.metadata?.venueId
          : null;
        if (venueId) {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          await Venue.findByIdAndUpdate(venueId, {
            subscriptionTier: sub.metadata.tier || 'basic',
            stripeSubscriptionId: session.subscription,
            stripeCustomerId: session.customer,
            subscriptionExpiresAt: new Date(sub.current_period_end * 1000),
          });
          console.log(`✅ Venue ${venueId} upgraded to ${sub.metadata.tier}`);
        }
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const venueId = sub.metadata?.venueId;
      if (venueId) {
        const updates = {
          subscriptionExpiresAt: new Date(sub.current_period_end * 1000),
        };
        if (sub.metadata.tier) updates.subscriptionTier = sub.metadata.tier;
        if (sub.cancel_at_period_end) {
          console.log(`⏳ Venue ${venueId} subscription cancels at period end`);
        }
        await Venue.findByIdAndUpdate(venueId, updates);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const venueId = sub.metadata?.venueId;
      if (venueId) {
        await Venue.findByIdAndUpdate(venueId, {
          subscriptionTier: 'free',
          stripeSubscriptionId: null,
        });
        console.log(`🔻 Venue ${venueId} downgraded to free (subscription ended)`);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      console.warn(`⚠️ Payment failed for customer ${invoice.customer}`);
      break;
    }
  }

  res.json({ received: true });
});

module.exports = router;
