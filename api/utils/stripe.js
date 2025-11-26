import Stripe from 'stripe';

// Initialize Stripe client
let stripe = null;

const getStripeClient = () => {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }
  return stripe;
};

// Check if Stripe is configured
export const isStripeConfigured = () => {
  return !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_PUBLISHABLE_KEY;
};

// Create a payment method from card details
export const createPaymentMethod = async (cardNumber, expiryMonth, expiryYear, cvc) => {
  const client = getStripeClient();
  if (!client) {
    throw new Error('Stripe is not configured');
  }

  try {
    let expMonth, expYear;
    
    // Handle both formats: separate month/year or "MM/YY" string
    if (expiryMonth && expiryYear && typeof expiryYear === 'number') {
      expMonth = parseInt(expiryMonth);
      expYear = parseInt(expiryYear);
    } else if (typeof expiryYear === 'string' && expiryYear.includes('/')) {
      [expMonth, expYear] = expiryYear.split('/').map(n => parseInt(n.trim()));
    } else if (expiryMonth && expiryYear) {
      expMonth = parseInt(expiryMonth);
      expYear = parseInt(expiryYear);
    } else {
      throw new Error('Invalid expiry date format');
    }

    if (!expMonth || !expYear || expMonth < 1 || expMonth > 12) {
      throw new Error('Invalid expiry date');
    }

    const paymentMethod = await client.paymentMethods.create({
      type: 'card',
      card: {
        number: cardNumber.replace(/\s/g, ''),
        exp_month: expMonth,
        exp_year: expYear > 2000 ? expYear : 2000 + expYear, // Handle 2-digit years
        cvc: cvc,
      },
    });

    return paymentMethod;
  } catch (error) {
    console.error('Stripe payment method creation error:', error);
    throw new Error(error.message || 'Failed to create payment method');
  }
};

// Create a customer in Stripe
export const createCustomer = async (email, name, metadata = {}) => {
  const client = getStripeClient();
  if (!client) {
    throw new Error('Stripe is not configured');
  }

  try {
    const customer = await client.customers.create({
      email,
      name,
      metadata,
    });

    return customer;
  } catch (error) {
    console.error('Stripe customer creation error:', error);
    throw new Error(error.message || 'Failed to create customer');
  }
};

// Charge a customer
export const chargeCustomer = async (customerId, paymentMethodId, amount, description, metadata = {}) => {
  const client = getStripeClient();
  if (!client) {
    throw new Error('Stripe is not configured');
  }

  try {
    // Attach payment method to customer
    await client.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Set as default payment method
    await client.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create payment intent
    const paymentIntent = await client.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      confirm: true,
      description,
      metadata,
    });

    return paymentIntent;
  } catch (error) {
    console.error('Stripe charge error:', error);
    throw new Error(error.message || 'Failed to process payment');
  }
};

// Retrieve payment method
export const getPaymentMethod = async (paymentMethodId) => {
  const client = getStripeClient();
  if (!client) {
    throw new Error('Stripe is not configured');
  }

  try {
    const paymentMethod = await client.paymentMethods.retrieve(paymentMethodId);
    return paymentMethod;
  } catch (error) {
    console.error('Stripe retrieve payment method error:', error);
    throw new Error(error.message || 'Failed to retrieve payment method');
  }
};

// List customer's payment methods
export const listPaymentMethods = async (customerId) => {
  const client = getStripeClient();
  if (!client) {
    throw new Error('Stripe is not configured');
  }

  try {
    const paymentMethods = await client.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    return paymentMethods.data;
  } catch (error) {
    console.error('Stripe list payment methods error:', error);
    throw new Error(error.message || 'Failed to list payment methods');
  }
};

// Delete a payment method
export const deletePaymentMethod = async (paymentMethodId) => {
  const client = getStripeClient();
  if (!client) {
    throw new Error('Stripe is not configured');
  }

  try {
    const paymentMethod = await client.paymentMethods.detach(paymentMethodId);
    return paymentMethod;
  } catch (error) {
    console.error('Stripe delete payment method error:', error);
    throw new Error(error.message || 'Failed to delete payment method');
  }
};

export default getStripeClient;

