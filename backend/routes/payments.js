const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Send payment
router.post('/send', auth, async (req, res) => {
  try {
    const { recipientPhone, recipientId, amount, message } = req.body;
    
    // Basic validation
    if ((!recipientPhone && !recipientId) || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Recipient and amount are required' });
    }

    const sender = await User.findById(req.user.userId);
    if (!sender) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check sender balance
    const balance = sender.wallet?.balance || 0;
    if (balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Find recipient by phone or ID
    let recipient;
    if (recipientId) {
      recipient = await User.findById(recipientId);
    } else if (recipientPhone) {
      recipient = await User.findOne({ phoneNumber: recipientPhone });
    }

    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Update balances
    sender.wallet = sender.wallet || { balance: 0, pendingBalance: 0 };
    recipient.wallet = recipient.wallet || { balance: 0, pendingBalance: 0 };
    
    sender.wallet.balance -= amount;
    recipient.wallet.pendingBalance = (recipient.wallet.pendingBalance || 0) + amount;

    await sender.save();
    await recipient.save();

    // Generate redemption code
    const redemptionCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    res.json({ 
      message: 'Payment sent successfully',
      payment: {
        transactionId,
        redemptionCode,
        amount,
        recipient: {
          id: recipient._id,
          name: recipient.name,
          phoneNumber: recipient.phoneNumber
        }
      },
      newBalance: sender.wallet.balance
    });
  } catch (error) {
    console.error('Error sending payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get payment history
router.get('/history', auth, async (req, res) => {
  try {
    // For now, return empty array - in production, query Payment model
    // This endpoint exists to prevent 404 errors
    res.json({ 
      payments: [],
      message: 'Payment history will be available soon'
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Redeem payment code
router.post('/redeem', auth, async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: 'Redemption code is required' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // For now, simulate redemption - in production, validate code from database
    // This is a placeholder that prevents errors
    const amount = user.wallet?.pendingBalance || 0;
    
    if (amount > 0) {
      user.wallet = user.wallet || { balance: 0, pendingBalance: 0 };
      user.wallet.balance = (user.wallet.balance || 0) + amount;
      user.wallet.pendingBalance = 0;
      await user.save();
    }

    res.json({ 
      message: 'Payment redeemed successfully',
      amount,
      newBalance: user.wallet.balance
    });
  } catch (error) {
    console.error('Error redeeming payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
