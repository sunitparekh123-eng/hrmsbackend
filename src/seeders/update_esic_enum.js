const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { sequelize } = require('../models');

const updateEnum = async () => {
  try {
    console.log('🔄 Updating esic_contribution_mode ENUM in database...');
    
    await sequelize.query(`
      ALTER TABLE employees
      MODIFY COLUMN esic_contribution_mode ENUM('none', 'employee_only', 'employer_only', 'shared') DEFAULT 'shared';
    `);
    console.log('✅ Updated employees table');

    await sequelize.query(`
      ALTER TABLE salary_structures
      MODIFY COLUMN esic_contribution_mode ENUM('none', 'employee_only', 'employer_only', 'shared') DEFAULT 'shared';
    `);
    console.log('✅ Updated salary_structures table');

    console.log('🎉 ENUM update complete!');
  } catch (error) {
    console.error('❌ Failed to update ENUM:', error.message);
  } finally {
    await sequelize.close();
  }
};

updateEnum();
