const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

// Send payment
router.post('/send', auth, async (req, res) => {
  try {
    const { recipientId, amount, message } = req.body;
    
    // Basic validation
    if (!recipientId || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid payment data' });
    }

    // TODO: Implement actual payment logic with Stripe
    res.json({ 
      message: 'Payment sent successfully',
      transactionId: 'temp_' + Date.now()
    });
  } catch (error) {
    console.error('Error sending payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
