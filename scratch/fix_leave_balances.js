require('dotenv').config();
const { Employee, LeaveBalance, LeaveRequest } = require('../src/models');
const leaveService = require('../src/services/leave.service');
const logger = require('../src/utils/logger');

async function fixBalances() {
  try {
    logger.info('Starting leave balance correction script...');
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const activeEmployees = await Employee.findAll({ where: { status: 'active' } });
    logger.info(`Found ${activeEmployees.length} active employees.`);

    for (const emp of activeEmployees) {
      let balance = await LeaveBalance.findOne({ where: { employee_id: emp.id } });
      
      const startDateVal = emp.date_of_joining || emp.created_at || now;
      const startD = new Date(startDateVal);
      const startMonthStr = `${startD.getFullYear()}-${String(startD.getMonth() + 1).padStart(2, '0')}`;

      if (!balance) {
        // Create initial balance starting from their join/created month
        balance = await LeaveBalance.create({
          employee_id: emp.id,
          available: 2,
          used: 0,
          admin_granted: 0,
          lapsed: 0,
          last_accrual_month: startMonthStr,
          consecutive_no_usage_months: 0,
        });
        logger.info(`Created new initial balance for ${emp.name} (Start Month: ${startMonthStr})`);
      }

      // Simulate month-by-month accrual from startMonthStr to currentMonth
      const months = leaveService._getMonthRange(balance.last_accrual_month || startMonthStr, currentMonth);
      if (months.length > 0) {
        let available = balance.available;
        let lapsed = balance.lapsed;
        let consecutive = balance.consecutive_no_usage_months;

        for (const month of months) {
          // Check usage in previous month
          const prevMonth = leaveService._previousMonth(month);
          const hadUsage = await leaveService._hadUsageInMonth(emp.id, prevMonth);

          if (hadUsage) {
            consecutive = 0;
          } else {
            consecutive += 1;
          }

          // Lapse check (MAX_CARRY_FORWARD_MONTHS is 3)
          if (consecutive >= 3) {
            const accruedLeaves = available - balance.admin_granted;
            if (accruedLeaves > 0) {
              lapsed += accruedLeaves;
              available = balance.admin_granted;
            }
            consecutive = 0;
          }

          // Accrue +2
          available += 2;
        }

        await balance.update({
          available,
          lapsed,
          last_accrual_month: currentMonth,
          consecutive_no_usage_months: consecutive,
        });
        logger.info(`Updated balance for ${emp.name}: available=${available}, lapsed=${lapsed}, last_accrual_month=${currentMonth}`);
      } else {
        // If no accrual months but available is 0, let's reset it to 2 if they recently joined
        if (balance.available === 0 && balance.used === 0 && balance.admin_granted === 0) {
          await balance.update({ available: 2 });
          logger.info(`Reset 0 balance to default 2 for new employee ${emp.name}`);
        }
      }
    }

    logger.info('Leave balance correction complete!');
    process.exit(0);
  } catch (err) {
    logger.error(`Error in correction script: ${err.message}`);
    process.exit(1);
  }
}

fixBalances();
