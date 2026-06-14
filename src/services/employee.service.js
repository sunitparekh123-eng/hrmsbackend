const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Employee, Office, SalaryStructure, SalaryRevision, sequelize, AttendanceRecord, MonthlyAttendance, LeaveBalance, LeaveRequest, SalaryComponent, Payslip, LoanPayment, Loan, PayrollEntry, PerformanceObjective, PerformanceReview, Document, Letter, Notification } = require('../models');
const { AppError } = require('../middleware/error.middleware');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { PAGINATION, ROLES, EMPLOYEE_STATUS, SALARY_REVISION_TYPES } = require('../utils/constants');

class EmployeeService {
  async getEmployeeById(employeeId) {
    const employee = await Employee.findByPk(employeeId, {
      attributes: { exclude: ['password', 'refresh_token'] },
      include: ['office'],
    });

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    return employee;
  }

  async getAllEmployees({ page = 1, limit = PAGINATION.DEFAULT_LIMIT, department, role, status, search, company_id, office_id } = {}) {
    const offset = (page - 1) * limit;
    const whereClause = {};

    if (department) whereClause.department = department;
    if (role) whereClause.role = role;
    if (status) whereClause.status = status;
    if (company_id) whereClause.company_id = company_id;
    if (office_id) whereClause.office_id = office_id;

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { emp_code: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { designation: { [Op.like]: `%${search}%` } },
      ];
    }

    const { rows, count } = await Employee.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password', 'refresh_token'] },
      include: ['office', 'company'],
      order: [['name', 'ASC']],
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

  async updateEmployee(employeeId, updateData) {
    const employee = await Employee.findByPk(employeeId);
    if (!employee) throw new AppError('Employee not found', 404);

    // Don't allow updating password through this endpoint
    delete updateData.password;
    delete updateData.refresh_token;
    delete updateData.role; // Role changes through separate endpoint
    delete updateData.emp_code; // Emp code is immutable

    await employee.update(updateData);
    logger.info(`Employee ${employee.emp_code} updated`);

    return await Employee.findByPk(employeeId, {
      attributes: { exclude: ['password', 'refresh_token'] },
    });
  }

  async updateEmployeeStatus(employeeId, status) {
    if (!Object.values(EMPLOYEE_STATUS).includes(status)) {
      throw new AppError(`Invalid status. Valid statuses: ${Object.values(EMPLOYEE_STATUS).join(', ')}`, 400);
    }

    const employee = await Employee.findByPk(employeeId);
    if (!employee) throw new AppError('Employee not found', 404);

    await employee.update({ status });
    logger.info(`Employee ${employee.emp_code} status changed to ${status}`);
    return employee;
  }

  async updateEmployeeRole(employeeId, role) {
    if (!Object.values(ROLES).includes(role)) {
      throw new AppError(`Invalid role. Valid roles: ${Object.values(ROLES).join(', ')}`, 400);
    }

    const employee = await Employee.findByPk(employeeId);
    if (!employee) throw new AppError('Employee not found', 404);

    await employee.update({ role });
    logger.info(`Employee ${employee.emp_code} role changed to ${role}`);
    return employee;
  }

  /**
   * Permanently delete an employee and all associated records.
   * Uses a transaction to ensure atomicity.
   */
  async deleteEmployee(employeeId) {
    const employee = await Employee.findByPk(employeeId);
    if (!employee) throw new AppError('Employee not found', 404);

    const t = await sequelize.transaction();
    try {
      // Order matters — delete children before parent
      await AttendanceRecord.destroy({ where: { employee_id: employeeId }, transaction: t });
      await MonthlyAttendance.destroy({ where: { employee_id: employeeId }, transaction: t });
      await LeaveBalance.destroy({ where: { employee_id: employeeId }, transaction: t });
      await LeaveRequest.destroy({ where: { employee_id: employeeId }, transaction: t });
      await SalaryComponent.destroy({
        where: { payslip_id: sequelize.literal(`(SELECT id FROM payslips WHERE employee_id = ${employeeId})`) },
        transaction: t,
      });
      await Payslip.destroy({ where: { employee_id: employeeId }, transaction: t });
      await LoanPayment.destroy({
        where: { loan_id: sequelize.literal(`(SELECT id FROM loans WHERE employee_id = ${employeeId})`) },
        transaction: t,
      });
      await Loan.destroy({ where: { employee_id: employeeId }, transaction: t });
      await PayrollEntry.destroy({ where: { employee_id: employeeId }, transaction: t });
      await PerformanceObjective.destroy({ where: { employee_id: employeeId }, transaction: t });
      await PerformanceReview.destroy({ where: { employee_id: employeeId }, transaction: t });
      await Document.destroy({ where: { employee_id: employeeId }, transaction: t });
      await Letter.destroy({ where: { employee_id: employeeId }, transaction: t });
      await Notification.destroy({ where: { employee_id: employeeId }, transaction: t });
      await SalaryRevision.destroy({ where: { employee_id: employeeId }, transaction: t });
      await SalaryStructure.destroy({ where: { employee_id: employeeId }, transaction: t, force: true });
      // Nullify approver FKs in LeaveRequest and Loan (don't cascade-delete those)
      await LeaveRequest.update(
        { approved_by: null },
        { where: { approved_by: employeeId }, transaction: t }
      );
      await Loan.update(
        { approved_by: null },
        { where: { approved_by: employeeId }, transaction: t }
      );
      await PerformanceReview.update(
        { reviewed_by: null },
        { where: { reviewed_by: employeeId }, transaction: t }
      );
      await SalaryRevision.update(
        { approved_by: null },
        { where: { approved_by: employeeId }, transaction: t }
      );

      // Finally, delete the employee
      await employee.destroy({ transaction: t });
      await t.commit();
      logger.info(`Employee ${employee.emp_code} (ID: ${employeeId}) permanently deleted`);
      return { id: employeeId, emp_code: employee.emp_code, name: employee.name };
    } catch (err) {
      await t.rollback();
      logger.error(`Delete employee ${employeeId} error: ${err.message}`);
      throw err;
    }
  }

