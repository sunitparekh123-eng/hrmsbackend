const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PerformanceReview = sequelize.define('PerformanceReview', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'employees', key: 'id' },
  },
  review_period: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'e.g. "Q1 2024", "Annual 2024"',
  },
  overall_score: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    comment: 'Weighted average score 0-100',
  },
  delivery_score: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  },
  quality_score: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  },
  learning_score: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  },
  rating: {
    type: DataTypes.ENUM('excellent', 'good', 'average', 'below_average', 'poor'),
    allowNull: true,
  },
  comments: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  reviewed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'employees', key: 'id' },
  },
  reviewed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('draft', 'submitted', 'reviewed', 'finalized'),
    defaultValue: 'draft',
  },
}, {
  tableName: 'performance_reviews',
  indexes: [
    { unique: true, fields: ['employee_id', 'review_period'] },
  ],
});

module.exports = PerformanceReview;