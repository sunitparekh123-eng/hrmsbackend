const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LeaveRequest = sequelize.define('LeaveRequest', {
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
  leave_type: {
    type: DataTypes.ENUM('el'),
    defaultValue: 'el',
    comment: 'Only Earned Leave (EL) — single leave type system',
  },
  from_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  to_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  duration: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Number of leave days',
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  contact_during_leave: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
    defaultValue: 'pending',
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
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Remarks by approver',
  },
}, {
  tableName: 'leave_requests',
  indexes: [
    { fields: ['employee_id'] },
    { fields: ['status'] },
    { fields: ['from_date', 'to_date'] },
  ],
});

module.exports = LeaveRequest;