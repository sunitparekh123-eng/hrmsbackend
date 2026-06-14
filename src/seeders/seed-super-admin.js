const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { sequelize, Employee, Office } = require('../models');

const seedSuperAdmin = async () => {
  try {
    console.log('🔑 Seeding Super Admin...\n');

    // Ensure office 1 exists (should already exist from original seed)
    let office = await Office.findByPk(1);
    if (!office) {
      office = await Office.create({
        name: 'Head Office - Mumbai',
        address: 'Plot 42, Bandra Kurla Complex, Bandra East, Mumbai, Maharashtra 400051',
        latitude: 19.0640,
        longitude: 72.8357,
        radius_meters: 300,
        is_active: true,
      });
      console.log('✅ Created office: Head Office - Mumbai');
    } else {
      console.log('✅ Office #1 already exists:', office.name);
    }

    // Check if admin already exists
    const existing = await Employee.findOne({ where: { email: 'admin@hrms.com' } });
    if (existing) {
      console.log('\n⚠️  Super admin already exists!');
      console.log('   Email   : admin@hrms.com');
      console.log('   Password: Password@123');
      console.log('   Role    : admin');
      await sequelize.close();
      return;
    }

    const passwordHash = await bcrypt.hash('Password@123', 12);

    const admin = await Employee.create({
      emp_code: 'ADMIN001',
      name: 'Super Admin',
      email: 'admin@hrms.com',
      phone: '9999999999',
      password: passwordHash,
      designation: 'System Administrator',
      department: 'Administration',
      role: 'admin',
      status: 'active',
      date_of_joining: '2024-01-01',
      date_of_birth: '1990-01-01',
      gender: 'male',
      office_id: 1,
      is_first_login: false,
      basic_salary: 150000,
    });

    console.log('✅ Super Admin created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  LOGIN CREDENTIALS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Email   : admin@hrms.com');
    console.log('  Password: Password@123');
    console.log('  Role    : admin');
    console.log('  Emp Code: ADMIN001');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('❌ Failed to seed super admin:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

seedSuperAdmin();