const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Letter = sequelize.define('Letter', {
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
    type: DataTypes.ENUM('offer', 'appointment', 'promotion', 'transfer', 'resignation', 'experience', 'relieving'),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  issued_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  issued_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'employees', key: 'id' },
  },
  status: {
    type: DataTypes.ENUM('draft', 'issued', 'acknowledged', 'revoked'),
    defaultValue: 'draft',
  },
  acknowledged_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'letters',
  indexes: [
    { fields: ['employee_id'] },
    { fields: ['type'] },
    { fields: ['status'] },
  ],
});

module.exports = Letter;