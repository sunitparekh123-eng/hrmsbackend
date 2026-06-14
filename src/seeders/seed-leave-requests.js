/**
 * Targeted seed — inserts leave requests WITHOUT destroying existing data.
 * Run: node src/seeders/seed-leave-requests.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { sequelize, LeaveRequest, LeaveBalance } = require('../models');
const logger = require('../utils/logger');

const seed = async () => {
  try {
    logger.info('🌱 Inserting leave requests...');

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    const pad = (n) => String(n).padStart(2, '0');

    // Check if we already have leave requests
    const existing = await LeaveRequest.count();
    if (existing > 0) {
      logger.info(`⚠️  ${existing} leave requests already exist — skipping`);
      await sequelize.close();
      process.exit(0);
    }

    // Ensure LeaveBalance exists for all active employees
    // (LeaveBalance is created on first leave application, but we pre-create here)
    const { Employee, sequelize: sq } = require('../models');
    const activeEmployees = await Employee.findAll({ where: { status: 'active' } });
    for (const emp of activeEmployees) {
      const [balance] = await LeaveBalance.findOrCreate({
        where: { employee_id: emp.id },
        defaults: {
          employee_id: emp.id,
          available: 12,
          used: 0,
          admin_granted: 0,
          lapsed: 0,
          last_accrual_month: `${currentYear}-${pad(currentMonth + 1)}`,
          consecutive_no_usage_months: 0,
        },
      });
    }

    const leaveRequestData = [
      {
        employee_id: 7,
        leave_type: 'el',
        from_date: `${currentYear}-${pad(currentMonth + 1)}-16`,
        to_date: `${currentYear}-${pad(currentMonth + 1)}-17`,
        duration: 2,
        reason: 'Personal work — family event',
        contact_during_leave: '9876543216',
        status: 'pending',
        approved_by: null,
        approved_at: null,
      },
      {
        employee_id: 8,
        leave_type: 'el',
        from_date: `${currentYear}-${pad(currentMonth + 1)}-10`,
        to_date: `${currentYear}-${pad(currentMonth + 1)}-10`,
        duration: 1,
        reason: 'Not feeling well, need rest',
        contact_during_leave: '9876543217',
        status: 'approved',
        approved_by: 3,
        approved_at: new Date(currentYear, currentMonth, 8),
      },
      {
        employee_id: 12,
        leave_type: 'el',
        from_date: `${currentYear}-${pad(currentMonth + 1)}-20`,
        to_date: `${currentYear}-${pad(currentMonth + 1)}-22`,
        duration: 3,
        reason: 'Family function — sister\'s wedding',
        contact_during_leave: '9876543221',
        status: 'pending',
        approved_by: null,
        approved_at: null,
      },
      {
        employee_id: 11,
        leave_type: 'el',
        from_date: `${currentYear}-${pad(currentMonth + 1)}-05`,
        to_date: `${currentYear}-${pad(currentMonth + 1)}-05`,
        duration: 1,
        reason: 'Doctor appointment for annual checkup',
        contact_during_leave: '9876543220',
        status: 'approved',
        approved_by: 5,
        approved_at: new Date(currentYear, currentMonth, 3),
      },
      {
        employee_id: 9,
        leave_type: 'el',
        from_date: `${currentYear}-${pad(currentMonth + 1)}-25`,
        to_date: `${currentYear}-${pad(currentMonth + 1)}-25`,
        duration: 1,
        reason: 'Urgent personal work at bank',
        contact_during_leave: '9876543218',
        status: 'rejected',
        approved_by: 3,
        approved_at: new Date(currentYear, currentMonth, 12),
        remarks: 'Team deadline this week — please reschedule',
      },
    ];

    await LeaveRequest.bulkCreate(leaveRequestData);
    logger.info(`✅ Created ${leaveRequestData.length} leave requests`);

    // Summary
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('📊 Leave Requests Summary:');
    for (const lr of leaveRequestData) {
      logger.info(`   Employee #${lr.employee_id}: ${lr.status.toUpperCase()} | ${lr.from_date} → ${lr.to_date} (${lr.duration} day${lr.duration > 1 ? 's' : ''})`);
    }
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Leave request seeding failed:', error.message);
    if (error.original) logger.error('  original:', error.original.message);
    await sequelize.close();
    process.exit(1);
  }
};

seed();