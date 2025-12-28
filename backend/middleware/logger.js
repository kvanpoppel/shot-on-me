// Request logging middleware
const logger = {
  // Log request details
  logRequest: (req, res, next) => {
    const start = Date.now();
    
    // Log request
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - IP: ${req.ip}`);
    
    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - start;
      const statusColor = res.statusCode >= 400 ? '❌' : res.statusCode >= 300 ? '⚠️' : '✅';
      console.log(
        `${statusColor} [${new Date().toISOString()}] ${req.method} ${req.path} - ` +
        `Status: ${res.statusCode} - Duration: ${duration}ms - IP: ${req.ip}`
      );
    });
    
    next();
  },

  // Log errors with context
  logError: (err, req, res, next) => {
    const errorLog = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      ip: req.ip,
      userId: req.user?.userId || 'anonymous',
      error: {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        name: err.name
      },
      body: req.body && Object.keys(req.body).length > 0 ? '***' : undefined, // Don't log sensitive data
      query: req.query && Object.keys(req.query).length > 0 ? req.query : undefined
    };

    console.error('❌ ERROR:', JSON.stringify(errorLog, null, 2));
    
    // In production, you would send this to an error tracking service
    // Example: Sentry.captureException(err, { extra: errorLog });
    
    next(err);
  },

  // Log database operations (optional, for debugging)
  logDatabase: (operation, collection, duration, success) => {
    if (process.env.NODE_ENV === 'development') {
      const status = success ? '✅' : '❌';
      console.log(
        `${status} DB [${collection}] ${operation} - ${duration}ms`
      );
    }
  }
};

module.exports = logger;


