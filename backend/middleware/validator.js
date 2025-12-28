// Input validation middleware

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  // Allow formats: +1234567890, (123) 456-7890, 123-456-7890, etc.
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone);
};

const validateObjectId = (id) => {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

// Validation middleware factory
const validate = (rules) => {
  return (req, res, next) => {
    const errors = [];

    for (const [field, validators] of Object.entries(rules)) {
      const value = req.body[field] || req.params[field] || req.query[field];

      for (const validator of validators) {
        if (validator.required && (value === undefined || value === null || value === '')) {
          errors.push(`${field} is required`);
          break;
        }

        if (value !== undefined && value !== null && value !== '') {
          if (validator.type && typeof value !== validator.type) {
            errors.push(`${field} must be of type ${validator.type}`);
          }

          if (validator.min && value.length < validator.min) {
            errors.push(`${field} must be at least ${validator.min} characters`);
          }

          if (validator.max && value.length > validator.max) {
            errors.push(`${field} must be at most ${validator.max} characters`);
          }

          if (validator.minValue && Number(value) < validator.minValue) {
            errors.push(`${field} must be at least ${validator.minValue}`);
          }

          if (validator.maxValue && Number(value) > validator.maxValue) {
            errors.push(`${field} must be at most ${validator.maxValue}`);
          }

          if (validator.email && !validateEmail(value)) {
            errors.push(`${field} must be a valid email address`);
          }

          if (validator.phone && !validatePhone(value)) {
            errors.push(`${field} must be a valid phone number`);
          }

          if (validator.objectId && !validateObjectId(value)) {
            errors.push(`${field} must be a valid ID`);
          }

          if (validator.custom && !validator.custom(value)) {
            errors.push(validator.message || `${field} is invalid`);
          }
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors
      });
    }

    next();
  };
};

module.exports = {
  validate,
  validateEmail,
  validatePhone,
  validateObjectId
};


