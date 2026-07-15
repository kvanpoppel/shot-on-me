const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');
const analytics = require('../utils/analytics');
const auth = require('../middleware/auth');
const PendingPayment = require('../models/PendingPayment');
const AuditLog = require('../models/AuditLog');
const { normalizePhone } = require('../utils/phone');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const buildVenueSlugBase = (venueName) => {
  return String(venueName || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'venue';
};

const buildUniqueVenueSlug = async (VenueModel, venueName) => {
  const base = buildVenueSlugBase(venueName);
  let attempt = 0;
  let candidate = base;

  while (attempt < 100) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await VenueModel.findOne({ slug: candidate }).select('_id').lean();
    if (!existing) return candidate;
    attempt += 1;
    candidate = `${base}-${attempt + 1}`;
  }

  return `${base}-${Date.now().toString().slice(-6)}`;
};

const normalizeBaseUrl = (url) => String(url || '').trim().replace(/\/$/, '');

const resolveVenuePortalBaseUrl = (req) => {
  const configuredBase =
    process.env.VENUE_PORTAL_URL ||
    process.env.VENUE_PORTAL_BASE_URL ||
    process.env.FRONTEND_URL;

  if (configuredBase) {
    return normalizeBaseUrl(configuredBase);
  }

  const origin = req.get('origin');
  if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
    return normalizeBaseUrl(origin);
  }

  const forwardedHost = req.get('x-forwarded-host');
  const host = forwardedHost || req.get('host');
  const forwardedProto = req.get('x-forwarded-proto');
  const protocol = (forwardedProto || req.protocol || 'https').split(',')[0].trim();
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    return normalizeBaseUrl(`${protocol}://${host}`);
  }

  return 'http://localhost:3002';
};

