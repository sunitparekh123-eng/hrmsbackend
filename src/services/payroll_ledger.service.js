const { PayrollCycle, PayrollEntry, Employee, SalaryStructure, Office, sequelize } = require('../models');
const { AppError } = require('../middleware/error.middleware');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { PAGINATION, PT_SLABS } = require('../utils/constants');

/**
 * Payroll ledger service — mirrors the frontend's calculateProductionNet() logic.
 *
 * Frontend shape per row:
 *   { id, employeeCode, name, location, company, designation,
 *     fixedGross, pfApplicable, pfCeiling, esicApplicable,
 *     absentDays, bonus, previousArrears, incentive,
 *     loanDeduction, otherDeduction, status }
 *
 * Calculation (exact match with frontend):
 *   fixedBasic = round(fixedGross * 0.40)
 *   fixedHra   = round(fixedBasic * 0.40)
 *   fixedOther = fixedGross - fixedBasic - fixedHra
 *   basic  = round((fixedBasic  / DAYS) * payableDays)
 *   hra    = round((fixedHra    / DAYS) * payableDays)
 *   other  = round((fixedOther  / DAYS) * payableDays)
 *   totalEarnings = proratedGross + arrears + bonus + incentive
 *   PF = pfApplicable ? (pfCeiling ? min(basic, 15000) : basic) * 0.12 : 0
 *   ESI = esicApplicable ? ceil(totalEarnings * 0.0075) : 0
 *   PT  = slab-based
 *   net = totalEarnings - deductions
 */
class PayrollLedgerService {
  DAYS_IN_MONTH = 28;

  // ── Calculation helpers (mirror frontend calculateProductionNet) ──

  _calculateRow(row) {
    const D = this.DAYS_IN_MONTH;
    const elapsedDays = row._elapsedDays != null ? Math.min(row._elapsedDays, D) : D;
    const payableDays = Math.max(0, elapsedDays - (row.absent_days || 0));
    const fixedGross = Number(row.fixed_gross) || 0;

    const fixedBasic = Math.round(fixedGross * 0.40);
    const fixedHra = Math.round(fixedBasic * 0.40);
    const fixedOther = fixedGross - fixedBasic - fixedHra;

    const basic = Math.round((fixedBasic / D) * payableDays);
    const hra = Math.round((fixedHra / D) * payableDays);
    const other = Math.round((fixedOther / D) * payableDays);
    const proratedGross = basic + hra + other;

    const totalEarnings = proratedGross
      + (Number(row.previous_arrears) || 0)
      + (Number(row.bonus) || 0)
      + (Number(row.incentive) || 0);

    // ── Contribution modes & rates (Phase 8) ──
    const pfContributionMode = row.pf_contribution_mode || 'shared';
    const esicContributionMode = row.esic_contribution_mode || 'shared';
    const pfEmployeeRate = Number(row.pf_employee_rate ?? 0.12);
    const pfEmployerRate = Number(row.pf_employer_rate ?? 0.12);
    const esicEmployeeRate = Number(row.esic_employee_rate ?? 0.0075);
    const esicEmployerRate = Number(row.esic_employer_rate ?? 0.0325);

    // ── PF: respect contribution mode ──
    let pf = 0;
    let pfEmployer = 0;
    if (row.pf_applicable) {
      const pfBase = row.pf_ceiling ? Math.min(basic, 15000) : basic;
      switch (pfContributionMode) {
        case 'employee_only':
          pf = Math.round(pfBase * pfEmployeeRate);
          pfEmployer = 0;
          break;
        case 'employer_only':
          pf = 0;
          pfEmployer = Math.round(pfBase * pfEmployerRate);
          break;
        case 'shared':
          pf = Math.round(pfBase * pfEmployeeRate);
          pfEmployer = Math.round(pfBase * pfEmployerRate);
          break;
        case 'none':
        default:
          pf = 0;
          pfEmployer = 0;
          break;
      }
    }

    // ── ESIC: respect contribution mode ──
    let esi = 0;
    let esiEmployer = 0;
    if (row.esic_applicable) {
      switch (esicContributionMode) {
        case 'shared':
          esi = Math.ceil(totalEarnings * esicEmployeeRate);
          esiEmployer = Math.ceil(totalEarnings * esicEmployerRate);
          break;
        case 'none':
        default:
          esi = 0;
          esiEmployer = 0;
          break;
      }
    }

    // PT — lookup from constants (Maharashtra slabs)
    let pt = 0;
    for (const slab of PT_SLABS) {
      if (proratedGross >= slab.from && proratedGross <= slab.to) {
        pt = slab.amount;
        break;
      }
    }

    const grossDeductions = pf + esi + pt
      + (Number(row.loan_deduction) || 0)
      + (Number(row.other_deduction) || 0);
    const net = totalEarnings - grossDeductions;

    const totalMonthlyCTC = totalEarnings + pfEmployer + esiEmployer;

    return {
      basic, hra, other, proratedGross, totalEarnings,
      pf, esi, pt, grossDeductions, net,
      pfEmployer, esiEmployer, totalMonthlyCTC,
    };
  }

