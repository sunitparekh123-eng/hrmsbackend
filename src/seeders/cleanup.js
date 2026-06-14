/**
 * Cleanup script — deletes ALL seeded employees and their dependent records.
 * Run: node src/seeders/cleanup.js
 * 
 * Only deletes employees with emp_code starting with "EMP" (seeded data).
 * Preserves manually onboarded employees (numeric emp_code from /auth/register).
 */
require('dotenv').config();

async function cleanup() {
  const { sequelize } = require('../config/database');
  const {
    Employee, AttendanceRecord, MonthlyAttendance, LeaveBalance, LeaveRequest,
    Payslip, SalaryComponent, Loan, LoanPayment, PayrollCycle, PayrollEntry,
    PerformanceObjective, PerformanceReview, Document, Letter, Notification,
    SalaryStructure, SalaryRevision
  } = require('../models');

  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // Find all seeded employees (emp_code starts with "EMP")
    const seededEmployees = await Employee.findAll({
      where: { emp_code: { [require('sequelize').Op.like]: 'EMP%' } }
    });

    if (seededEmployees.length === 0) {
      console.log('⚠️  No seeded employees found. Nothing to delete.');
      process.exit(0);
    }

    const ids = seededEmployees.map(e => e.id);
    console.log(`🔍 Found ${ids.length} seeded employees to delete...`);

    // Delete dependent records in order (respecting FK constraints)
    console.log('   → Deleting SalaryComponents...');
    await SalaryComponent.destroy({ where: { payslip_id: await getPayslipIds(ids) }, force: true });

    console.log('   → Deleting Payslips...');
    await Payslip.destroy({ where: { employee_id: ids }, force: true });

    console.log('   → Deleting LoanPayments...');
    const loanIds = (await Loan.findAll({ where: { employee_id: ids }, attributes: ['id'] })).map(l => l.id);
    if (loanIds.length > 0) {
      await LoanPayment.destroy({ where: { loan_id: loanIds }, force: true });
    }

    console.log('   → Deleting Loans...');
    await Loan.destroy({ where: { employee_id: ids }, force: true });

    console.log('   → Deleting AttendanceRecords...');
    await AttendanceRecord.destroy({ where: { employee_id: ids }, force: true });

    console.log('   → Deleting MonthlyAttendances...');
    await MonthlyAttendance.destroy({ where: { employee_id: ids }, force: true });

    console.log('   → Deleting LeaveBalances...');
    await LeaveBalance.destroy({ where: { employee_id: ids }, force: true });

    console.log('   → Deleting LeaveRequests...');
    await LeaveRequest.destroy({ where: { employee_id: ids }, force: true });

    console.log('   → Deleting PerformanceObjectives...');
    await PerformanceObjective.destroy({ where: { employee_id: ids }, force: true });

    console.log('   → Deleting PerformanceReviews...');
    await PerformanceReview.destroy({ where: { employee_id: ids }, force: true });

    console.log('   → Deleting Documents...');
    await Document.destroy({ where: { employee_id: ids }, force: true });

    console.log('   → Deleting Letters...');
    await Letter.destroy({ where: { employee_id: ids }, force: true });

    console.log('   → Deleting Notifications...');
    await Notification.destroy({ where: { employee_id: ids }, force: true });

    console.log('   → Deleting SalaryRevisions...');
    await SalaryRevision.destroy({ where: { employee_id: ids }, force: true });

    console.log('   → Deleting SalaryStructures...');
    await SalaryStructure.destroy({ where: { employee_id: ids }, force: true });

    console.log('   → Deleting PayrollEntries...');
    await PayrollEntry.destroy({ where: { employee_id: ids }, force: true });

    console.log('   → Deleting Employees...');
    const deleted = await Employee.destroy({ where: { id: ids }, force: true });

    console.log(`\n✅ Deleted ${deleted} employees and all dependent records.`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Cleanup failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

async function getPayslipIds(employeeIds) {
  const { Payslip } = require('../models');
  const slips = await Payslip.findAll({ where: { employee_id: employeeIds }, attributes: ['id'] });
  return slips.map(s => s.id);
}

cleanup();