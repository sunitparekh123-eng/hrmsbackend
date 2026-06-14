const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Document = sequelize.define('Document', {
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
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('id_proof', 'address_proof', 'certificate', 'offer_letter', 'contract', 'other'),
    allowNull: false,
  },
  file_path: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'File size in bytes',
  },
  mime_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected'),
    defaultValue: 'pending',
  },
  verified_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'employees', key: 'id' },
  },
  verified_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'documents',
  indexes: [
    { fields: ['employee_id'] },
    { fields: ['type'] },
    { fields: ['status'] },
  ],
});

module.exports = Document;