const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PayrollCycle = sequelize.define('PayrollCycle', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  month: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'e.g. "May 2026"',
  },
  month_index: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 0, max: 11 },
    comment: '0-indexed month (0=January, 11=December)',
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Draft', 'Verified', 'Paid', 'Pending Audit'),
    defaultValue: 'Draft',
    allowNull: false,
  },
  paid_on: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  paid_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'employees', key: 'id' },
  },
  disbursement_mode: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'e.g. NEFT/RTGS, Cheque',
  },
  disbursement_reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  disbursement_remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'payroll_cycles',
  indexes: [
    { unique: true, fields: ['month_index', 'year'] },
    { fields: ['status'] },
  ],
});

module.exports = PayrollCycle;