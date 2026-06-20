const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TourExpensePolicy = sequelize.define('TourExpensePolicy', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  label: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  limit_detail: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  note: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  is_general_rule: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  general_rules_text: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'tour_expense_policies',
});

module.exports = TourExpensePolicy;