  // ── API: GET /payroll/ledger — current-cycle ledger rows ──

  async getCurrentLedger() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let cycle = await PayrollCycle.findOne({
      where: { month_index: currentMonth, year: currentYear },
      include: [{
        model: PayrollEntry,
        as: 'entries',
        include: [{ model: Employee, as: 'employee', include: [{ model: Office, as: 'office' }] }],
      }],
    });

    if (!cycle) {
      // Auto-create the cycle if it doesn't exist
      cycle = await this._createCycleForMonth(currentMonth, currentYear);
      if (!cycle) {
        return { cycle: null, rows: [] };
      }
      // Re-fetch with entries
      cycle = await PayrollCycle.findOne({
        where: { month_index: currentMonth, year: currentYear },
        include: [{
          model: PayrollEntry,
          as: 'entries',
          include: [{ model: Employee, as: 'employee', include: [{ model: Office, as: 'office' }] }],
        }],
      });
    }

    // Sync absent days from MonthlyAttendance (source of truth) + add elapsed-day pro-rating
    const { MonthlyAttendance } = require('../models');
    const monthlyStats = await MonthlyAttendance.findAll({
      where: { month: currentMonth + 1, year: currentYear },
    });
    const monthlyMap = new Map(monthlyStats.map(m => [m.employee_id, m]));

    // For the current (ongoing) month, prorate salary to today's date
    const elapsedDays = now.getDate();

    const rows = (cycle.entries || []).map(entry => {
      const emp = entry.employee;
      const monthly = monthlyMap.get(emp.id);
      const absentDays = monthly
        ? (Number(monthly.absent_days) + Number(monthly.half_days) * 0.5)
        : (entry.absent_days || 0);

      const calculation = this._calculateRow({
        ...emp.toJSON(),
        ...entry.toJSON(),
        fixed_gross: emp.fixed_gross,
        pf_applicable: emp.pf_applicable,
        pf_ceiling: emp.pf_ceiling,
        esic_applicable: emp.esic_applicable,
        absent_days: absentDays,
        _elapsedDays: elapsedDays,
      });

      return {
        id: entry.id,
        employeeCode: emp.emp_code,
        name: emp.name,
        location: emp.location || emp.office?.name || 'Unknown',
        company: emp.company_name || 'Apaar Logistics & Cold Supply Chain Pvt Ltd',
        designation: emp.designation || '',
        fixedGross: Number(emp.fixed_gross) || 0,
        pfApplicable: emp.pf_applicable || false,
        pfCeiling: emp.pf_ceiling || false,
        esicApplicable: emp.esic_applicable || false,
        absentDays,
        bonus: Number(entry.bonus) || 0,
        previousArrears: Number(entry.previous_arrears) || 0,
        incentive: Number(entry.incentive) || 0,
        loanDeduction: Number(entry.loan_deduction) || 0,
        otherDeduction: Number(entry.other_deduction) || 0,
        status: entry.status || cycle.status || 'Draft',
        elapsedDays,
        ...calculation,
      };
    });

