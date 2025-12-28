const express = require('express');
const VirtualCard = require('../models/VirtualCard');
const User = require('../models/User');
const auth = require('../middleware/auth');
const stripeUtils = require('../utils/stripe');

const router = express.Router();

// Check if user has a virtual card
router.get('/status', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const card = await VirtualCard.findOne({ user: userId });
    const user = await User.findById(userId);
    
    if (!card) {
      // Allow card creation even with $0 balance (user can add funds after)
      return res.json({
        hasCard: false,
        canCreate: true, // Always allow first card creation
        balance: user?.wallet?.balance || 0,
        minimumRequired: 0 // No minimum for first card
      });
    }

    // Check if Stripe Issuing is enabled
    const issuingEnabled = await stripeUtils.isIssuingEnabled();
    
    return res.json({
      hasCard: true,
      card: {
        id: card._id,
        last4: card.last4,
        brand: card.brand,
        status: card.status,
        expirationMonth: card.expirationMonth,
        expirationYear: card.expirationYear,
        addedToAppleWallet: card.addedToAppleWallet,
        addedToGooglePay: card.addedToGooglePay,
        minimumBalance: card.minimumBalance,
        spendingLimits: card.spendingLimits
      },
      balance: user?.wallet?.balance || 0,
      issuingEnabled
    });
  } catch (error) {
    console.error('Error checking card status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create virtual card for user
router.post('/create', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Check if Stripe Issuing is enabled
    const issuingEnabled = await stripeUtils.isIssuingEnabled();
    if (!issuingEnabled) {
      return res.status(503).json({
        error: 'Stripe Issuing is not enabled',
        message: 'Virtual card creation requires Stripe Issuing to be enabled. Please enable it in your Stripe Dashboard.',
        instructions: 'Go to https://dashboard.stripe.com/issuing and click "Enable Issuing"',
        code: 'ISSUING_NOT_ENABLED'
      });
    }

    // Check if user already has a card
    const existingCard = await VirtualCard.findOne({ user: userId });
    if (existingCard && existingCard.status === 'active') {
      return res.status(400).json({
        message: 'User already has an active virtual card',
        card: existingCard
      });
    }

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if this is the user's first card
    const isFirstCard = !existingCard;
    
    // For first card, no minimum balance required (user needs to add funds first)
    // For subsequent cards (if recreating), require minimum balance
    if (!isFirstCard) {
      const balance = user.wallet?.balance || 0;
      if (balance < 5.00) {
        return res.status(400).json({
          message: 'Minimum balance of $5.00 required to recreate card',
          balance: balance,
          minimumRequired: 5.00
        });
      }
    }

    // Check age (must be 18+)
    // Note: You'll need to add age verification to User model
    // For now, we'll assume it's verified during signup

    // Create virtual card via Stripe
    const cardData = await stripeUtils.createVirtualCard(userId, {
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      address: user.address
    });

    // Save card to database
    let virtualCard;
    if (existingCard) {
      // Update existing inactive card
      existingCard.stripeCardId = cardData.cardId;
      existingCard.stripeCardholderId = cardData.cardholderId;
      existingCard.last4 = cardData.last4;
      existingCard.brand = cardData.brand;
      existingCard.expirationMonth = cardData.expirationMonth;
      existingCard.expirationYear = cardData.expirationYear;
      existingCard.status = 'active';
      existingCard.metadata.createdAt = new Date();
      await existingCard.save();
      virtualCard = existingCard;
    } else {
      // Create new card record
      virtualCard = new VirtualCard({
        user: userId,
        stripeCardId: cardData.cardId,
        stripeCardholderId: cardData.cardholderId,
        last4: cardData.last4,
        brand: cardData.brand,
        expirationMonth: cardData.expirationMonth,
        expirationYear: cardData.expirationYear,
        status: 'active',
        metadata: {
          createdAt: new Date()
        }
      });
      await virtualCard.save();
    }

    res.status(201).json({
      message: 'Virtual card created successfully',
      card: {
        id: virtualCard._id,
        last4: virtualCard.last4,
        brand: virtualCard.brand,
        expirationMonth: virtualCard.expirationMonth,
        expirationYear: virtualCard.expirationYear,
        status: virtualCard.status
      },
      // Include card details for mobile wallet integration
      stripeCardId: cardData.cardId,
      cardDetails: cardData.card
    });
  } catch (error) {
    console.error('Error creating virtual card:', error);
    
    // Handle Stripe-specific errors
    if (error.type === 'StripeCardError' || error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        message: 'Failed to create virtual card',
        error: error.message
      });
    }
    
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// Delete/deactivate virtual card
router.delete('/:cardId', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { cardId } = req.params;
    
    const card = await VirtualCard.findOne({ _id: cardId, user: userId });
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    // Update card status to inactive (don't delete from Stripe, just deactivate)
    card.status = 'inactive';
    card.lastDeletedAt = new Date();
    await card.save();

    // Optionally deactivate in Stripe
    try {
      await stripeUtils.updateCardStatus(card.stripeCardId, 'inactive');
    } catch (stripeError) {
      console.error('Error deactivating card in Stripe:', stripeError);
      // Continue even if Stripe update fails
    }

    res.json({
      message: 'Card deactivated successfully',
      card: {
        id: card._id,
        status: card.status
      }
    });
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get card details for mobile wallet
router.get('/wallet-details/:cardId', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { cardId } = req.params;
    
    const card = await VirtualCard.findOne({ _id: cardId, user: userId });
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    // Get latest card details from Stripe
    const stripeCard = await stripeUtils.getCardDetails(card.stripeCardId);
    const user = await User.findById(userId);

    res.json({
      card: {
        id: card._id,
        last4: card.last4,
        brand: card.brand,
        expirationMonth: card.expirationMonth,
        expirationYear: card.expirationYear,
        status: card.status
      },
      user: {
        name: `${user.firstName} ${user.lastName}`.trim() || user.name,
        email: user.email
      },
      balance: user?.wallet?.balance || 0,
      stripeCard: {
        id: stripeCard.id,
        last4: stripeCard.last4,
        brand: stripeCard.brand,
        exp_month: stripeCard.exp_month,
        exp_year: stripeCard.exp_year
      }
    });
  } catch (error) {
    console.error('Error getting wallet details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update card wallet status (Apple Wallet/Google Pay)
router.put('/wallet-status/:cardId', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { cardId } = req.params;
    const { walletType, added, passId, tokenId } = req.body;
    
    const card = await VirtualCard.findOne({ _id: cardId, user: userId });
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    if (walletType === 'apple') {
      card.addedToAppleWallet = added === true;
      if (passId) {
        card.appleWalletPassId = passId;
      }
    } else if (walletType === 'google') {
      card.addedToGooglePay = added === true;
      if (tokenId) {
        card.googlePayTokenId = tokenId;
      }
    }

    await card.save();

    res.json({
      message: 'Wallet status updated',
      card: {
        addedToAppleWallet: card.addedToAppleWallet,
        addedToGooglePay: card.addedToGooglePay
      }
    });
  } catch (error) {
    console.error('Error updating wallet status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Track deletion warning shown
router.post('/deletion-warning/:cardId', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { cardId } = req.params;
    
    const card = await VirtualCard.findOne({ _id: cardId, user: userId });
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    card.deletionWarningsShown = (card.deletionWarningsShown || 0) + 1;
    await card.save();

    res.json({
      warningsShown: card.deletionWarningsShown,
      canDelete: card.deletionWarningsShown >= 2
    });
  } catch (error) {
    console.error('Error tracking deletion warning:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

