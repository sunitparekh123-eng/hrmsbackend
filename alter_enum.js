require('dotenv').config();
const { sequelize } = require('./src/models');
sequelize.query("ALTER TABLE letter_templates MODIFY COLUMN type ENUM('offer', 'appointment', 'promotion', 'transfer', 'resignation', 'experience', 'relieving', 'warning') NOT NULL;")
  .then(() => {
    console.log('Altered');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
