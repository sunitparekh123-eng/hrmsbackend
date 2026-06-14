const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Generate access token
 * @param {Object} payload - { id, emp_code, role }
 * @returns {String} JWT access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

/**
 * Generate refresh token
 * @param {Object} payload - { id, emp_code }
 * @returns {String} JWT refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
};

/**
 * Verify access token
 * @param {String} token - JWT token
 * @returns {Object|null} Decoded payload or null if invalid
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Verify refresh token
 * @param {String} token - JWT refresh token
 * @returns {Object|null} Decoded payload or null if invalid
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};