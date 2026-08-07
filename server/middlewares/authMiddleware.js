const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Auth Middleware - Protect Routes by Verifying JWT
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract token from Bearer header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_narss_2026_change_in_production';
      const decoded = jwt.verify(token, secret);

      // Fetch user from database and attach to request
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, user account no longer exists',
        });
      }

      next();
    } catch (error) {
      console.error(`[Auth Middleware Error]: ${error.message}`);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token validation failed',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided',
    });
  }
};

/**
 * Role Authorization Middleware - Restrict Route Access to Allowed Roles
 * @param  {...string} roles Allowed roles ('Admin', 'Manager', 'Researcher', 'External Partner')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, missing user identity',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to perform this operation`,
      });
    }

    next();
  };
};

module.exports = {
  protect,
  authorize,
};