    return {
      cycle: {
        id: cycle.id,
        month: cycle.month,
        month_index: cycle.month_index,
        year: cycle.year,
        status: cycle.status,
        paid_on: cycle.paid_on,
        disbursement_mode: cycle.disbursement_mode,
        disbursement_reference: cycle.disbursement_reference,
        elapsedDays,
      },
      rows,
    };
  }

  // ── API: GET /payroll/ledger/:cycleId — specific cycle rows ──

  async getLedgerByCycleId(cycleId) {
    const cycle = await PayrollCycle.findByPk(cycleId, {
      include: [{
        model: PayrollEntry,
        as: 'entries',
        include: [{ model: Employee, as: 'employee', include: [{ model: Office, as: 'office' }] }],
      }],
    });

    if (!cycle) {
      throw new AppError('Payroll cycle not found', 404);
    }

    const rows = (cycle.entries || []).map(entry => {
      const emp = entry.employee;
      const calculation = this._calculateRow({
        ...emp.toJSON(),
        ...entry.toJSON(),
        fixed_gross: emp.fixed_gross,
        pf_applicable: emp.pf_applicable,
        pf_ceiling: emp.pf_ceiling,
        esic_applicable: emp.esic_applicable,
      });

      return {
        id: entry.id,
        employeeCode: emp.emp_code,
        name: emp.name,
        location: emp.location || emp.office?.name || 'Unknown',
        company: emp.company_name || 'Apaar Logistics & Cold Supply Chain Pvt Ltd',
        designation: emp.designation || '',
        fixedGross: Number(emp.fixed_gross) || 0,
        pfApplicable: emp.pf_applicable || false,
        pfCeiling: emp.pf_ceiling || false,
        esicApplicable: emp.esic_applicable || false,
        absentDays: entry.absent_days || 0,
        bonus: Number(entry.bonus) || 0,
        previousArrears: Number(entry.previous_arrears) || 0,
        incentive: Number(entry.incentive) || 0,
        loanDeduction: Number(entry.loan_deduction) || 0,
        otherDeduction: Number(entry.other_deduction) || 0,
        status: entry.status || cycle.status || 'Draft',
        ...calculation,
      };
    });

    return { cycle, rows };
  }

  // ── API: GET /payroll/history — past cycles summary ──

  async getCycleHistory({ page = 1, limit = PAGINATION.DEFAULT_LIMIT, year } = {}) {
    const where = {};
    if (year) where.year = year;

    const { rows, count } = await PayrollCycle.findAndCountAll({
      where,
      include: [{
        model: PayrollEntry,
        as: 'entries',
        include: [{ model: Employee, as: 'employee', include: [{ model: Office, as: 'office' }] }],
      }],
      order: [['year', 'DESC'], ['month_index', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    const history = rows.map(cycle => {
      const entries = cycle.entries || [];
      let totalPayout = 0;
      const branchMap = new Map();

      entries.forEach(entry => {
        const emp = entry.employee;
        if (!emp) return;
        const calc = this._calculateRow({
          ...emp.toJSON(),
          ...entry.toJSON(),
          fixed_gross: emp.fixed_gross,
          pf_applicable: emp.pf_applicable,
          pf_ceiling: emp.pf_ceiling,
          esic_applicable: emp.esic_applicable,
        });
        totalPayout += calc.net;

        const branchName = emp.location || emp.office?.name || 'Unknown';
        if (!branchMap.has(branchName)) {
          branchMap.set(branchName, { name: branchName, payout: 0, staff: 0 });
        }
        const b = branchMap.get(branchName);
        b.payout += calc.net;
        b.staff += 1;
      });

      const branchBreakdown = Array.from(branchMap.values()).map(b => ({
        ...b,
        payout: Math.round(b.payout),
      }));

      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = `${monthNames[cycle.month_index] || cycle.month} ${cycle.year}`;
      const monthId = `${monthNames[cycle.month_index]?.substring(0, 3).toUpperCase() || cycle.month?.substring(0, 3).toUpperCase()}-${cycle.year}`;

      const STATUS_MAP = {
        'Paid': 'Completed',
        'Verified': 'Completed',
        'Draft': 'Processing',
        'Pending Audit': 'Processing',
      };

      const METHOD_MAP = {
        'neft': 'NEFT / RTGS',
        'imps': 'Bulk IMPS',
        'bank_transfer': 'Bank Transfer',
        'cheque': 'Cheque',
      };

      return {
        id: cycle.id,
        monthId,
        monthName,
        month: cycle.month,
        month_index: cycle.month_index,
        year: cycle.year,
        disbursementDate: cycle.paid_on
          ? new Date(cycle.paid_on).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : 'Pending',
        totalPayout: Math.round(totalPayout),
        totalStaff: entries.length,
        branches: branchBreakdown,
        status: STATUS_MAP[cycle.status] || cycle.status || 'Processing',
        method: METHOD_MAP[cycle.disbursement_mode] || cycle.disbursement_mode || 'N/A',
        rawPayout: Math.round(totalPayout),
        paid_on: cycle.paid_on,
        date: cycle.paid_on || null,
      };
    });

    return {
      data: history,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count, totalPages: Math.ceil(count / limit) },
    };
  }

  // ── API: PATCH /payroll/entry/:entryId — update a single entry ──

  async updateEntry(entryId, data) {
    const entry = await PayrollEntry.findByPk(entryId);
    if (!entry) throw new AppError('Payroll entry not found', 404);

    const allowed = ['absent_days', 'bonus', 'previous_arrears', 'incentive', 'loan_deduction', 'other_deduction', 'status'];
    const updates = {};
    for (const key of allowed) {
      if (data[key] !== undefined) updates[key] = data[key];
    }

    await entry.update(updates);
    return entry;
  }

  // ── API: PATCH /payroll/entry/:entryId/status — change status ──

  async updateEntryStatus(entryId, status) {
    const validStatuses = ['Draft', 'Verified', 'Paid', 'Pending Audit'];
    if (!validStatuses.includes(status)) {
      throw new AppError(`Invalid status: ${status}. Valid: ${validStatuses.join(', ')}`, 400);
    }

    const entry = await PayrollEntry.findByPk(entryId);
    if (!entry) throw new AppError('Payroll entry not found', 404);

    await entry.update({ status });
    return entry;
  }

  // ── API: POST /payroll/disburse — disburse the current cycle ──

  async disburseCycle(cycleId, { mode, reference, authorizedBy, remarks }) {
    const cycle = await PayrollCycle.findByPk(cycleId);
    if (!cycle) throw new AppError('Payroll cycle not found', 404);

    await cycle.update({
      status: 'Paid',
      paid_on: new Date(),
      disbursement_mode: mode,
      disbursement_reference: reference,
      disbursement_remarks: remarks,
      paid_by: authorizedBy,
    });

    // Mark all entries as Paid
    await PayrollEntry.update(
      { status: 'Paid' },
      { where: { cycle_id: cycleId } },
    );

    logger.info(`Disbursed payroll cycle ${cycleId} (${cycle.month} ${cycle.year})`);
    return cycle;
  }

  // ── Internal: auto-create a cycle for the current month ──

  async _createCycleForMonth(monthIndex, year) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    const existing = await PayrollCycle.findOne({ where: { month_index: monthIndex, year } });
    if (existing) return existing;

    const cycle = await PayrollCycle.create({
      month: `${monthNames[monthIndex]} ${year}`,
      month_index: monthIndex,
      year,
      status: 'Draft',
    });

    // Auto-create entries for all active employees
    const employees = await Employee.findAll({ where: { status: 'active' } });
    const { MonthlyAttendance } = require('../models');
    const monthlyStats = await MonthlyAttendance.findAll({
      where: {
        month: monthIndex + 1,
        year: year,
      },
    });

    const monthlyMap = new Map(monthlyStats.map(m => [m.employee_id, m]));

    const entries = employees.map(emp => {
      const monthly = monthlyMap.get(emp.id);
      const absentDays = monthly ? (Number(monthly.absent_days) + Number(monthly.half_days) * 0.5) : 0;
      return {
        cycle_id: cycle.id,
        employee_id: emp.id,
        absent_days: absentDays,
        status: 'Draft',
      };
    });

    if (entries.length > 0) {
      await PayrollEntry.bulkCreate(entries);
      logger.info(`Auto-created ${entries.length} entries for cycle ${cycle.month}`);
    }

    return cycle;
  }
}

module.exports = new PayrollLedgerService();