const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');

const router = express.Router();

// Login route
router.post('/login', async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        message: 'Database not ready',
        error: 'MongoDB connection not established'
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

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
    const nameParts = (user.name || '').split(' ')
    const userFirstName = nameParts[0] || ''
    const userLastName = nameParts.slice(1).join(' ') || ''

    // Return user data and token
    res.json({
      token,
      user: {
        id: user._id,
        _id: user._id,
        email: user.email,
        name: user.name,
        firstName: userFirstName,
        lastName: userLastName,
        phoneNumber: user.phoneNumber,
        userType: user.userType || 'user',
        wallet: user.wallet || { balance: 0, pendingBalance: 0 },
        friends: user.friends || [],
        location: user.location || { isVisible: true }
      }
    });

  } catch (error) {
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
      wallet: { balance: 0, pendingBalance: 0 },
      friends: [],
      location: { isVisible: true }
    });

    await newUser.save();

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
        userType: newUser.userType,
        wallet: newUser.wallet,
        friends: newUser.friends,
        location: newUser.location
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

module.exports = router;
