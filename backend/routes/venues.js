// Add a debug endpoint to check all venues (including inactive)
// This will help us find Kate's Pub
router.get('/debug/all', auth, async (req, res) => {
  try {
    // Only allow in development or for admins
    if (process.env.NODE_ENV === 'production' && req.user.userType !== 'venue') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const venues = await Venue.find({}).select('name isActive location owner');
    res.json({ venues, count: venues.length });
  } catch (error) {
    console.error('Error fetching all venues:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
