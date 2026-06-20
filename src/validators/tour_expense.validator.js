const Joi = require('joi');

const createClaimSchema = Joi.object({
  purpose: Joi.string().max(255).required(),
  from_location: Joi.string().max(100).required(),
  to_location: Joi.string().max(100).required(),
  start_date: Joi.date().required(),
  end_date: Joi.date().required(),
  amount: Joi.number().precision(2).positive().required(),
  category: Joi.string().max(100).required(),
  receipts: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      size: Joi.string().required(),
      type: Joi.string().required(),
      url: Joi.string().optional().allow(''),
    })
  ).optional().default([]),
  remarks: Joi.string().max(500).optional().allow(''),
});

const rejectClaimSchema = Joi.object({
  rejected_reason: Joi.string().max(500).required(),
});

module.exports = {
  createClaimSchema,
  rejectClaimSchema,
};
