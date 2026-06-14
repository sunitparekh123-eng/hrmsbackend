const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MonthlyAttendance = sequelize.define('MonthlyAttendance', {
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
  month: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 12 },
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  present_days: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  absent_days: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  late_days: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  half_days: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  holiday_days: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  weekend_days: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  total_working_days: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  attendance_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  },
}, {
  tableName: 'monthly_attendances',
  indexes: [
    { unique: true, fields: ['employee_id', 'month', 'year'] },
  ],
});

module.exports = MonthlyAttendance;