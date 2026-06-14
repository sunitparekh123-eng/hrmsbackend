const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Office = sequelize.define('Office', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'companies', key: 'id' },
    comment: 'Parent company — enables multi-company → multi-location hierarchy',
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
    comment: 'Unique location code, e.g. LOC-IND',
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
    comment: 'GPS latitude for geo-fencing',
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false,
    comment: 'GPS longitude for geo-fencing',
  },
  radius_meters: {
    type: DataTypes.FLOAT,
    defaultValue: 200,
    allowNull: false,
    comment: 'Allowed radius in meters for punch-in/out',
    validate: { min: 10, max: 5000 },
  },
  contact_person: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Hub manager / site in-charge name',
  },
  contact_phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Contact number for the location',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'offices',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['company_id'] },
    { fields: ['code'], unique: true },
    { fields: ['is_active'] },
    { fields: ['city'] },
    { fields: ['state'] },
  ],
});

module.exports = Office;