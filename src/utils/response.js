/**
 * Standardized API response helpers
 */

/**
 * Success response
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {String} message - Success message
 * @param {Number} statusCode - HTTP status code
 */
const success = (res, message = 'Success', data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Error response
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Number} statusCode - HTTP status code
 * @param {Object} errors - Detailed error info (validation errors, etc.)
 */
const error = (res, message = 'Internal Server Error', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

/**
 * Paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {Number} total - Total count
 * @param {Number} page - Current page
 * @param {Number} limit - Items per page
 * @param {String} message - Success message
 */
const paginated = (res, message = 'Success', data = [], pagination = {}, statusCode = 200) => {
  const { total = 0, page = 1, limit = 10, totalPages: tp } = pagination;
  const totalPages = tp || Math.ceil(total / limit);
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * No content / deleted response
 * @param {Object} res - Express response object
 * @param {String} message - Success message
 */
const noContent = (res, message = 'Deleted successfully') => {
  return res.status(204).json({
    success: true,
    message,
  });
};

module.exports = { success, error, paginated, noContent };