const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const stripeUtils = require('../utils/stripe');

// Get user's saved payment methods
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!stripeUtils.isStripeConfigured()) {
      return res.status(503).json({ 
        error: 'Stripe is not configured',
        message: 'Payment processing is currently unavailable'
      });
    }

    // Get customer ID from user (create if doesn't exist)
    let customerId = user.stripeCustomerId;
    
    // If customer ID exists, verify it's valid
    if (customerId) {
      try {
        const stripe = stripeUtils.stripe;
        await stripe.customers.retrieve(customerId);
        // Customer exists, we're good
      } catch (stripeError) {
        // Customer doesn't exist or is invalid - clear it and create a new one
        if (stripeError.code === 'resource_missing' || stripeError.message?.includes('No such customer')) {
          console.log('⚠️ Invalid Stripe customer ID found, clearing and creating new one:', customerId);
          user.stripeCustomerId = null;
          customerId = null;
          await user.save();
        } else {
          // Some other error - rethrow it
          throw stripeError;
        }
      }
    }
    
    // Create new customer if we don't have a valid one
    if (!customerId) {
      // Create Stripe customer
      const stripe = stripeUtils.stripe;
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        metadata: {
          userId: user._id.toString()
        }
      });
      
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
      console.log('✅ Created Stripe customer:', customerId, 'for user:', user.email);
    }

    // Retrieve payment methods
    const stripe = stripeUtils.stripe;
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    });

    res.json({
      paymentMethods: paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: {
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          expMonth: pm.card?.exp_month,
          expYear: pm.card?.exp_year
        },
        isDefault: pm.id === user.defaultPaymentMethodId
      })),
      defaultPaymentMethodId: user.defaultPaymentMethodId
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create Setup Intent for saving payment method
router.post('/setup-intent', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!stripeUtils.isStripeConfigured()) {
      return res.status(503).json({ 
        error: 'Stripe is not configured',
        message: 'Payment processing is currently unavailable'
      });
    }

    // Validate user has required fields
    if (!user.email) {
      return res.status(400).json({ 
        message: 'User email is required',
        error: 'User account is missing email address'
      });
    }

    // Get or create customer ID
    let customerId = user.stripeCustomerId;
    
    // Check 4-card limit if customer exists
    if (customerId) {
      try {
        const stripe = stripeUtils.stripe;
        const paymentMethods = await stripe.paymentMethods.list({
          customer: customerId,
          type: 'card'
        });
        
        if (paymentMethods.data.length >= 4) {
          return res.status(400).json({ 
            error: 'Card limit reached',
            message: 'You can only have up to 4 payment methods. Please delete a card first.'
          });
        }
      } catch (error) {
        // If customer doesn't exist or error, continue (will create customer if needed)
        console.log('Could not check existing payment methods:', error.message);
      }
    }
    
    // If customer ID exists, verify it's valid
    if (customerId) {
      try {
        const stripe = stripeUtils.stripe;
        const customer = await stripe.customers.retrieve(customerId);
        // Customer exists and is valid
        if (customer.deleted) {
          // Customer was deleted - clear it
          console.log('⚠️ Stripe customer was deleted, clearing ID:', customerId);
          user.stripeCustomerId = null;
          customerId = null;
          await user.save();
        }
      } catch (stripeError) {
        // Customer doesn't exist or is invalid - clear it and create a new one
        if (stripeError.code === 'resource_missing' || 
            stripeError.message?.includes('No such customer') ||
            stripeError.type === 'StripeInvalidRequestError') {
          console.log('⚠️ Invalid Stripe customer ID found, clearing and creating new one:', customerId);
          user.stripeCustomerId = null;
          customerId = null;
          await user.save();
        } else {
          // Some other error - log it but continue to try creating a new customer
          console.error('⚠️ Error verifying Stripe customer, will create new one:', stripeError.message);
          user.stripeCustomerId = null;
          customerId = null;
          await user.save();
        }
      }
    }
    
    // Create new customer if we don't have a valid one
    if (!customerId) {
      try {
        const stripe = stripeUtils.stripe;
        const customerName = user.name || 
                            (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}`.trim() : null) ||
                            user.email;
        
        const customer = await stripe.customers.create({
          email: user.email,
          name: customerName,
          metadata: {
            userId: user._id.toString()
          }
        });
        
        customerId = customer.id;
        user.stripeCustomerId = customerId;
        await user.save();
        console.log('✅ Created Stripe customer:', customerId, 'for user:', user.email);
      } catch (stripeError) {
        console.error('❌ Error creating Stripe customer:', {
          message: stripeError.message,
          type: stripeError.type,
          code: stripeError.code
        });
        return res.status(500).json({ 
          message: 'Failed to create payment customer',
          error: stripeError.message || 'Stripe API error',
          details: stripeError.type || 'unknown_error'
        });
      }
    }

    // Create Setup Intent
    try {
      const stripe = stripeUtils.stripe;
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session', // Allow saving for future use
        payment_method_options: {
          card: {
            request_three_d_secure: 'automatic'
          }
        }
      });

      console.log('✅ Setup Intent created:', {
        id: setupIntent.id,
        customer: setupIntent.customer,
        status: setupIntent.status,
        clientSecretPrefix: setupIntent.client_secret?.substring(0, 20) + '...',
        accountId: setupIntent.livemode ? 'LIVE' : 'TEST'
      });
      
      // CRITICAL: Verify the client secret format
      if (!setupIntent.client_secret || !setupIntent.client_secret.startsWith('seti_')) {
        console.error('❌ Invalid Setup Intent client secret format!');
        return res.status(500).json({ 
          message: 'Invalid Setup Intent format',
          error: 'Setup Intent client secret is invalid'
        });
      }

      res.json({
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id
      });
    } catch (stripeError) {
      console.error('❌ Error creating Setup Intent:', {
        message: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        statusCode: stripeError.statusCode
      });
      
      // Provide more specific error messages
      if (stripeError.type === 'StripeInvalidRequestError') {
        return res.status(400).json({ 
          message: 'Invalid request to Stripe',
          error: stripeError.message || 'Stripe API validation error'
        });
      } else if (stripeError.type === 'StripeAPIError') {
        return res.status(502).json({ 
          message: 'Stripe API error',
          error: stripeError.message || 'Payment service temporarily unavailable'
        });
      } else if (stripeError.type === 'StripeAuthenticationError') {
        return res.status(503).json({ 
          message: 'Stripe authentication failed',
          error: 'Payment service configuration error'
        });
      }
      
      return res.status(500).json({ 
        message: 'Failed to create payment setup',
        error: stripeError.message || 'Unknown error occurred'
      });
    }
  } catch (error) {
    console.error('❌ Unexpected error in setup-intent endpoint:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message || 'An unexpected error occurred'
    });
  }
});

// Set default payment method
router.post('/:paymentMethodId/set-default', auth, async (req, res) => {
  try {
    const { paymentMethodId } = req.params;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify payment method belongs to user
    if (!user.stripeCustomerId) {
      return res.status(400).json({ message: 'No payment methods found' });
    }

    const stripe = stripeUtils.stripe;
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    
    // If payment method is attached to a different customer, deny access
    if (paymentMethod.customer && paymentMethod.customer !== user.stripeCustomerId) {
      return res.status(403).json({ message: 'Payment method does not belong to user' });
    }

    // Attach to customer if not already attached
    if (!paymentMethod.customer) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: user.stripeCustomerId
      });
    }

    // Set as default
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });

    user.defaultPaymentMethodId = paymentMethodId;
    await user.save();

    res.json({ 
      message: 'Default payment method updated',
      paymentMethodId 
    });
  } catch (error) {
    console.error('Error setting default payment method:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete payment method
router.delete('/:paymentMethodId', auth, async (req, res) => {
  try {
    const { paymentMethodId } = req.params;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.stripeCustomerId) {
      return res.status(400).json({ message: 'No payment methods found' });
    }

    const stripe = stripeUtils.stripe;
    
    // Verify payment method belongs to user
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (paymentMethod.customer !== user.stripeCustomerId) {
      return res.status(403).json({ message: 'Payment method does not belong to user' });
    }

    // Detach payment method
    await stripe.paymentMethods.detach(paymentMethodId);

    // If it was the default, clear it
    if (user.defaultPaymentMethodId === paymentMethodId) {
      user.defaultPaymentMethodId = null;
      await user.save();
    }

    res.json({ message: 'Payment method deleted' });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

