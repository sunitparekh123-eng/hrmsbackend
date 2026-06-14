/**
 * ═══════════════════════════════════════════════════════
 *  HRMS — Production Seed (Minimal)
 *
 *  Seeds only what's required for a clean production start:
 *    1. Companies
 *    2. Office Branches
 *    3. One Super-Admin employee
 *
 *  Run: node src/seeders/seed_production.js
 *
 *  ⚠️  This DROPS and RE-CREATES all tables. Only run once
 *      on a fresh database. After that use onboarding to add employees.
 * ═══════════════════════════════════════════════════════
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const {
  sequelize,
  Company,
  Office,
  Employee,
  LeaveBalance,
  SalaryStructure,
} = require('../models');
const logger = require('../utils/logger');

const seed = async () => {
  try {
    logger.info('🌱 Starting production seed...');

    // ── Recreate all tables (fresh start) ──
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.sync({ force: true });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    logger.info('✅ All tables created fresh');

    // ══════════════════════════════════════════════
    // 1. COMPANIES
    // ══════════════════════════════════════════════
    const companies = await Company.bulkCreate([
      {
        name: 'BP Marketing',
        address: '12/3, MG Road, Vijay Nagar, Indore, Madhya Pradesh 452010',
        is_active: true,
      },
      {
        name: 'Apaar Logistics',
        address: 'Plot 45, Transport Nagar, Ratlam, Madhya Pradesh 457001',
        is_active: true,
      },
      {
        name: 'AE Solutions',
        address: 'Sector 5, Industrial Area, Noida, Uttar Pradesh 201301',
        is_active: true,
      },
      {
        name: 'PJ Enterprises',
        address: 'Phase 2, Industrial Area, Gurgaon, Haryana 122018',
        is_active: true,
      },
    ]);
    logger.info(`✅ Created ${companies.length} companies`);

    // ══════════════════════════════════════════════
    // 2. OFFICE BRANCHES
    //    company_id references the order above:
    //      1 = BP Marketing
    //      2 = Apaar Logistics
    //      3 = AE Solutions
    //      4 = PJ Enterprises
    // ══════════════════════════════════════════════
    const offices = await Office.bulkCreate([
      // ── BP Marketing ──
      {
        company_id: 1,
        code: 'BPM-IND',
        name: 'BP Marketing — Indore HQ',
        address: '12/3, MG Road, Vijay Nagar, Indore, MP 452010',
        city: 'Indore',
        state: 'Madhya Pradesh',
        latitude: 22.7196,
        longitude: 75.8577,
        radius_meters: 300,
        contact_person: 'Admin',
        contact_phone: '9800000001',
        is_active: true,
      },
      {
        company_id: 1,
        code: 'BPM-RTM',
        name: 'BP Marketing — Ratlam Branch',
        address: 'Station Road, Ratlam, MP 457001',
        city: 'Ratlam',
        state: 'Madhya Pradesh',
        latitude: 23.3315,
        longitude: 75.0367,
        radius_meters: 250,
        contact_person: 'Admin',
        contact_phone: '9800000002',
        is_active: true,
      },

      // ── Apaar Logistics ──
      {
        company_id: 2,
        code: 'APR-IND',
        name: 'Apaar Logistics — Indore',
        address: 'Transport Nagar, AB Road, Indore, MP 452010',
        city: 'Indore',
        state: 'Madhya Pradesh',
        latitude: 22.6916,
        longitude: 75.8277,
        radius_meters: 300,
        contact_person: 'Admin',
        contact_phone: '9800000003',
        is_active: true,
      },
      {
        company_id: 2,
        code: 'APR-RTM',
        name: 'Apaar Logistics — Ratlam Depot',
        address: 'Plot 45, Transport Nagar, Ratlam, MP 457001',
        city: 'Ratlam',
        state: 'Madhya Pradesh',
        latitude: 23.3415,
        longitude: 75.0467,
        radius_meters: 200,
        contact_person: 'Admin',
        contact_phone: '9800000004',
        is_active: true,
      },
      {
        company_id: 2,
        code: 'APR-UJJ',
        name: 'Apaar Logistics — Ujjain',
        address: 'Freeganj, Ujjain, MP 456010',
        city: 'Ujjain',
        state: 'Madhya Pradesh',
        latitude: 23.1793,
        longitude: 75.7849,
        radius_meters: 250,
        contact_person: 'Admin',
        contact_phone: '9800000005',
        is_active: true,
      },

      // ── AE Solutions ──
      {
        company_id: 3,
        code: 'AES-NOI',
        name: 'AE Solutions — Noida Office',
        address: 'Sector 62, Noida, UP 201309',
        city: 'Noida',
        state: 'Uttar Pradesh',
        latitude: 28.6270,
        longitude: 77.3640,
        radius_meters: 200,
        contact_person: 'Admin',
        contact_phone: '9800000006',
        is_active: true,
      },

      // ── PJ Enterprises ──
      {
        company_id: 4,
        code: 'PJE-GGN',
        name: 'PJ Enterprises — Gurgaon',
        address: 'Sector 37, Industrial Area Phase 2, Gurgaon, HR 122018',
        city: 'Gurgaon',
        state: 'Haryana',
        latitude: 28.4595,
        longitude: 77.0266,
        radius_meters: 150,
        contact_person: 'Admin',
        contact_phone: '9800000007',
        is_active: true,
      },
    ]);
    logger.info(`✅ Created ${offices.length} office branches`);

    // ══════════════════════════════════════════════
    // 3. SUPER-ADMIN EMPLOYEE
    //    Assign to company 1 (BP Marketing), office 1 (Indore HQ)
    //
    //    🔑 Login credentials (change password after first login!):
    //       Email:    admin@bpmarketing.com
    //       Password: Admin@1234
    // ══════════════════════════════════════════════
    const adminPassword = await bcrypt.hash('Admin@1234', 12);

    const admin = await Employee.create({
      emp_code: 'ADM001',
      name: 'Super Admin',
      email: 'admin@bpmarketing.com',
      phone: '9800000000',
      password: adminPassword,
      designation: 'System Administrator',
      department: 'Administration',
      role: 'admin',
      status: 'active',
      date_of_joining: new Date().toISOString().slice(0, 10), // today
      gender: 'male',
      address: 'Head Office, Indore',
      company_id: 1,
      office_id: 1,
      company_name: 'BP Marketing',
      location: 'Indore',
      // Salary (admin — adjust later via admin panel)
      fixed_gross: 0,
      basic_salary: 0,
      pf_applicable: false,
      pf_ceiling: false,
      esic_applicable: false,
      pf_contribution_mode: 'none',
      esic_contribution_mode: 'none',
      shift_start_time: '09:00',
      shift_end_time: '18:00',
      half_day_late_minutes: 60,
      is_first_login: false,
    });
    logger.info(`✅ Created admin: ${admin.email}`);

    // Salary structure for admin (zero salary — admin usually doesn't have payroll)
    await SalaryStructure.create({
      employee_id: admin.id,
      fixed_gross: 0,
      basic_salary: 0,
      hra: 0,
      other_allowance: 0,
      conveyance: 0,
      medical_allowance: 0,
      special_allowance: 0,
      pf_applicable: false,
      pf_ceiling: false,
      pf_contribution_mode: 'none',
      pf_employee_rate: 0,
      pf_employer_rate: 0,
      esic_applicable: false,
      esic_contribution_mode: 'none',
      esic_employee_rate: 0,
      esic_employer_rate: 0,
      pt_applicable: false,
      effective_work_days: 26,
      effective_from: new Date().toISOString().slice(0, 10),
    });

    // Leave balance for admin (EL — kept at 0 initially)
    await LeaveBalance.create({
      employee_id: admin.id,
      available: 0,
      used: 0,
      admin_granted: 0,
      lapsed: 0,
      last_accrual_month: new Date().toISOString().slice(0, 7),
      consecutive_no_usage_months: 0,
    });

    // ══════════════════════════════════════════════
    // SUMMARY
    // ══════════════════════════════════════════════
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('🎉 Production seed completed!');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info(`   Companies   : ${companies.length}`);
    logger.info(`   Branches    : ${offices.length}`);
    logger.info(`   Admin users : 1`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('🔑 Admin Login:');
    logger.info('   Email    : admin@bpmarketing.com');
    logger.info('   Password : Admin@1234');
    logger.info('   ⚠️  Change this password immediately after first login!');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('📌 Next steps:');
    logger.info('   1. Log in to admin panel with above credentials');
    logger.info('   2. Go to Onboarding → Add your real employees');
    logger.info('   3. Update company & office details from admin panel');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Production seed failed:');
    logger.error('  message:', error.message);
    if (error.original) {
      logger.error('  sqlMessage:', error.original.sqlMessage);
    }
    logger.error(error.stack);
    process.exit(1);
  }
};

seed();
