const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required',
  }),
});

const registerSchema = Joi.object({
  // ── Core identity (required) ──
  emp_code: Joi.string().max(20).required(),
  name: Joi.string().max(100).required(),
  email: Joi.string().email().max(150).required(),
  phone: Joi.string().max(20).optional(),
  password: Joi.string().min(6).required(),
  designation: Joi.string().max(80).optional(),
  department: Joi.string().max(80).optional(),
  role: Joi.string().valid('admin', 'hr', 'manager', 'employee').default('employee'),
  date_of_joining: Joi.date().optional(),
  date_of_birth: Joi.date().optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  address: Joi.string().optional(),
  office_id: Joi.number().integer().optional(),
  company_id: Joi.number().integer().optional(),

  // ── Shift configuration ──
  shift_start_time: Joi.string()
    .pattern(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
    .optional()
    .messages({
      'string.pattern.base': 'Shift start time must be in HH:MM or HH:MM:SS format',
    }),
  shift_end_time: Joi.string()
    .pattern(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
    .optional()
    .messages({
      'string.pattern.base': 'Shift end time must be in HH:MM or HH:MM:SS format',
    }),
  half_day_late_minutes: Joi.number().integer().min(1).max(480).default(60).optional(),

  // ── Salary configuration ──
  fixed_gross: Joi.number().min(0).optional(),
  pf_applicable: Joi.boolean().default(true),
  pf_ceiling: Joi.boolean().default(false),
  // PF & ESIC contribution modes + rates (Phase 8)
  pf_contribution_mode: Joi.string().valid('none', 'employee_only', 'employer_only', 'shared').default('shared'),
  pf_employee_rate: Joi.number().min(0).max(1).default(0.12),
  pf_employer_rate: Joi.number().min(0).max(1).default(0.12),
  esic_applicable: Joi.boolean().default(false),
  esic_contribution_mode: Joi.string().valid('none', 'shared').default('shared'),
  esic_employee_rate: Joi.number().min(0).max(1).default(0.0075),
  esic_employer_rate: Joi.number().min(0).max(1).default(0.0325),
  pt_applicable: Joi.boolean().default(true),
  effective_work_days: Joi.number().integer().min(1).max(31).default(26),

  // ── Bank details ──
  bank_name: Joi.string().max(100).optional(),
  bank_account_number: Joi.string().max(30).optional(),
  ifsc_code: Joi.string().max(11).optional(),

  // ── Statutory identifiers ──
  pan_number: Joi.string().max(10).optional(),
  pf_number: Joi.string().max(30).optional(),
  uan: Joi.string().max(12).optional(),

  // ── Location / Company ──
  location: Joi.string().max(150).optional(),
  company_name: Joi.string().max(200).optional(),

  // ── Emergency contact ──
  emergency_contact_name: Joi.string().max(100).optional(),
  emergency_contact_relation: Joi.string().max(50).optional(),

  // ── Salary structure extras (flat allowances) ──
  special_allowance: Joi.number().min(0).optional(),
  conveyance: Joi.number().min(0).optional(),
  medical_allowance: Joi.number().min(0).optional(),

  // ── Offer letter toggle ──
  send_offer_letter: Joi.boolean().default(true),
});

const salaryStructureSchema = Joi.object({
  fixed_gross: Joi.number().min(0).required(),
  pf_applicable: Joi.boolean().default(true),
  pf_ceiling: Joi.boolean().default(false),
  // PF & ESIC contribution modes + rates (Phase 8)
  pf_contribution_mode: Joi.string().valid('none', 'employee_only', 'employer_only', 'shared').default('shared'),
  pf_employee_rate: Joi.number().min(0).max(1).default(0.12),
  pf_employer_rate: Joi.number().min(0).max(1).default(0.12),
  esic_applicable: Joi.boolean().default(false),
  esic_contribution_mode: Joi.string().valid('none', 'shared').default('shared'),
  esic_employee_rate: Joi.number().min(0).max(1).default(0.0075),
  esic_employer_rate: Joi.number().min(0).max(1).default(0.0325),
  pt_applicable: Joi.boolean().default(true),
  effective_work_days: Joi.number().integer().min(1).max(31).default(26),
  special_allowance: Joi.number().min(0).optional(),
  conveyance: Joi.number().min(0).optional(),
  medical_allowance: Joi.number().min(0).optional(),
  effective_from: Joi.date().optional(),
  remarks: Joi.string().max(500).optional(),
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string().min(6).required().messages({
    'string.min': 'New password must be at least 6 characters',
  }),
});

const refreshTokenSchema = Joi.object({
  refresh_token: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required',
  }),
  new_password: Joi.string().min(6).required().messages({
    'string.min': 'New password must be at least 6 characters',
    'any.required': 'New password is required',
  }),
});

module.exports = {
  loginSchema,
  registerSchema,
  salaryStructureSchema,
  changePasswordSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};