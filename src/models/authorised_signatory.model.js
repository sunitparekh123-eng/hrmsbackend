const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuthorisedSignatory = sequelize.define('AuthorisedSignatory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  designation: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  signature_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'authorised_signatories',
  timestamps: true,
});

module.exports = AuthorisedSignatory;
