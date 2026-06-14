const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
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
  message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  type: {
    type: DataTypes.ENUM('info', 'warning', 'success', 'error', 'reminder'),
    defaultValue: 'info',
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'e.g. "attendance", "leave", "payroll"',
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  action_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
}, {
  tableName: 'notifications',
  indexes: [
    { fields: ['employee_id'] },
    { fields: ['is_read'] },
    { fields: ['type'] },
  ],
});

module.exports = Notification;