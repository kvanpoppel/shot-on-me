const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Wallet limits by KYC tier
const KYC_LIMITS = {
  unverified: {
    maxBalance: 500,       // $500 max wallet balance
    dailyAddFunds: 200,    // $200/day add-funds cap
    label: 'Basic'
  },
  pending: {
    maxBalance: 500,
    dailyAddFunds: 200,
    label: 'Verification Pending'
  },
  verified: {
    maxBalance: 5000,      // $5000 max wallet balance
    dailyAddFunds: 2000,   // $2000/day add-funds cap
    label: 'Verified'
  },
  failed: {
    maxBalance: 200,
    dailyAddFunds: 50,
    label: 'Verification Failed'
  }
};

// Initialize Stripe (Identity requires stripe >= 10.x)
const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

// GET /api/kyc/status
// Returns current KYC status + wallet limits for the user
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('kyc wallet name email');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const kycStatus = user.kyc?.status || 'unverified';
    const limits = KYC_LIMITS[kycStatus] || KYC_LIMITS.unverified;

    res.json({
      success: true,
      kyc: {
        status: kycStatus,
        verifiedAt: user.kyc?.verifiedAt || null,
        failureReason: kycStatus === 'failed' ? user.kyc?.failureReason : undefined
      },
      limits: {
        maxBalance: limits.maxBalance,
        dailyAddFunds: limits.dailyAddFunds,
        label: limits.label
      },
      currentBalance: user.wallet?.balance || 0
    });
  } catch (error) {
    console.error('Error fetching KYC status:', error);
    res.status(500).json({ message: 'Failed to fetch KYC status', error: undefined });
  }
});

// POST /api/kyc/start
// Initiates a Stripe Identity verification session
router.post('/start', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('kyc name email');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.kyc?.status === 'verified') {
      return res.json({
        success: true,
        alreadyVerified: true,
        message: 'Your identity is already verified'
      });
    }

    if (!stripe) {
      // Fallback: flag as pending for manual review (no Stripe Identity configured)
      user.kyc = user.kyc || {};
      user.kyc.status = 'pending';
      await user.save();
      return res.json({
        success: true,
        manual: true,
        message: 'Identity verification request received. Our team will review within 1–2 business days.',
        status: 'pending'
      });
    }

    // Create Stripe Identity verification session
    const session = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: {
        userId: req.user.userId.toString(),
        userEmail: user.email
      },
      options: {
        document: {
          allowed_types: ['driving_license', 'id_card', 'passport'],
          require_id_number: true,
          require_live_capture: true,
          require_matching_selfie: true
        }
      },
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/wallet?kyc=complete`
    });

    // Store session ID so we can verify the webhook later
    user.kyc = user.kyc || {};
    user.kyc.status = 'pending';
    user.kyc.stripeVerificationSessionId = session.id;
    await user.save();

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,         // Redirect user to this Stripe-hosted flow
      clientSecret: session.client_secret  // For embedded flow (optional)
    });
  } catch (error) {
    console.error('Error starting KYC:', error);
    res.status(500).json({ message: 'Failed to start identity verification', error: undefined });
  }
});

// Standalone webhook handler — exported for server.js raw-body registration
// app.post('/api/kyc/webhook', express.raw({ type: 'application/json' }), kycRouter.kycWebhook)
async function kycWebhookHandler(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_IDENTITY_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (stripe && webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('KYC webhook signature error:', err.message);
    return res.status(400).json({ message: 'Webhook signature verification failed' });
  }

  try {
    const session = event.data?.object;

    switch (event.type) {
      case 'identity.verification_session.verified': {
        const userId = session.metadata?.userId;
        if (userId) {
          await User.findByIdAndUpdate(userId, {
            'kyc.status': 'verified',
            'kyc.verifiedAt': new Date(),
            'kyc.stripeVerificationSessionId': session.id,
            'kyc.failureReason': null
          });
          console.log(`KYC verified for user ${userId}`);
        }
        break;
      }

      case 'identity.verification_session.requires_input': {
        const userId = session.metadata?.userId;
        if (userId) {
          const failureReason = session.last_error?.reason || 'Verification could not be completed';
          await User.findByIdAndUpdate(userId, {
            'kyc.status': 'failed',
            'kyc.failureReason': failureReason
          });
          console.log(`KYC failed for user ${userId}: ${failureReason}`);
        }
        break;
      }

      default:
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('KYC webhook handler error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
}

module.exports = router;
module.exports.kycWebhook = kycWebhookHandler;
module.exports.KYC_LIMITS = KYC_LIMITS;
