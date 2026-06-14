const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PerformanceObjective = sequelize.define('PerformanceObjective', {
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
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'e.g. "delivery", "quality", "learning"',
  },
  weight: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 1,
    comment: 'Weight for weighted average calculation',
  },
  progress: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    comment: 'Progress percentage 0-100',
  },
  status: {
    type: DataTypes.ENUM('not_started', 'in_progress', 'completed', 'overdue'),
    defaultValue: 'not_started',
  },
  target_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
}, {
  tableName: 'performance_objectives',
  indexes: [
    { fields: ['employee_id'] },
    { fields: ['status'] },
  ],
});

module.exports = PerformanceObjective;