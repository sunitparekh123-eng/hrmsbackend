const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TourExpense = sequelize.define('TourExpense', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  claim_code: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'employees', key: 'id' },
  },
  purpose: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  from_location: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  to_location: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  receipts: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'employees', key: 'id' },
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  rejected_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'tour_expenses',
  indexes: [
    { fields: ['employee_id'] },
    { fields: ['status'] },
    { fields: ['claim_code'] },
  ],
});

module.exports = TourExpense;
