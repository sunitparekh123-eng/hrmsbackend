const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LeaveBalance = sequelize.define('LeaveBalance', {
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
  available: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Current leaves available (accrual + admin_granted - used - lapsed)',
  },
  used: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total leaves used',
  },
  admin_granted: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Extra leaves granted by admin — never lapse',
  },
  lapsed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total leaves that lapsed due to 2-month no-usage rule',
  },
  last_accrual_month: {
    type: DataTypes.STRING(7),
    allowNull: true,
    comment: 'YYYY-MM of last monthly auto-accrual',
  },
  consecutive_no_usage_months: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Count of consecutive months without leave usage (resets on usage, max 2 triggers lapse)',
  },
}, {
  tableName: 'leave_balances',
  indexes: [
    { unique: true, fields: ['employee_id'] },
  ],
});

module.exports = LeaveBalance;