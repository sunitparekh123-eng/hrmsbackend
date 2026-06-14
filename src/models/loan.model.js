const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Loan = sequelize.define('Loan', {
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
  type: {
    type: DataTypes.ENUM('personal', 'emergency', 'education', 'vehicle', 'housing'),
    allowNull: false,
  },
  principal_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  interest_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    comment: 'Annual interest rate in percentage',
  },
  tenure_months: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  emi_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  total_remaining: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  paid_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('active', 'closed', 'defaulted', 'pending', 'rejected'),
    defaultValue: 'pending',
  },
  disbursed_on: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'employees', key: 'id' },
  },
}, {
  tableName: 'loans',
  indexes: [
    { fields: ['employee_id'] },
    { fields: ['status'] },
  ],
});

module.exports = Loan;