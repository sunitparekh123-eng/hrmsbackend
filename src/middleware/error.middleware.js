const logger = require('../utils/logger');

/**
 * Custom application error class for throwing controlled errors
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware
 * Handles Sequelize errors, validation errors, Multer errors, and generic errors
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors = null;

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Validation error';
    errors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
      value: e.value,
    }));
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = 'Duplicate entry';
    errors = err.errors.map((e) => ({
      field: e.path,
      message: `${e.value} already exists`,
    }));
  }

  // Sequelize foreign key constraint error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Referenced record does not exist';
  }

  // Sequelize database connection error
  if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError') {
    statusCode = 503;
    message = 'Database connection error';
  }

  // Joi validation error
  if (err.isJoi) {
    statusCode = 400;
    message = 'Validation error';
    errors = err.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Multer file upload errors
  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File too large. Maximum size is 10MB.';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files. Maximum is 10 files per request.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = `Unexpected file field: ${err.field}. Use 'file' for single upload or 'files' for multiple.`;
    } else {
      message = err.message || 'File upload error';
    }
  }

  // Multer file filter error (thrown as generic Error)
  if (err.message && err.message.includes('File type') && err.message.includes('not allowed')) {
    statusCode = 400;
    message = err.message;
  }

  // Custom application error with statusCode
  if (err.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // Bad request error
  if (err.name === 'BadRequestError') {
    statusCode = 400;
    message = err.message;
  }

  // Not found error
  if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = err.message;
  }

  // Log the error
  if (statusCode >= 500) {
    logger.error(`[${statusCode}] ${message}:`, err.stack || err);
  } else {
    if (errors) {
      logger.warn(`[${statusCode}] ${message} - Details: ${JSON.stringify(errors)}`);
    } else {
      logger.warn(`[${statusCode}] ${message}`);
    }
  }

  // Send response
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(statusCode >= 500 && process.env.NODE_ENV === 'development' && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
};

module.exports = { errorHandler, AppError };