const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SalaryRevision = sequelize.define('SalaryRevision', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'employees',
      key: 'id',
    },
  },
  previous_gross: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    comment: 'NULL for initial salary setup',
  },
  new_gross: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  previous_basic: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  new_basic: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  revision_type: {
    type: DataTypes.ENUM('initial', 'appraisal', 'promotion', 'correction'),
    allowNull: false,
  },
  effective_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'employees',
      key: 'id',
    },
  },
}, {
  tableName: 'salary_revisions',
  timestamps: true,
  indexes: [
    { fields: ['employee_id'] },
    { fields: ['effective_date'] },
    { fields: ['revision_type'] },
  ],
});

module.exports = SalaryRevision;