// Login route
router.post('/login', authLimiter, async (req, res) => {
  const startTime = Date.now();
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      analytics.trackAPI('/auth/login', 'POST', null, Date.now() - startTime, 503);
      return res.status(503).json({ 
        message: 'Database not ready',
        error: 'MongoDB connection not established'
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      console.log('❌ Login attempt missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (process.env.NODE_ENV !== 'production') console.log(`🔐 Login attempt`);

    // Find user by email - select needed fields for login
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('_id email name firstName lastName phoneNumber userType wallet friends location profilePicture password');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    if (!user.password) {
      analytics.trackAPI('/auth/login', 'POST', null, Date.now() - startTime, 500);
      return res.status(500).json({ message: 'Account error. Please contact support.' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      analytics.trackAPI('/auth/login', 'POST', null, Date.now() - startTime, 401);
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Remove password from user object before returning
    const userObj = user.toObject ? user.toObject() : user;
    delete userObj.password;

    // Update login streak (async, don't wait)
    const { updateLoginStreak } = require('../utils/gamification');
    updateLoginStreak(user._id).catch(err => console.error('Gamification error:', err));

    // Auto-create virtual card if user doesn't have one (fire-and-forget)
    if (user.userType === 'user') {
      (async () => {
        try {
          const stripeUtils = require('../utils/stripe');
          const VirtualCard = require('../models/VirtualCard');
          const issuingEnabled = await stripeUtils.isIssuingEnabled();
          if (!issuingEnabled) return;
          const existingCard = await VirtualCard.findOne({ user: user._id, status: 'active' });
          if (existingCard) return;
          const nameParts = (user.name || '').split(' ');
          const cardData = await stripeUtils.createVirtualCard(user._id.toString(), {
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            address: user.address
          });
          await VirtualCard.create({
            user: user._id,
            stripeCardId: cardData.cardId,
            stripeCardholderId: cardData.cardholderId,
            last4: cardData.last4,
            brand: cardData.brand,
            expirationMonth: cardData.expirationMonth,
            expirationYear: cardData.expirationYear,
            status: 'active',
            metadata: { createdAt: new Date() }
          });
          console.log(`✅ Virtual card auto-created on login for user ${user._id}: ${cardData.last4}`);
        } catch (cardErr) {
          console.error(`⚠️ Failed to auto-create virtual card on login for ${user._id}:`, cardErr.message);
        }
      })();
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        userType: user.userType || 'user'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Split name into firstName and lastName for frontend compatibility
    const nameParts = (userObj.name || '').split(' ')
    const userFirstName = nameParts[0] || ''
    const userLastName = nameParts.slice(1).join(' ') || ''

    // Track login
    analytics.trackAPI('/auth/login', 'POST', userObj._id.toString(), Date.now() - startTime, 200);

    // Set HttpOnly cookie — not accessible to JavaScript, prevents XSS token theft
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    // Audit log (fire-and-forget)
    AuditLog.create({
      action: 'login',
      actorId: user._id,
      ip: req.ip,
      meta: { userAgent: req.headers['user-agent'] }
    }).catch(() => {});

    // Return user data and token
    res.json({
      token,
      user: {
        id: userObj._id,
        _id: userObj._id,
        email: userObj.email,
        name: userObj.name,
        firstName: userFirstName,
        lastName: userLastName,
        phoneNumber: userObj.phoneNumber,
        userType: userObj.userType || 'user',
        wallet: userObj.wallet || { balance: 0, pendingBalance: 0 },
        friends: userObj.friends || [],
        location: userObj.location || { isVisible: true },
        profilePicture: userObj.profilePicture || ''
      }
    });

  } catch (error) {
    analytics.trackAPI('/auth/login', 'POST', null, Date.now() - startTime, 500);
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      message: 'Server error during login',
      error: undefined 
    });
  }
});

// Register route
router.post('/register', authLimiter, async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        message: 'Database not ready',
        error: 'MongoDB connection not established'
      });
    }

    const { email, password, name, firstName, lastName, phoneNumber, userType, acceptedTerms, acceptedPrivacy, ageConfirmed } = req.body;

    // Support both name (single field) and firstName/lastName (separate fields)
    const fullName = name || (firstName && lastName ? `${firstName} ${lastName}`.trim() : null);

    if (!email || !password || !fullName) {
      return res.status(400).json({ message: 'Email, password, and name (or firstName + lastName) are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    if (acceptedTerms !== true || acceptedPrivacy !== true) {
      return res.status(400).json({ message: 'You must accept Terms of Service and Privacy Policy to create an account' });
    }
    if (ageConfirmed !== true) {
      return res.status(400).json({ message: 'You must be 21 years or older to use Shot On Me' });
    }

    // Check email uniqueness
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Check phone uniqueness — prevents two accounts claiming the same pending payments
    if (phoneNumber) {
      const normalizedPhone = normalizePhone(phoneNumber);
      const existingPhone = await User.findOne({ phoneNumber: normalizedPhone });
      if (existingPhone) {
        return res.status(400).json({ message: 'An account with this phone number already exists' });
      }
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      name: fullName,
      phoneNumber: phoneNumber || undefined,
      userType: userType || 'user',
      wallet: { balance: 0, pendingBalance: 0 }, // Wallet is automatically initialized
      friends: [],
      location: { isVisible: true },
      agreements: {
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
        ageVerifiedAt: new Date(),
        acceptedVersion: 'v1'
      }
    });

    await newUser.save();

    // Trigger referral completion for 'signed_up' action (async, don't block registration)
    const { checkReferralCompletion } = require('./referrals');
    checkReferralCompletion(newUser._id, 'signed_up').catch(err =>
      console.error('Referral completion error on signup:', err)
    );

    // Auto-claim any pending payments sent to this phone number before they registered
    if (newUser.phoneNumber) {
      const normalizedPhone = normalizePhone(newUser.phoneNumber);
      try {
        const pending = await PendingPayment.find({
          recipientPhone: normalizedPhone,
          status: 'pending'
        });
        if (pending.length > 0) {
          const totalClaimed = pending.reduce((sum, p) => sum + p.amount, 0);
          await User.findByIdAndUpdate(newUser._id, {
            $inc: { 'wallet.balance': totalClaimed }
          });
          await PendingPayment.updateMany(
            { _id: { $in: pending.map(p => p._id) } },
            { $set: { status: 'claimed', claimedAt: new Date(), claimedBy: newUser._id } }
          );
        }
      } catch (claimErr) {
        console.error('Error auto-claiming pending payments:', claimErr.message);
      }
    }

    // Auto-create virtual card for new users (if Stripe Issuing is enabled)
    if (newUser.userType === 'user') {
      try {
        const stripeUtils = require('../utils/stripe');
        const VirtualCard = require('../models/VirtualCard');
        
        // Check if Stripe Issuing is enabled
        const issuingEnabled = await stripeUtils.isIssuingEnabled();
        
        if (issuingEnabled) {
          // Split name for card creation
          const nameParts = newUser.name.split(' ');
          const cardFirstName = nameParts[0] || '';
          const cardLastName = nameParts.slice(1).join(' ') || '';
          
          // Create virtual card automatically
          const cardData = await stripeUtils.createVirtualCard(newUser._id.toString(), {
            firstName: cardFirstName,
            lastName: cardLastName,
            name: newUser.name,
            email: newUser.email,
            phoneNumber: newUser.phoneNumber,
            address: newUser.address
          });

          // Save virtual card to database
          const virtualCard = new VirtualCard({
            user: newUser._id,
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
          
          console.log(`✅ Virtual card created for user ${newUser._id}: ${cardData.last4}`);
        } else {
          console.log(`⚠️ Stripe Issuing not enabled - skipping virtual card creation for user ${newUser._id}`);
        }
      } catch (cardError) {
        // Don't fail registration if card creation fails
        console.error(`⚠️ Failed to create virtual card for user ${newUser._id}:`, cardError.message);
        console.error(`   Error details:`, cardError);
        // Continue with registration - card can be created later via /api/virtual-cards/create
      }
    }

    // Track registration
    analytics.trackRegistration(newUser._id.toString(), newUser.userType);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: newUser._id,
        email: newUser.email,
        userType: newUser.userType
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Split name into firstName and lastName for frontend compatibility
    const nameParts = newUser.name.split(' ')
    const userFirstName = nameParts[0] || ''
    const userLastName = nameParts.slice(1).join(' ') || ''

    // Ensure wallet exists
    const userWallet = newUser.wallet || { balance: 0, pendingBalance: 0 };

    // Set HttpOnly cookie on registration
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    // Audit log (fire-and-forget)
    AuditLog.create({
      action: 'register',
      actorId: newUser._id,
      ip: req.ip,
      meta: { userType: newUser.userType }
    }).catch(() => {});

    // Return user data and token
    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        _id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        firstName: userFirstName,
        lastName: userLastName,
        phoneNumber: newUser.phoneNumber,
        userType: newUser.userType || 'user',
        wallet: userWallet,
        friends: newUser.friends || [],
        location: newUser.location || { isVisible: true },
        profilePicture: newUser.profilePicture || ''
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      message: error.message || 'Server error during registration'
    });
  }
});

