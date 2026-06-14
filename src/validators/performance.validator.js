const Joi = require('joi');

const objectiveSchema = Joi.object({
  title: Joi.string().max(200).required(),
  description: Joi.string().optional(),
  category: Joi.string().valid('delivery', 'quality', 'learning', 'leadership', 'other').optional(),
  weight: Joi.number().min(0).max(10).default(1),
  target_date: Joi.date().optional(),
});

const updateObjectiveSchema = Joi.object({
  progress: Joi.number().min(0).max(100).optional(),
  status: Joi.string().valid('not_started', 'in_progress', 'completed', 'overdue').optional(),
});

const reviewSchema = Joi.object({
  review_period: Joi.string().max(50).required(),
  overall_score: Joi.number().min(0).max(100).optional(),
  delivery_score: Joi.number().min(0).max(100).optional(),
  quality_score: Joi.number().min(0).max(100).optional(),
  learning_score: Joi.number().min(0).max(100).optional(),
  rating: Joi.string().valid('excellent', 'good', 'average', 'below_average', 'poor').optional(),
  comments: Joi.string().optional(),
});

module.exports = { objectiveSchema, updateObjectiveSchema, reviewSchema };