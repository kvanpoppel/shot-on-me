import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Middleware to check MongoDB connection
const checkDBConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      error: 'Database not ready',
      message: 'MongoDB connection is not established. Please try again in a moment.',
      readyState: mongoose.connection.readyState
    });
  }
  next();
};

// Register (regular user)
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('phoneNumber').isMobilePhone(),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, phoneNumber, firstName, lastName } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { phoneNumber }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'User with this email or phone number already exists' 
      });
    }

    // Create regular user
    const user = new User({
      email,
      password,
      phoneNumber,
      firstName,
      lastName,
      userType: 'user'
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        wallet: user.wallet
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Register venue owner
router.post('/register-venue', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('phoneNumber').trim().notEmpty().withMessage('Phone number is required'),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('venueName').trim().notEmpty(),
  body('venueAddress').optional().trim(),
  body('venuePhone').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, phoneNumber, firstName, lastName, venueName, venueAddress, venuePhone } = req.body;
    
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Normalize phone number (remove any non-digit characters except +)
    const normalizedPhone = phoneNumber ? phoneNumber.replace(/[^\d+]/g, '') : '';
    
    console.log(`Attempting to register venue account: ${normalizedEmail}`);

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: normalizedEmail },
        { email: email.toLowerCase() },
        { phoneNumber: normalizedPhone },
        { phoneNumber: phoneNumber }
      ] 
    });

    if (existingUser) {
      console.log(`Registration failed: User already exists with email ${normalizedEmail} or phone ${normalizedPhone}`);
      return res.status(400).json({ 
        error: 'User with this email or phone number already exists. Please use a different email or phone number.' 
      });
    }

    // Create venue user
    const user = new User({
      email: normalizedEmail,
      password,
      phoneNumber: normalizedPhone,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      userType: 'venue'
    });

    await user.save();

    // Auto-create venue for the venue owner
    const Venue = (await import('../models/Venue.js')).default;
    
    // Parse address if provided (format: "123 Main St, Austin, TX, 78701")
    let addressParts = {};
    if (venueAddress) {
      const parts = venueAddress.split(',').map(p => p.trim());
      if (parts.length >= 4) {
        addressParts = {
          street: parts[0],
          city: parts[1],
          state: parts[2],
          zipCode: parts[3],
          country: 'US'
        };
      } else if (parts.length === 3) {
        addressParts = {
          street: parts[0],
          city: parts[1],
          state: parts[2],
          country: 'US'
        };
      } else {
        addressParts = {
          street: venueAddress,
          country: 'US'
        };
      }
    }

    const venue = new Venue({
      owner: user._id,
      name: venueName,
      address: addressParts,
      phone: venuePhone || phoneNumber,
      email: email,
      isActive: true
    });

    await venue.save();

    console.log(`✅ Venue account created successfully: ${normalizedEmail} (${venue.name})`);

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        wallet: user.wallet
      },
      venue: {
        id: venue._id,
        name: venue.name
      }
    });
  } catch (error) {
    console.error('Venue registration error:', error);
    res.status(500).json({ 
      error: error.message || 'Server error during venue registration',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], checkDBConnection, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    
    // Normalize email to lowercase (in case normalizeEmail doesn't catch it)
    const normalizedEmail = email.toLowerCase().trim();

    // Find user - try both original and normalized email
    const user = await User.findOne({ 
      $or: [
        { email: normalizedEmail },
        { email: email.toLowerCase() }
      ]
    });
    
    if (!user) {
      console.log(`Login attempt failed: User not found for email: ${normalizedEmail}`);
      return res.status(401).json({ error: 'Invalid email or password. Please check your credentials.' });
    }

    // Check if user is active
    if (!user.isActive) {
      console.log(`Login attempt failed: User account is inactive for email: ${normalizedEmail}`);
      return res.status(401).json({ error: 'Account is inactive. Please contact support.' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log(`Login attempt failed: Invalid password for email: ${normalizedEmail}`);
      return res.status(401).json({ error: 'Invalid email or password. Please check your credentials.' });
    }

    console.log(`Login successful for user: ${user.email} (${user.userType})`);

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        wallet: user.wallet,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    
    // Check if it's a MongoDB connection error
    if (error.name === 'MongooseError' || error.message?.includes('buffering timed out')) {
      return res.status(503).json({ 
        error: 'Database connection timeout',
        message: 'MongoDB is not responding. Please try again in a moment.'
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'Server error during login',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;