// Register venue route (creates user with venue type and initial venue)
router.post('/register-venue', authLimiter, async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        message: 'Database not ready',
        error: 'MongoDB connection not established'
      });
    }

    const { email, password, firstName, lastName, phoneNumber, venueName, venueAddress, venuePhone, subscriptionTier, acceptedTerms, acceptedPrivacy } = req.body;

    if (!email || !password || !firstName || !lastName || !venueName) {
      return res.status(400).json({ 
        message: 'Email, password, first name, last name, and venue name are required' 
      });
    }
    if (acceptedTerms !== true || acceptedPrivacy !== true) {
      return res.status(400).json({ message: 'You must accept Terms of Service and Privacy Policy to create an account' });
    }

    // Check email uniqueness
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create venue user
    const newUser = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      name: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      phoneNumber: phoneNumber || undefined,
      userType: 'venue',
      wallet: { balance: 0, pendingBalance: 0 }, // Wallet is automatically initialized
      friends: [],
      location: { isVisible: true },
      agreements: {
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
        acceptedVersion: 'v1'
      }
    });

    await newUser.save();

    // Create venue for this user
    const Venue = require('../models/Venue');
    const venueSlug = await buildUniqueVenueSlug(Venue, venueName);
    const allowedTiers = ['free', 'basic', 'premium'];
    const normalizedTier = allowedTiers.includes(subscriptionTier) ? subscriptionTier : 'free';
    // Free tier gets 12-week trial
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 84); // 12 weeks
    const newVenue = new Venue({
      name: venueName,
      slug: venueSlug,
      owner: newUser._id,
      address: venueAddress ? {
        street: venueAddress.street || venueAddress,
        city: venueAddress.city || '',
        state: venueAddress.state || '',
        zipCode: venueAddress.zipCode || '',
        country: venueAddress.country || 'US'
      } : {},
      location: {
        type: 'Point',
        coordinates: [0, 0] // Will be updated when venue sets location
      },
      phone: venuePhone || phoneNumber,
      subscriptionTier: normalizedTier,
      subscriptionExpiresAt: normalizedTier === 'free' ? trialEnd : null,
      isActive: true
    });

    await newVenue.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: newUser._id,
        email: newUser.email,
        userType: 'venue'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data and token
    const venuePortalBaseUrl = resolveVenuePortalBaseUrl(req);
    const venuePortalUrl = `${venuePortalBaseUrl}/v/${newVenue.slug}`;

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        _id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        phoneNumber: newUser.phoneNumber,
        userType: 'venue',
        wallet: newUser.wallet,
        friends: newUser.friends,
        location: newUser.location
      },
      venue: {
        id: newVenue._id,
        name: newVenue.name,
        slug: newVenue.slug,
        subscriptionTier: newVenue.subscriptionTier,
        portalUrl: venuePortalUrl
      }
    });

  } catch (error) {
    console.error('❌ Venue registration error:', error);
    res.status(500).json({ 
      message: 'Server error during venue registration',
      error: undefined 
    });
  }
});

