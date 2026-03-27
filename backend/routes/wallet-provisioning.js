/**
 * Wallet Provisioning — Push virtual card to Apple Wallet / Google Pay
 *
 * Apple Pay push provisioning requires:
 *   - Stripe Issuing + push provisioning add-on (enterprise feature, requires Stripe approval)
 *   - Apple certificate (com.apple.developer.payment-pass-provisioning entitlement)
 *
 * Google Pay push provisioning requires:
 *   - Stripe Issuing + Google Pay push provisioning approval
 *   - Android app integration via Google Pay Push Provisioning API
 *
 * This route handles the backend portion. The frontend initiates via
 * POST /api/wallet-provisioning/apple or /google, and this returns
 * the encrypted payload for the mobile SDK to pass to the OS wallet.
 *
 * Until Stripe approves push provisioning for this account, the status
 * endpoint returns provisioning_unavailable and the UI shows "Coming Soon".
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const VirtualCard = require('../models/VirtualCard');

const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

// GET /api/wallet-provisioning/status
// Returns whether provisioning is available for this user/card
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('kyc wallet');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const virtualCard = await VirtualCard.findOne({
      userId: req.user.userId,
      status: 'active'
    }).select('stripeCardId last4 brand');

    if (!virtualCard) {
      return res.json({
        success: true,
        hasCard: false,
        apple: { available: false, reason: 'No active virtual card' },
        google: { available: false, reason: 'No active virtual card' }
      });
    }

    // Push provisioning requires Stripe enterprise approval
    // Check by attempting to read card wallet field
    let pushProvisioningEnabled = false;
    if (stripe && virtualCard.stripeCardId) {
      try {
        const card = await stripe.issuing.cards.retrieve(virtualCard.stripeCardId, {
          expand: ['wallets']
        });
        // If wallets object exists and push provisioning not explicitly blocked, assume available
        pushProvisioningEnabled = !!card.wallets;
      } catch {
        pushProvisioningEnabled = false;
      }
    }

    res.json({
      success: true,
      hasCard: true,
      card: { last4: virtualCard.last4, brand: virtualCard.brand },
      apple: {
        available: pushProvisioningEnabled,
        reason: pushProvisioningEnabled ? null : 'Push provisioning requires Stripe enterprise approval'
      },
      google: {
        available: pushProvisioningEnabled,
        reason: pushProvisioningEnabled ? null : 'Push provisioning requires Stripe enterprise approval'
      }
    });
  } catch (error) {
    console.error('Error checking provisioning status:', error);
    res.status(500).json({ message: 'Failed to check provisioning status', error: undefined });
  }
});

// POST /api/wallet-provisioning/apple
// Returns encrypted payload for Apple Wallet push provisioning
// The mobile app passes this payload to PKAddPaymentPassViewController
router.post('/apple', auth, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ message: 'Stripe not configured' });
    }

    const {
      certificateLeaf,     // Base64-encoded Apple certificate (leaf)
      certificateSub,      // Base64-encoded Apple certificate (sub-CA)
      nonce,               // Nonce from Apple (hex string)
      nonceSignature        // Nonce signature from Apple
    } = req.body;

    if (!certificateLeaf || !certificateSub || !nonce || !nonceSignature) {
      return res.status(400).json({
        message: 'certificateLeaf, certificateSub, nonce, and nonceSignature are required'
      });
    }

    const virtualCard = await VirtualCard.findOne({
      userId: req.user.userId,
      status: 'active'
    }).select('stripeCardId');

    if (!virtualCard) {
      return res.status(404).json({ message: 'No active virtual card found' });
    }

    // Call Stripe Issuing push provisioning for Apple Wallet
    const provisioningDetails = await stripe.issuing.cards.createProvisioningTokens(
      virtualCard.stripeCardId,
      {
        wallet: 'apple_pay',
        certificate: certificateLeaf,
        nonce,
        nonce_signature: nonceSignature
      }
    );

    res.json({
      success: true,
      activationData: provisioningDetails.activationData,
      encryptedPassData: provisioningDetails.encryptedPassData,
      ephemeralPublicKey: provisioningDetails.ephemeralPublicKey
    });
  } catch (error) {
    console.error('Apple Pay provisioning error:', error);
    if (error.code === 'feature_not_available' || error.message?.includes('push provisioning')) {
      return res.status(503).json({
        message: 'Apple Pay push provisioning is not yet enabled for this account. Contact Stripe support.',
        code: 'provisioning_unavailable'
      });
    }
    res.status(500).json({ message: 'Failed to provision Apple Wallet card', error: undefined });
  }
});

// POST /api/wallet-provisioning/google
// Returns encrypted payload for Google Pay push provisioning
// The Android app passes this payload to PushProvisioningRequestBuilder
router.post('/google', auth, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ message: 'Stripe not configured' });
    }

    const {
      walletAccountId,   // Google wallet account ID
      deviceId,          // Android device ID
      locale             // Locale string (e.g. 'en-US')
    } = req.body;

    if (!walletAccountId || !deviceId) {
      return res.status(400).json({
        message: 'walletAccountId and deviceId are required'
      });
    }

    const virtualCard = await VirtualCard.findOne({
      userId: req.user.userId,
      status: 'active'
    }).select('stripeCardId');

    if (!virtualCard) {
      return res.status(404).json({ message: 'No active virtual card found' });
    }

    // Call Stripe Issuing push provisioning for Google Pay
    const provisioningDetails = await stripe.issuing.cards.createProvisioningTokens(
      virtualCard.stripeCardId,
      {
        wallet: 'google_pay',
        wallet_account_id: walletAccountId,
        device_id: deviceId,
        ...(locale && { locale })
      }
    );

    res.json({
      success: true,
      pushTokenizeRequestData: provisioningDetails.pushTokenizeRequestData,
      opaquePaymentCard: provisioningDetails.opaquePaymentCard
    });
  } catch (error) {
    console.error('Google Pay provisioning error:', error);
    if (error.code === 'feature_not_available' || error.message?.includes('push provisioning')) {
      return res.status(503).json({
        message: 'Google Pay push provisioning is not yet enabled for this account. Contact Stripe support.',
        code: 'provisioning_unavailable'
      });
    }
    res.status(500).json({ message: 'Failed to provision Google Pay card', error: undefined });
  }
});

module.exports = router;
