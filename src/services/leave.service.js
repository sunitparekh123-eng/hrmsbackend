const { LeaveBalance, LeaveRequest, Employee, sequelize } = require('../models');
const { AppError } = require('../middleware/error.middleware');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { LEAVE_TYPES, LEAVE_ACCRUAL, PAGINATION } = require('../utils/constants');

class LeaveService {
  /**
   * Get leave balance for an employee.
   * Ensures monthly accrual is up-to-date before returning.
   */
  async getLeaveBalance(employeeId) {
    // Ensure accrual is current
    await this._ensureAccrualUpToDate(employeeId);

    let balance = await LeaveBalance.findOne({
      where: { employee_id: employeeId },
    });

    // If no balance exists yet (new employee), create one
    if (!balance) {
      balance = await this._createInitialBalance(employeeId);
    }

    return balance;
  }

  /**
   * Apply for leave — single type (EL) only.
   */
  async applyLeave(employeeId, leaveData, isAdminOnBehalf = false) {
    const { from_date, to_date, duration, reason, contact_during_leave } = leaveData;

    // Ensure accrual is up-to-date first
    await this._ensureAccrualUpToDate(employeeId);

    const balance = await LeaveBalance.findOne({
      where: { employee_id: employeeId },
    });

    if (!balance) {
      throw new AppError('Leave balance not set up for your account', 400);
    }

    if (!isAdminOnBehalf) {
      if (parseInt(duration) !== 1) {
        throw new AppError('Employees can only apply for exactly 1 day of leave at a time.', 400);
      }
      if (from_date !== to_date) {
        throw new AppError('Start and end dates must be identical for a 1-day leave request.', 400);
      }
    }

    if (balance.available < duration) {
      throw new AppError(
        `Insufficient leave balance. Available: ${balance.available} day(s), Requested: ${duration} day(s)`,
        400,
      );
    }

    // 1-per-month limit only applies to self-applications, NOT when admin/HR applies on behalf
    if (!isAdminOnBehalf) {
      const fromDate = new Date(from_date);
      const monthStart = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 0).getDate();
      const monthEnd = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const existingInMonth = await LeaveRequest.findOne({
        where: {
          employee_id: employeeId,
          status: { [Op.in]: ['pending', 'approved'] },
          from_date: { [Op.lte]: monthEnd },
          to_date: { [Op.gte]: monthStart },
        },
      });

      if (existingInMonth) {
        throw new AppError('You already have a leave request in this month. Maximum 1 leave per month.', 409);
      }
    }

    // Check for overlapping leave requests
    const overlapping = await LeaveRequest.findOne({
      where: {
        employee_id: employeeId,
        status: { [Op.in]: ['pending', 'approved'] },
        from_date: { [Op.lte]: to_date },
        to_date: { [Op.gte]: from_date },
      },
    });

    if (overlapping) {
      throw new AppError('You have an overlapping leave request for this period', 409);
    }

    const leaveRequest = await LeaveRequest.create({
      employee_id: employeeId,
      leave_type: LEAVE_TYPES.EL,
      from_date,
      to_date,
      duration,
      reason,
      contact_during_leave,
      status: 'pending',
    });

