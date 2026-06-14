const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { sequelize } = require('../config/database');

async function run() {
  try {
    await sequelize.query(
      "ALTER TABLE loans MODIFY COLUMN status ENUM('active','closed','defaulted','pending','rejected') NOT NULL DEFAULT 'pending'"
    );
    console.log('✓ loans.status ENUM updated to include pending/rejected');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await sequelize.close();
  }
}

run();
