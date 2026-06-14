const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PayrollEntry = sequelize.define('PayrollEntry', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  cycle_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'payroll_cycles', key: 'id' },
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'employees', key: 'id' },
  },
  absent_days: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  bonus: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  previous_arrears: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  incentive: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  loan_deduction: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  other_deduction: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('Draft', 'Verified', 'Paid', 'Pending Audit'),
    defaultValue: 'Draft',
    allowNull: false,
  },
}, {
  tableName: 'payroll_entries',
  indexes: [
    { unique: true, fields: ['cycle_id', 'employee_id'] },
    { fields: ['status'] },
  ],
});

module.exports = PayrollEntry;