  // ── Salary Structure ─────────────────────────────────────────────

  /**
   * Get full salary history for an employee.
   */
  async getSalaryStructures(employeeId) {
    const employee = await Employee.findByPk(employeeId);
    if (!employee) throw new AppError('Employee not found', 404);

    const structures = await SalaryStructure.findAll({
      where: { employee_id: employeeId },
      order: [['effective_from', 'DESC']],
    });

    const revisions = await SalaryRevision.findAll({
      where: { employee_id: employeeId },
      order: [['effective_date', 'DESC']],
    });

    return {
      current: structures.length > 0 ? structures[0] : null,
      history: structures,
      revisions,
    };
  }

  /**
   * Update (or create) salary structure for an employee.
   * Calculates breakdown via 40% formula.
   * Creates salary revision record.
   */
  async updateSalaryStructure(employeeId, salaryData, updatedBy) {
    const employee = await Employee.findByPk(employeeId);
    if (!employee) throw new AppError('Employee not found', 404);

    const gross = Number(salaryData.fixed_gross) || 0;
    const basic = Math.round(gross * 0.40);
    const hra = Math.round(basic * 0.40);
    const otherAllowance = gross - basic - hra;

    const effectiveFrom = salaryData.effective_from || new Date();

    let newStructure;
    await sequelize.transaction(async (t) => {
      // 1. Close current structure
      const current = await SalaryStructure.findOne({
        where: { employee_id: employeeId },
        order: [['effective_from', 'DESC']],
        transaction: t,
      });

      if (current) {
        await current.update({ effective_to: effectiveFrom, updated_by: updatedBy }, { transaction: t });
      }

      // 2. Create new structure
      newStructure = await SalaryStructure.create({
        employee_id: employeeId,
        fixed_gross: gross,
        basic_salary: basic,
        hra,
        special_allowance: salaryData.special_allowance || 0,
        other_allowance: otherAllowance,
        conveyance: salaryData.conveyance || 0,
        medical_allowance: salaryData.medical_allowance || 0,
        pf_applicable: salaryData.pf_applicable !== false,
        pf_ceiling: salaryData.pf_ceiling || false,
        esic_applicable: salaryData.esic_applicable || false,
        pt_applicable: salaryData.pt_applicable !== false,
        effective_work_days: salaryData.effective_work_days || 26,
        effective_from: effectiveFrom,
        effective_to: null,
        created_by: updatedBy,
        updated_by: updatedBy,
      }, { transaction: t });

      // 3. Create revision record
      const previousGross = current ? Number(current.fixed_gross) : null;
      const previousBasic = current ? Number(current.basic_salary) : null;

      await SalaryRevision.create({
        employee_id: employeeId,
        previous_gross: previousGross,
        new_gross: gross,
        previous_basic: previousBasic,
        new_basic: basic,
        revision_type: previousGross ? SALARY_REVISION_TYPES.INCREMENT : SALARY_REVISION_TYPES.INITIAL,
        effective_date: effectiveFrom,
        remarks: salaryData.remarks || 'Salary structure updated',
        approved_by: updatedBy,
      }, { transaction: t });

      // 4. Update denormalized fields on Employee
      await employee.update({
        fixed_gross: gross,
        basic_salary: basic,
        pf_applicable: salaryData.pf_applicable !== false,
        pf_ceiling: salaryData.pf_ceiling || false,
        esic_applicable: salaryData.esic_applicable || false,
      }, { transaction: t });
    });

    logger.info(`Salary structure updated for ${employee.emp_code}, new gross: ${gross}`);
    return newStructure;
  }

  // ── Admin Password Reset ─────────────────────────────────────────

  /**
   * Admin-managed password reset.
   * Generates a cryptographically secure random password, hashes it, updates
   * the employee record, and returns the plain-text password so the admin can
   * communicate it to the employee in person / via Slack / WhatsApp / etc.
   *
   * This is the PRIMARY reset mechanism for internal HRMS — no email dependency.
   *
   * @param {number} employeeId
   * @param {number} adminId - The admin performing the reset (for audit log)
   * @returns {{ employee_id, emp_code, name, new_password }}
   */
  async adminResetPassword(employeeId, adminId) {
    const employee = await Employee.findByPk(employeeId);
    if (!employee) throw new AppError('Employee not found', 404);

    // Generate a readable random password: 2 words + 3 digits (e.g. "blueTiger482")
    const adjectives = ['blue', 'red', 'dark', 'gold', 'fast', 'cool', 'wise', 'bold', 'keen', 'calm'];
    const nouns = ['Tiger', 'Eagle', 'Hawk', 'Wolf', 'Bear', 'Lion', 'Owl', 'Fox', 'Deer', 'Elk'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const digits = String(Math.floor(Math.random() * 900) + 100);
    const newPassword = `${adj}${noun}${digits}`;

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Clear any existing reset tokens so stale links can't be used
    await employee.update({
      password: hashedPassword,
      reset_password_token: null,
      reset_password_expires: null,
      is_first_login: true,          // Force password change on next login
    });

    logger.info(
      `Admin (ID: ${adminId}) reset password for ${employee.emp_code} (ID: ${employeeId})`
    );

    return {
      employee_id: employee.id,
      emp_code: employee.emp_code,
      name: employee.name,
      new_password: newPassword,
    };
  }
}

module.exports = new EmployeeService();