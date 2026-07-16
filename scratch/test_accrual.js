require('dotenv').config();
const { Employee, LeaveBalance, LeaveRequest } = require('../src/models');
const leaveService = require('../src/services/leave.service');

async function test() {
  try {
    const emp = await Employee.findOne({ where: { emp_code: 'AL004' } });
    if (!emp) {
      console.log('Employee not found');
      return;
    }

    // Fetch the balance directly to see what happens
    console.log('Before getLeaveBalance:');
    let bal = await LeaveBalance.findOne({ where: { employee_id: emp.id } });
    console.log(bal ? bal.toJSON() : 'None');

    // Let's manually run the accrual simulation
    console.log('\nAccrual Simulation:');
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    console.log('currentMonth:', currentMonth);
    console.log('bal.last_accrual_month:', bal.last_accrual_month);

    let startMonth = bal.last_accrual_month;
    if (!startMonth) {
      if (emp.date_of_joining) {
        const doj = new Date(emp.date_of_joining);
        startMonth = `${doj.getFullYear()}-${String(doj.getMonth() + 1).padStart(2, '0')}`;
      } else {
        startMonth = currentMonth;
      }
    }
    console.log('startMonth determined:', startMonth);

    const months = leaveService._getMonthRange(startMonth, currentMonth);
    console.log('Months range calculated:', months);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
