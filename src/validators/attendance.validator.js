const Joi = require('joi');

const punchInSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  office_id: Joi.number().integer().optional(),
  photo_path: Joi.string().optional(),
});

const punchOutSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  photo_path: Joi.string().optional(),
});

const monthlyQuerySchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).optional(),
  year: Joi.number().integer().min(2020).max(2030).optional(),
});

const adminLiveQuerySchema = Joi.object({
  office_id: Joi.number().integer().optional(),
  company_id: Joi.number().integer().optional(),
  search: Joi.string().allow('', null).optional(),
  status: Joi.string().valid('Present', 'Absent', 'Late', 'Half Day', 'On Leave', 'Weekend').optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

const adminHistoryQuerySchema = Joi.object({
  office_id: Joi.number().integer().optional(),
  company_id: Joi.number().integer().optional(),
  search: Joi.string().allow('', null).optional(),
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

const adminMonthlyQuerySchema = Joi.object({
  office_id: Joi.number().integer().optional(),
  company_id: Joi.number().integer().optional(),
  search: Joi.string().allow('', null).optional(),
  month: Joi.number().integer().min(1).max(12).optional(),
  year: Joi.number().integer().min(2020).max(2030).optional(),
});

const manualEntrySchema = Joi.object({
  employeeId: Joi.string().trim().required()
    .messages({
      'string.empty': 'Employee ID is required',
      'any.required': 'Employee ID is required',
    }),
  date: Joi.date().iso().required()
    .messages({
      'date.format': 'Date must be in YYYY-MM-DD format',
      'any.required': 'Date is required',
    }),
  status: Joi.string().valid('Present', 'Absent', 'Half Day').required()
    .messages({
      'any.only': 'Status must be Present, Absent, or Half Day',
      'any.required': 'Status is required',
    }),
  reason: Joi.string().allow('', null).max(500).optional(),
});

module.exports = {
  punchInSchema,
  punchOutSchema,
  monthlyQuerySchema,
  manualEntrySchema,
  adminLiveQuerySchema,
  adminHistoryQuerySchema,
  adminMonthlyQuerySchema,
};