// Forgot password - request reset
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Don't reveal if user exists (security best practice)
    if (!user) {
      return res.json({ 
        message: 'If an account exists with that email, a password reset link has been sent.' 
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user._id, type: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Send password reset email
    const emailService = require('../utils/emailService');
    const emailResult = await emailService.sendPasswordResetEmail(email, resetToken);
    
    if (!emailResult.success) {
      console.warn(`⚠️  Failed to send email to ${email}:`, emailResult.error);
      if (process.env.NODE_ENV === 'development' || !process.env.SMTP_USER) {
        // Log to console only — never expose the token in the API response
        console.log(`\n[DEV ONLY] Password reset link generated for ${email} (configure SMTP to send via email)\n`);
        console.log(`📧 To enable email sending, configure SMTP_USER and SMTP_PASS in .env\n`);
      }
    }

    res.json({
      message: 'If an account exists with that email, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: undefined 
    });
  }
});

// Reset password with token
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type !== 'password-reset') {
        return res.status(400).json({ message: 'Invalid reset token' });
      }
    } catch (error) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Find user and update password
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    user.password = hashedPassword;
    await user.save();

    // Audit log (fire-and-forget)
    AuditLog.create({
      action: 'password_reset',
      actorId: user._id,
      ip: req.ip
    }).catch(() => {});

    res.json({ message: 'Password reset successfully. You can now login with your new password.' });
  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: undefined 
    });
  }
});

// Verify session from HttpOnly cookie — used by frontend on page reload
// Returns a fresh token + user so the frontend can restore its in-memory state
router.get('/verify', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('_id email name firstName lastName phoneNumber userType wallet friends location profilePicture');

    if (!user) {
      res.clearCookie('token');
      return res.status(401).json({ message: 'User not found' });
    }

    // Re-issue a fresh token (resets expiry)
    const token = jwt.sign(
      { userId: user._id, email: user.email, userType: user.userType || 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    const nameParts = (user.name || '').split(' ');
    res.json({
      token,
      user: {
        id: user._id,
        _id: user._id,
        email: user.email,
        name: user.name,
        firstName: user.firstName || nameParts[0] || '',
        lastName: user.lastName || nameParts.slice(1).join(' ') || '',
        phoneNumber: user.phoneNumber,
        userType: user.userType || 'user',
        wallet: user.wallet || { balance: 0, pendingBalance: 0 },
        friends: user.friends || [],
        location: user.location || { isVisible: true },
        profilePicture: user.profilePicture || ''
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error'});
  }
});

// Logout — clears the HttpOnly session cookie
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
