const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set. Server cannot start safely.');
}

const auth = (req, res, next) => {
  try {
    // Prefer Authorization header (API calls, Socket.io).
    // Fall back to HttpOnly cookie (page reloads / session restore).
    const token =
      req.header('Authorization')?.replace('Bearer ', '') ||
      req.cookies?.token;

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.name === 'NotBeforeError') {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    console.error('Auth middleware error:', error.message);
    res.status(500).json({ message: 'Authentication error' });
  }
};

module.exports = auth;
