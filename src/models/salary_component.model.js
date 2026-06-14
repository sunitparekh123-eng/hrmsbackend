const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SalaryComponent = sequelize.define('SalaryComponent', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  payslip_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'payslips', key: 'id' },
  },
  name: {
    type: DataTypes.STRING(80),
    allowNull: false,
    comment: 'e.g. "HRA", "Transport Allowance", "Professional Tax"',
  },
  type: {
    type: DataTypes.ENUM('earning', 'deduction'),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'e.g. "allowance", "bonus", "statutory", "tax"',
  },
}, {
  tableName: 'salary_components',
  indexes: [
    { fields: ['payslip_id'] },
    { fields: ['type'] },
  ],
});

module.exports = SalaryComponent;