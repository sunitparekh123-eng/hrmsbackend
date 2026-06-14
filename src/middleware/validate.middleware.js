const { error } = require('../utils/response');

/**
 * Validation middleware — validates request body/params/query against Joi schema
 * @param {Object} schema - Joi validation schema
 * @param {String} source - 'body', 'params', or 'query'
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    const { value, error: validationError } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (validationError) {
      const errors = validationError.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return error(res, 'Validation error', 400, errors);
    }

    // Replace request data with validated/sanitized value
    req[source] = value;
    next();
  };
};

module.exports = { validate };