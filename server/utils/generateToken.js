const jwt = require('jsonwebtoken');

/**
 * Generates signed JWT Access Token
 * @param {string} id - User ObjectId
 * @param {string} role - User role
 * @returns {string} JWT Token
 */
const generateAccessToken = (id, role) => {
  const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_narss_2026_change_in_production';
  const expire = process.env.JWT_EXPIRE || '1d';
  return jwt.sign({ id, role }, secret, {
    expiresIn: expire,
  });
};

/**
 * Generates signed JWT Refresh Token
 * @param {string} id - User ObjectId
 * @returns {string} JWT Refresh Token
 */
const generateRefreshToken = (id) => {
  const secret = process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_token_key_narss_2026_change_in_production';
  const expire = process.env.JWT_REFRESH_EXPIRE || '7d';
  return jwt.sign({ id }, secret, {
    expiresIn: expire,
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
};
