const Joi = require('joi');

const applyLoanSchema = Joi.object({
  type: Joi.string().valid('personal', 'emergency', 'education', 'vehicle', 'housing').required(),
  principal_amount: Joi.number().positive().required(),
  tenure_months: Joi.number().integer().min(1).max(60).required(),
  interest_rate: Joi.number().min(0).max(30).default(0),
  employee_id: Joi.number().integer().optional(),
});

const loanQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'closed', 'defaulted', 'pending', 'rejected').optional(),
  type: Joi.string().valid('personal', 'emergency', 'education', 'vehicle', 'housing').optional(),
  branch: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(100),
});

module.exports = { applyLoanSchema, loanQuerySchema };