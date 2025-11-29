const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Stripe utility functions for Shot On Me
 * 
 * Environment variables required:
 * - STRIPE_SECRET_KEY: Your Stripe secret key
 * - STRIPE_PUBLISHABLE_KEY: Your Stripe publishable key (for frontend)
 * - STRIPE_WEBHOOK_SECRET: Webhook signing secret (for webhook verification)
 */

// Initialize Stripe client
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️ STRIPE_SECRET_KEY not set. Stripe features will be disabled.');
}

/**
 * Create a Stripe Connect account onboarding link for a venue
 * @param {string} venueId - MongoDB venue ID
 * @param {string} venueName - Venue name
 * @param {string} email - Venue owner email
 * @returns {Promise<Object>} Onboarding link URL
 */
async function createConnectOnboardingLink(venueId, venueName, email) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe is not configured');
    }

    // Create or retrieve Stripe Connect account
    let accountId;
    
    // Check if venue already has a Stripe account ID stored
    // (You'll need to add stripeAccountId field to Venue model)
    // For now, we'll create a new account each time
    
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'company',
      business_profile: {
        name: venueName,
        product_description: 'Venue accepting payments via Shot On Me',
      },
    });

    accountId = account.id;

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/settings?refresh=true`,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/settings?success=true`,
      type: 'account_onboarding',
    });

    return {
      url: accountLink.url,
      accountId: accountId,
    };
  } catch (error) {
    console.error('Error creating Stripe Connect onboarding link:', error);
    throw error;
  }
}

/**
 * Get Stripe Connect account status
 * @param {string} accountId - Stripe Connect account ID
 * @returns {Promise<Object>} Account status information
 */
async function getConnectAccountStatus(accountId) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return {
        connected: false,
        error: 'Stripe is not configured',
      };
    }

    if (!accountId) {
      return {
        connected: false,
        error: 'No Stripe account ID found',
      };
    }

    const account = await stripe.accounts.retrieve(accountId);

    return {
      connected: true,
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      email: account.email,
      country: account.country,
    };
  } catch (error) {
    console.error('Error retrieving Stripe Connect account:', error);
    return {
      connected: false,
      error: error.message || 'Failed to retrieve account status',
    };
  }
}

/**
 * Create a Payment Intent for adding funds to user wallet
 * @param {number} amount - Amount in dollars (will be converted to cents)
 * @param {string} userId - User ID for metadata
 * @param {string} currency - Currency code (default: 'usd')
 * @returns {Promise<Object>} Payment Intent object
 */
async function createPaymentIntent(amount, userId, currency = 'usd') {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe is not configured');
    }

    const amountInCents = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency,
      metadata: {
        userId: userId,
        type: 'wallet_topup',
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amount,
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
}

/**
 * Confirm a payment intent and update user wallet
 * @param {string} paymentIntentId - Stripe Payment Intent ID
 * @returns {Promise<Object>} Payment confirmation details
 */
async function confirmPaymentIntent(paymentIntentId) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe is not configured');
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Payment not succeeded. Status: ${paymentIntent.status}`);
    }

    return {
      success: true,
      amount: paymentIntent.amount / 100, // Convert cents to dollars
      userId: paymentIntent.metadata.userId,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    console.error('Error confirming payment intent:', error);
    throw error;
  }
}

/**
 * Create a charge to a connected account (venue receives payment)
 * @param {number} amount - Amount in dollars
 * @param {string} connectedAccountId - Stripe Connect account ID
 * @param {string} paymentMethodId - Payment method ID from frontend
 * @param {string} applicationFeeAmount - Application fee in dollars (optional)
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Charge details
 */
async function createConnectedAccountCharge(
  amount,
  connectedAccountId,
  paymentMethodId,
  applicationFeeAmount = 0,
  metadata = {}
) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe is not configured');
    }

    const amountInCents = Math.round(amount * 100);
    const applicationFeeInCents = Math.round(applicationFeeAmount * 100);

    // Create Payment Intent on connected account
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountInCents,
        currency: 'usd',
        payment_method: paymentMethodId,
        confirmation_method: 'manual',
        confirm: true,
        application_fee_amount: applicationFeeInCents,
        metadata: metadata,
      },
      {
        stripeAccount: connectedAccountId,
      }
    );

    return {
      success: paymentIntent.status === 'succeeded',
      paymentIntentId: paymentIntent.id,
      amount: amount,
      applicationFee: applicationFeeAmount,
    };
  } catch (error) {
    console.error('Error creating connected account charge:', error);
    throw error;
  }
}

/**
 * Verify Stripe webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - Stripe signature header
 * @returns {Object|null} Webhook event object or null if invalid
 */
function verifyWebhookSignature(payload, signature) {
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.warn('⚠️ STRIPE_WEBHOOK_SECRET not set. Webhook verification disabled.');
      return null;
    }

    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    return event;
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    return null;
  }
}

/**
 * Handle Stripe webhook events
 * @param {Object} event - Stripe webhook event
 * @returns {Promise<Object>} Processing result
 */
async function handleWebhookEvent(event) {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        // Handle successful payment
        const paymentIntent = event.data.object;
        console.log('✅ Payment succeeded:', paymentIntent.id);
        
        // Update user wallet balance here
        // You'll need to import User model and update balance
        return {
          handled: true,
          type: event.type,
          paymentIntentId: paymentIntent.id,
        };

      case 'payment_intent.payment_failed':
        // Handle failed payment
        console.log('❌ Payment failed:', event.data.object.id);
        return {
          handled: true,
          type: event.type,
        };

      case 'account.updated':
        // Handle Stripe Connect account updates
        console.log('📝 Stripe Connect account updated:', event.data.object.id);
        return {
          handled: true,
          type: event.type,
          accountId: event.data.object.id,
        };

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
        return {
          handled: false,
          type: event.type,
        };
    }
  } catch (error) {
    console.error('Error handling webhook event:', error);
    throw error;
  }
}

/**
 * Get Stripe publishable key (for frontend)
 * @returns {string} Publishable key
 */
function getPublishableKey() {
  return process.env.STRIPE_PUBLISHABLE_KEY || '';
}

/**
 * Check if Stripe is configured
 * @returns {boolean} True if Stripe is configured
 */
function isStripeConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}

module.exports = {
  stripe,
  createConnectOnboardingLink,
  getConnectAccountStatus,
  createPaymentIntent,
  confirmPaymentIntent,
  createConnectedAccountCharge,
  verifyWebhookSignature,
  handleWebhookEvent,
  getPublishableKey,
  isStripeConfigured,
};

