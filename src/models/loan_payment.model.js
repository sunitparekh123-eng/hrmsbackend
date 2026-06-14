const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LoanPayment = sequelize.define('LoanPayment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  loan_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'loans', key: 'id' },
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  principal_part: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  interest_part: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  paid_on: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  month: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('paid', 'pending', 'overdue'),
    defaultValue: 'paid',
  },
}, {
  tableName: 'loan_payments',
  indexes: [
    { fields: ['loan_id'] },
    { fields: ['paid_on'] },
  ],
});

module.exports = LoanPayment;