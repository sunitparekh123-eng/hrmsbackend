const { Employee, AttendanceRecord, MonthlyAttendance, LeaveBalance, LeaveRequest, Payslip, SalaryStructure, Loan, Notification, sequelize } = require('../models');
const { Op } = require('sequelize');
const { PT_SLABS } = require('../utils/constants');
const { getWeekendDays, getHolidaysInMonth, countWorkingDaysInMonth, countElapsedWorkingDays } = require('../utils/payrollHelper');

const TIMEZONE = process.env.TIMEZONE || 'Asia/Kolkata';

function getLocalDateString(date = new Date(), timeZone = TIMEZONE) {
  const local = new Date(date.toLocaleString('en-US', { timeZone }));
  const yyyy = local.getFullYear();
  const mm = String(local.getMonth() + 1).padStart(2, '0');
  const dd = String(local.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ── Live salary calculation helpers (mirrors payroll.service.js logic) ──

function calcBreakdown(fixedGross, workingDays = 26, absentDays = 0, elapsedDays = null) {
  const D = workingDays || 26;
  const effectiveDays = elapsedDays != null ? Math.min(elapsedDays, D) : D;
  const payableDays = Math.max(0, effectiveDays - (absentDays || 0));

  const fixedBasic = Math.round(fixedGross * 0.40);
  const fixedHra = Math.round(fixedBasic * 0.40);
  const fixedOther = fixedGross - fixedBasic - fixedHra;

  const basic = Math.round((fixedBasic / D) * payableDays);
  const hra = Math.round((fixedHra / D) * payableDays);
  const other = Math.round((fixedOther / D) * payableDays);

  return { basic, hra, other, payableDays, effectiveDays };
}

// calcElapsedDays removed as countElapsedWorkingDays now handles Dates natively

function calcPT(gross) {
  for (const slab of PT_SLABS) {
    if (gross >= slab.from && gross <= slab.to) return slab.amount;
  }
  return 0;
}

/**
 * Compute the current month's payslip live from employee config + attendance.
 * This is the source of truth for the dashboard — always reflects today's date.
 */
async function computeLivePayslip(employeeId, currentMonth, currentYear, monthlyAttendance) {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  // Fetch employee
  const emp = await Employee.findByPk(employeeId);
  if (!emp) return null;

  // Fetch latest salary structure
  const str = await SalaryStructure.findOne({
    where: { employee_id: employeeId },
    order: [['effective_from', 'DESC']],
  });

  const fixedGross = Number(str?.fixed_gross || emp.fixed_gross) || 0;
  const pfApplicable = str ? str.pf_applicable : (emp.pf_applicable || false);
  const pfCeiling = str ? str.pf_ceiling : (emp.pf_ceiling || false);
  const esicApplicable = str ? str.esic_applicable : (emp.esic_applicable || false);
  const pfContributionMode = str?.pf_contribution_mode || emp.pf_contribution_mode || 'shared';
  const esicContributionMode = str?.esic_contribution_mode || emp.esic_contribution_mode || 'shared';
  const pfEmployeeRate = Number(str?.pf_employee_rate ?? 0.12);
  const pfEmployerRate = Number(str?.pf_employer_rate ?? 0.12);
  const esicEmployeeRate = Number(str?.esic_employee_rate ?? 0.0075);
  const esicEmployerRate = Number(str?.esic_employer_rate ?? 0.0325);

  // ── Dynamic working days from weekend policy + holidays ──
  const weekendDays = await getWeekendDays();
  const holidays = await getHolidaysInMonth(currentMonth, currentYear);
  const workingDays = countWorkingDaysInMonth(currentYear, currentMonth, weekendDays, holidays);

  const conveyance = Number(str?.conveyance) || 0;
  const medicalAllowance = Number(str?.medical_allowance) || 0;

  // Absent days from MonthlyAttendance (source of truth)
  const absentDays = monthlyAttendance
    ? (Number(monthlyAttendance.absent_days) + Number(monthlyAttendance.half_days) * 0.5)
    : 0;

  // Pro-rate to today, respecting the employee's joining date
  const today = new Date();
  
  // Convert calendar-based elapsed days to working-day-based elapsed days
  const elapsedDays = countElapsedWorkingDays(currentYear, currentMonth, today, emp.date_of_joining, weekendDays, holidays);

  // Employee hasn't joined yet — return a zero payslip
  if (elapsedDays === 0) {
    const monthNames2 = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return {
      id: null,
      employee_id: employeeId,
      month: monthNames2[currentMonth - 1],
      month_index: currentMonth - 1,
      year: currentYear,
      basic_salary: 0, hra: 0, other_allowance: 0, conveyance: 0,
      medical_allowance: 0, special_allowance: 0, gross_salary: 0,
      pf_employee: 0, pf_employer: 0, esi_employee: 0, esi_employer: 0,
      professional_tax: 0, total_deductions: 0, net_salary: 0,
      working_days: 0, paid_days: 0, lop_days: 0, ctc: 0,
      status: 'pending',
      is_live: true,
      not_joined_yet: true,
    };
  }

  const bd = calcBreakdown(fixedGross, workingDays, absentDays, elapsedDays);
  const proratedGross = bd.basic + bd.hra + bd.other;
  const totalEarnings = proratedGross + conveyance + medicalAllowance;
  const pfBase = pfCeiling ? Math.min(bd.basic, 15000) : bd.basic;

  // PF
  let pfEmployee = 0, pfEmployer = 0;
  if (pfApplicable) {
    switch (pfContributionMode) {
      case 'employee_only': pfEmployee = Math.round(pfBase * pfEmployeeRate); break;
      case 'employer_only': pfEmployer = Math.round(pfBase * pfEmployerRate); break;
      case 'shared':
        pfEmployee = Math.round(pfBase * pfEmployeeRate);
        pfEmployer = Math.round(pfBase * pfEmployerRate);
        break;
      default: break;
    }
  }

  // ESIC
  let esiEmployee = 0, esiEmployer = 0;
  if (esicApplicable && esicContributionMode === 'shared') {
    esiEmployee = Math.ceil(totalEarnings * esicEmployeeRate);
    esiEmployer = Math.ceil(totalEarnings * esicEmployerRate);
  }

  const professionalTax = calcPT(proratedGross);
  const totalDeductions = pfEmployee + esiEmployee + professionalTax;
  const netSalary = totalEarnings - totalDeductions;
  const ctc = totalEarnings + pfEmployer + esiEmployer;

  return {
    id: null, // live calculation — not stored
    employee_id: employeeId,
    month: monthNames[currentMonth - 1],
    month_index: currentMonth - 1,
    year: currentYear,
    basic_salary: bd.basic,
    hra: bd.hra,
    other_allowance: bd.other,
    conveyance,
    medical_allowance: medicalAllowance,
    special_allowance: 0,
    gross_salary: totalEarnings,
    pf_employee: pfEmployee,
    pf_employer: pfEmployer,
    esi_employee: esiEmployee,
    esi_employer: esiEmployer,
    professional_tax: professionalTax,
    total_deductions: totalDeductions,
    net_salary: netSalary,
    working_days: elapsedDays,       // days elapsed since joining (or month start)
    paid_days: bd.payableDays,
    lop_days: absentDays,
    ctc,
    status: 'processed',
    is_live: true,                   // flag: this is computed, not stored
  };
}

class DashboardService {
  async getEmployeeSummary(employeeId) {
    const today = new Date();
    const dateStr = getLocalDateString(today);
    const [year, month] = dateStr.split('-').map(Number);
    const currentMonth = month;
    const currentYear = year;

    // Today's attendance
    const todayAttendance = await AttendanceRecord.findOne({
      where: { employee_id: employeeId, date: dateStr },
    });

    // Leave balances
    const leaveBalances = await LeaveBalance.findAll({
      where: { employee_id: employeeId },
    });

    // Current month attendance summary
    const monthlyAttendance = await MonthlyAttendance.findOne({
      where: { employee_id: employeeId, month: currentMonth, year: currentYear },
    });

    // Attendance trend — all months of current year (for bar chart)
    const attendanceTrend = await MonthlyAttendance.findAll({
      where: { employee_id: employeeId, year: currentYear },
      order: [['month', 'ASC']],
      attributes: ['month', 'year', 'present_days', 'absent_days', 'late_days', 'half_days', 'attendance_percentage'],
    });

    // Daily attendance records for current month (for calendar + log)
    const lastDay = new Date(currentYear, currentMonth, 0).getDate();
    const dailyAttendance = await AttendanceRecord.findAll({
      where: {
        employee_id: employeeId,
        date: {
          [Op.between]: [
            `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`,
            `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
          ],
        },
      },
      order: [['date', 'ASC']],
    });

    // Pending leave requests
    const pendingLeaves = await LeaveRequest.count({
      where: { employee_id: employeeId, status: 'pending' },
    });

    // Unread notifications
    const unreadNotifications = await Notification.count({
      where: { employee_id: employeeId, is_read: false },
    });

    // ── Live payslip for current month (always fresh — reflects today's date) ──
    const latestPayslip = await computeLivePayslip(
      employeeId, currentMonth, currentYear, monthlyAttendance,
    );

    // Active loans with details
    const activeLoans = await Loan.findAll({
      where: { employee_id: employeeId, status: 'active' },
      attributes: ['id', 'type', 'principal_amount', 'emi_amount', 'total_remaining', 'paid_percentage', 'tenure_months', 'disbursed_on'],
    });

    const totalLoanRemaining = activeLoans.reduce((sum, l) => sum + parseFloat(l.total_remaining || 0), 0);

    return {
      today_attendance: todayAttendance,
      leave_balances: leaveBalances,
      monthly_attendance: monthlyAttendance,
      daily_attendance: dailyAttendance,
      attendance_trend: attendanceTrend,
      pending_leaves: pendingLeaves,
      unread_notifications: unreadNotifications,
      latest_payslip: latestPayslip,
      active_loans_count: activeLoans.length,
      active_loan_details: activeLoans,
      total_loan_remaining: totalLoanRemaining,
    };
  }

  async getEmployeeStats(employeeId) {
    const currentYear = new Date().getFullYear();

    // Attendance percentage for current year
    const monthlyRecords = await MonthlyAttendance.findAll({
      where: { employee_id: employeeId, year: currentYear },
    });

    const avgAttendance = monthlyRecords.length > 0
      ? Math.round(monthlyRecords.reduce((sum, m) => sum + m.attendance_percentage, 0) / monthlyRecords.length)
      : 0;

    // Leave usage
    const leaveBalances = await LeaveBalance.findAll({
      where: { employee_id: employeeId },
    });

    const totalLeavesUsed = leaveBalances.reduce((sum, lb) => sum + lb.used, 0);
    const totalLeavesAvailable = leaveBalances.reduce((sum, lb) => sum + lb.available, 0);

    // Active loans
    const activeLoans = await Loan.count({
      where: { employee_id: employeeId, status: 'active' },
    });

    // Total loan remaining
    const loanRecords = await Loan.findAll({
      where: { employee_id: employeeId, status: 'active' },
      attributes: ['total_remaining'],
    });
    const totalLoanRemaining = loanRecords.reduce((sum, l) => sum + parseFloat(l.total_remaining || 0), 0);

    return {
      attendance_percentage: avgAttendance,
      leaves_used: totalLeavesUsed,
      leaves_available: totalLeavesAvailable,
      active_loans: activeLoans,
      total_loan_remaining: totalLoanRemaining,
    };
  }

  async getAdminSummary() {
    const today = new Date();
    const dateStr = getLocalDateString(today);
    const [year, month] = dateStr.split('-').map(Number);
    const currentMonth = month;
    const currentYear = year;

    // Total employees by status (excluding admin)
    const totalEmployees = await Employee.count({ where: { role: { [Op.ne]: 'admin' } } });
    const activeEmployees = await Employee.count({ where: { status: 'active', role: { [Op.ne]: 'admin' } } });

    // Today's attendance
    const todayPresent = await AttendanceRecord.count({
      where: { date: dateStr, status: { [Op.in]: ['present', 'late'] } },
    });
    const todayAbsent = await AttendanceRecord.count({
      where: { date: dateStr, status: 'absent' },
    });

    // Pending leave requests
    const pendingLeaves = await LeaveRequest.count({ where: { status: 'pending' } });

    // Active loans
    const activeLoans = await Loan.count({ where: { status: 'active' } });

    // Department-wise count (excluding admin)
    const departmentStats = await Employee.findAll({
      attributes: ['department', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: { status: 'active', role: { [Op.ne]: 'admin' } },
      group: ['department'],
      raw: true,
    });

    return {
      total_employees: totalEmployees,
      active_employees: activeEmployees,
      today_present: todayPresent,
      today_absent: todayAbsent,
      pending_leaves: pendingLeaves,
      active_loans: activeLoans,
      department_stats: departmentStats,
    };
  }

  async getAdminStats() {
    const currentYear = new Date().getFullYear();

    // Monthly attendance averages
    const monthlyAttendance = await MonthlyAttendance.findAll({
      where: { year: currentYear },
      attributes: [
        'month',
        [sequelize.fn('AVG', sequelize.col('attendance_percentage')), 'avg_attendance_percentage'],
        [sequelize.fn('SUM', sequelize.col('present_days')), 'total_present_days'],
        [sequelize.fn('SUM', sequelize.col('absent_days')), 'total_absent_days'],
      ],
      group: ['month'],
      raw: true,
    });

    // Leave type distribution (filter by from_date year range since no year column)
    const leaveDistribution = await LeaveRequest.findAll({
      attributes: ['leave_type', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: {
        from_date: {
          [Op.gte]: `${currentYear}-01-01`,
          [Op.lte]: `${currentYear}-12-31`,
        },
      },
      group: ['leave_type'],
      raw: true,
    });

    // Loan type distribution
    const loanDistribution = await Loan.findAll({
      attributes: ['type', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: { status: 'active' },
      group: ['type'],
      raw: true,
    });

    return {
      monthly_attendance: monthlyAttendance,
      leave_distribution: leaveDistribution,
      loan_distribution: loanDistribution,
    };
  }
}

module.exports = new DashboardService();