    logger.info(`Employee ID ${employeeId} applied for EL leave (${duration} day(s))${isAdminOnBehalf ? ' [by admin]' : ''}`);
    return leaveRequest;
  }

  /**
   * Get leave requests for a specific employee.
   */
  async getLeaveRequests(employeeId, { page = 1, limit = PAGINATION.DEFAULT_LIMIT, status, search, from, to } = {}) {
    const offset = (page - 1) * limit;
    const whereClause = { employee_id: employeeId };
    if (status) whereClause.status = status;
    if (from && to) {
      whereClause.from_date = { [Op.gte]: from };
      whereClause.to_date = { [Op.lte]: to };
    }

    const includeClause = search ? [{
      model: Employee,
      as: 'employee',
      attributes: ['id', 'emp_code', 'name', 'department', 'designation', 'profile_image'],
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { emp_code: { [Op.like]: `%${search}%` } },
        ],
      },
    }] : [{
      model: Employee,
      as: 'employee',
      attributes: ['id', 'emp_code', 'name', 'department', 'designation', 'profile_image'],
    }];

    const { rows, count } = await LeaveRequest.findAndCountAll({
      where: whereClause,
      include: includeClause,
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Cancel a pending leave request.
   */
  async cancelLeaveRequest(requestId, employeeId) {
    const request = await LeaveRequest.findOne({
      where: { id: requestId, employee_id: employeeId },
    });

    if (!request) {
      throw new AppError('Leave request not found', 404);
    }

    if (request.status !== 'pending') {
      throw new AppError('Only pending leave requests can be cancelled', 400);
    }

    await request.update({ status: 'cancelled' });
    logger.info(`Leave request ${requestId} cancelled by employee ${employeeId}`);
    return request;
  }

  /**
   * Get all leave requests (admin/hr/manager).
   */
  async getAllLeaveRequests({ page = 1, limit = PAGINATION.DEFAULT_LIMIT, status, department, search, from, to } = {}) {
    const offset = (page - 1) * limit;
    const whereClause = {};
    if (status) whereClause.status = status;
    if (from && to) {
      whereClause.from_date = { [Op.gte]: from };
      whereClause.to_date = { [Op.lte]: to };
    }

    let employeeWhere = {};
    if (department) employeeWhere.department = department;
    if (search) {
      employeeWhere[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { emp_code: { [Op.like]: `%${search}%` } },
      ];
    }

    const { rows, count } = await LeaveRequest.findAndCountAll({
      where: whereClause,
      include: [{
        model: Employee,
        as: 'employee',
        where: Object.keys(employeeWhere).length > 0 ? employeeWhere : undefined,
        attributes: ['id', 'emp_code', 'name', 'department', 'designation', 'profile_image'],
      }],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Approve or reject a leave request.
   * On approval: deducts from balance and resets no-usage counter.
   */
  async approveLeaveRequest(requestId, action, remarks, approvedBy) {
    const request = await LeaveRequest.findByPk(requestId);
    if (!request) {
      throw new AppError('Leave request not found', 404);
    }

    if (request.status !== 'pending') {
      throw new AppError('Leave request is not in pending status', 400);
    }

    if (action !== 'approved' && action !== 'rejected') {
      throw new AppError('Action must be either "approved" or "rejected"', 400);
    }

    await request.update({
      status: action,
      approved_by: approvedBy,
      approved_at: new Date(),
      remarks: remarks || '',
    });

    // If approved, deduct from leave balance and reset no-usage streak
    if (action === 'approved') {
      const balance = await LeaveBalance.findOne({
        where: { employee_id: request.employee_id },
      });

      if (balance) {
        await balance.update({
          available: Math.max(0, balance.available - request.duration),
          used: balance.used + request.duration,
          consecutive_no_usage_months: 0, // usage resets the streak
        });
      }
    }

    logger.info(`Leave request ${requestId} ${action} by ${approvedBy}`);
    return request;
  }

  /**
   * Get team leaves for a manager (same department).
   */
  async getTeamLeaves(managerId, month, year) {
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;

    const manager = await Employee.findByPk(managerId);
    if (!manager) throw new AppError('Manager not found', 404);

    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`;

    const leaveRequests = await LeaveRequest.findAll({
      where: {
        status: 'approved',
        from_date: { [Op.lte]: endDate },
        to_date: { [Op.gte]: startDate },
      },
      include: [{
        model: Employee,
        as: 'employee',
        where: { department: manager.department, status: 'active' },
        attributes: ['id', 'emp_code', 'name', 'designation', 'profile_image'],
      }],
      order: [['from_date', 'ASC']],
    });

    return leaveRequests;
  }

  /**
   * Admin grants extra leaves to an employee.
   * These extra leaves never lapse.
   */
  async grantExtraLeaves(adminId, employeeId, count, reason) {
    if (!count || count < 1) {
      throw new AppError('Grant count must be at least 1', 400);
    }

    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    // Ensure accrual is up-to-date
    await this._ensureAccrualUpToDate(employeeId);

    let balance = await LeaveBalance.findOne({
      where: { employee_id: employeeId },
    });

    if (!balance) {
      balance = await this._createInitialBalance(employeeId);
    }

    await balance.update({
      admin_granted: balance.admin_granted + count,
      available: balance.available + count,
    });

    logger.info(`Admin ${adminId} granted ${count} extra leave(s) to employee ${employeeId}. Reason: ${reason}`);
    return balance;
  }

  // ──────────────────────────────────────────────
  // PRIVATE: Accrual Engine
  // ──────────────────────────────────────────────

  /**
   * Ensure monthly leave accrual is up-to-date for the given employee.
   * Runs month-by-month from last_accrual_month to current month.
   *
   * Rules:
   * - +1 EL earned per month
   * - If no leave used for 2 consecutive months → all accrued leaves lapse (available = admin_granted)
   * - Admin-granted leaves never lapse
   */
  async _ensureAccrualUpToDate(employeeId) {
    const balance = await LeaveBalance.findOne({
      where: { employee_id: employeeId },
    });

    if (!balance) return; // Will be created by _createInitialBalance

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // No accrual needed if already processed this month
    if (balance.last_accrual_month === currentMonth) return;

    // Determine starting month
    let startMonth = balance.last_accrual_month;
    if (!startMonth) {
      // First time: start from the month after joining
      const employee = await Employee.findByPk(employeeId, { attributes: ['date_of_joining'] });
      if (employee && employee.date_of_joining) {
        const doj = new Date(employee.date_of_joining);
        startMonth = `${doj.getFullYear()}-${String(doj.getMonth() + 1).padStart(2, '0')}`;
      } else {
        startMonth = currentMonth;
      }
    }

    const months = this._getMonthRange(startMonth, currentMonth);

    let available = balance.available;
    let lapsed = balance.lapsed;
    let consecutive = balance.consecutive_no_usage_months;

    for (const month of months) {
      // Check if employee used any leave in the PREVIOUS calendar month
      const prevMonth = this._previousMonth(month);
      const hadUsage = await this._hadUsageInMonth(employeeId, prevMonth);

      if (hadUsage) {
        consecutive = 0; // Usage resets the streak
      } else {
        consecutive += 1;
      }

      // If 2+ consecutive months without usage, all accrued leaves lapse
      if (consecutive >= LEAVE_ACCRUAL.MAX_CARRY_FORWARD_MONTHS) {
        const accruedLeaves = available - balance.admin_granted;
        if (accruedLeaves > 0) {
          lapsed += accruedLeaves;
          available = balance.admin_granted;
        }
        consecutive = 0; // Reset after lapse
      }

      // Add monthly accrual (+1 EL)
      available += LEAVE_ACCRUAL.MONTHLY_ACCRUAL;
    }

    // Persist updates
    await balance.update({
      available,
      lapsed,
      last_accrual_month: currentMonth,
      consecutive_no_usage_months: consecutive,
    });

    logger.debug(
      `Accrual updated for employee ${employeeId}: ` +
      `available=${available}, lapsed=${lapsed}, consecutive=${consecutive}, ` +
      `processed ${months.length} month(s)`,
    );
  }

  /**
   * Create the initial leave balance for a new employee.
   * Starts with 1 EL (the current month's accrual).
   */
  async _createInitialBalance(employeeId) {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const balance = await LeaveBalance.create({
      employee_id: employeeId,
      available: LEAVE_ACCRUAL.MONTHLY_ACCRUAL,
      used: 0,
      admin_granted: 0,
      lapsed: 0,
      last_accrual_month: currentMonth,
      consecutive_no_usage_months: 0,
    });

    logger.info(`Created initial leave balance for employee ${employeeId}`);
    return balance;
  }

  /**
   * Generate an array of YYYY-MM strings from start (exclusive) to end (inclusive).
   */
  _getMonthRange(startMonth, endMonth) {
    const months = [];
    const [sy, sm] = startMonth.split('-').map(Number);
    const [ey, em] = endMonth.split('-').map(Number);

    let y = sy;
    let m = sm + 1; // Start from the NEXT month after startMonth
    if (m > 12) {
      m = 1;
      y += 1;
    }

    while (y < ey || (y === ey && m <= em)) {
      months.push(`${y}-${String(m).padStart(2, '0')}`);
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }

    return months;
  }

  /**
   * Get distinct list of departments from employees.
   */
  async getDepartments() {
    const departments = await Employee.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('department')), 'department']],
      where: { department: { [Op.ne]: null } },
      order: [[sequelize.col('department'), 'ASC']],
      raw: true,
    });
    return departments.map((d) => d.department);
  }

  /**
   * Get the previous month as YYYY-MM.
   */
  _previousMonth(month) {
    const [y, m] = month.split('-').map(Number);
    if (m === 1) {
      return `${y - 1}-12`;
    }
    return `${y}-${String(m - 1).padStart(2, '0')}`;
  }

  /**
   * Check if the employee used any leave (approved request) in a given month.
   */
  async _hadUsageInMonth(employeeId, month) {
    const [y, m] = month.split('-').map(Number);
    const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
    // Last day of month
    const lastDay = new Date(y, m, 0).getDate();
    const monthEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const usage = await LeaveRequest.findOne({
      where: {
        employee_id: employeeId,
        status: 'approved',
        from_date: { [Op.lte]: monthEnd },
        to_date: { [Op.gte]: monthStart },
      },
    });

    return !!usage;
  }
}

module.exports = new LeaveService();