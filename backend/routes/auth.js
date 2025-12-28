const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');
const analytics = require('../utils/analytics');

const router = express.Router();

// Login route
router.post('/login', async (req, res) => {
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

    console.log(`🔐 Login attempt for email: ${email.toLowerCase()}`);

    // Find user by email - select needed fields for login
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('_id email name firstName lastName phoneNumber userType wallet friends location profilePicture password');
    
    if (!user) {
      console.log(`❌ User not found for email: ${email.toLowerCase()}`);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    console.log(`✅ User found: ${user.email} (ID: ${user._id})`);

    // Check password
    if (!user.password) {
      console.error('❌ User found but password field is missing:', user._id);
      analytics.trackAPI('/auth/login', 'POST', null, Date.now() - startTime, 500);
      return res.status(500).json({ message: 'Account error. Please contact support.' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('❌ Password mismatch for user:', user.email);
      analytics.trackAPI('/auth/login', 'POST', null, Date.now() - startTime, 401);
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Remove password from user object before returning
    const userObj = user.toObject ? user.toObject() : user;
    delete userObj.password;

    // Update login streak (async, don't wait)
    const { updateLoginStreak } = require('../utils/gamification');
    updateLoginStreak(user._id).catch(err => console.error('Gamification error:', err));

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        userType: user.userType || 'user'
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    // Split name into firstName and lastName for frontend compatibility
    const nameParts = (userObj.name || '').split(' ')
    const userFirstName = nameParts[0] || ''
    const userLastName = nameParts.slice(1).join(' ') || ''

    // Track login
    analytics.trackAPI('/auth/login', 'POST', userObj._id.toString(), Date.now() - startTime, 200);

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
      error: error.message 
    });
  }
});

// Register route
router.post('/register', async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        message: 'Database not ready',
        error: 'MongoDB connection not established'
      });
    }

    const { email, password, name, firstName, lastName, phoneNumber, userType } = req.body;

    // Support both name (single field) and firstName/lastName (separate fields)
    const fullName = name || (firstName && lastName ? `${firstName} ${lastName}`.trim() : null);

    if (!email || !password || !fullName) {
      return res.status(400).json({ message: 'Email, password, and name (or firstName + lastName) are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
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
      location: { isVisible: true }
    });

    await newUser.save();

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
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    // Split name into firstName and lastName for frontend compatibility
    const nameParts = newUser.name.split(' ')
    const userFirstName = nameParts[0] || ''
    const userLastName = nameParts.slice(1).join(' ') || ''

    // Ensure wallet exists
    const userWallet = newUser.wallet || { balance: 0, pendingBalance: 0 };
    
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
      message: 'Server error during registration',
      error: error.message 
    });
  }
});

// Register venue route (creates user with venue type and initial venue)
router.post('/register-venue', async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        message: 'Database not ready',
        error: 'MongoDB connection not established'
      });
    }

    const { email, password, firstName, lastName, phoneNumber, venueName, venueAddress, venuePhone } = req.body;

    if (!email || !password || !firstName || !lastName || !venueName) {
      return res.status(400).json({ 
        message: 'Email, password, first name, last name, and venue name are required' 
      });
    }

    // Check if user already exists
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
      location: { isVisible: true }
    });

    await newUser.save();

    // Create venue for this user
    const Venue = require('../models/Venue');
    const newVenue = new Venue({
      name: venueName,
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
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    // Return user data and token
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
        name: newVenue.name
      }
    });

  } catch (error) {
    console.error('❌ Venue registration error:', error);
    res.status(500).json({ 
      message: 'Server error during venue registration',
      error: error.message 
    });
  }
});

// Forgot password - request reset
router.post('/forgot-password', async (req, res) => {
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
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1h' }
    );

    // Send password reset email
    const emailService = require('../utils/emailService');
    const emailResult = await emailService.sendPasswordResetEmail(email, resetToken);
    
    if (!emailResult.success) {
      console.warn(`⚠️  Failed to send email to ${email}:`, emailResult.error);
      // Always return token in development, and provide helpful message
      if (process.env.NODE_ENV === 'development' || !process.env.SMTP_USER) {
        console.log(`\n🔑 Password Reset Token (for testing):`);
        console.log(`   ${resetToken}\n`);
        console.log(`📧 To enable email sending, configure SMTP_USER and SMTP_PASS in .env\n`);
        return res.json({ 
          message: 'If an account exists with that email, a password reset link has been sent.',
          warning: 'Email service not configured. Use this token for testing:',
          resetToken,
          resetUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
        });
      }
    }

    res.json({ 
      message: 'If an account exists with that email, a password reset link has been sent.',
      // In development, include token for testing (even if email succeeded)
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
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

    res.json({ message: 'Password reset successfully. You can now login with your new password.' });
  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

module.exports = router;
