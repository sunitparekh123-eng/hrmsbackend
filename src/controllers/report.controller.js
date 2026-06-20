const reportService = require('../services/report.service');
const { success } = require('../utils/response');
const logger = require('../utils/logger');

// ── Standalone helper: parse & validate query params (no `this` needed) ──
function parseQuery(month, year, office_id, search) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const parsedMonth = month ? parseInt(month, 10) : currentMonth;
  const parsedYear = year ? parseInt(year, 10) : currentYear;
  const parsedOfficeId = office_id ? parseInt(office_id, 10) : null;

  if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
    throw new Error(`Invalid month: ${month}. Must be between 1 and 12.`);
  }
  if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
    throw new Error(`Invalid year: ${year}.`);
  }

  return {
    month: parsedMonth,
    year: parsedYear,
    office_id: parsedOfficeId,
    search: search && search.trim() ? search.trim() : null,
  };
}

// ── Plain object with bound methods (no `this` — safe as Express handlers) ──
const reportController = {

  // GET /reports/cycles — available month/year pairs
  async getAvailableCycles(req, res, next) {
    try {
      const cycles = await reportService.getAvailableCycles();
      return success(res, 'Available cycles fetched', cycles, 200);
    } catch (err) {
      logger.error(`Get available cycles error: ${err.message}`);
      return next(err);
    }
  },

  // GET /reports/offices — office list for filter
  async getOfficeList(req, res, next) {
    try {
      const offices = await reportService.getOfficeList();
      return success(res, 'Office list fetched', offices, 200);
    } catch (err) {
      logger.error(`Get office list error: ${err.message}`);
      return next(err);
    }
  },

  // GET /reports/payroll — payroll CTC breakdown
  async getPayrollReport(req, res, next) {
    try {
      const { month, year, office_id, search } = req.query;
      const parsed = parseQuery(month, year, office_id, search);
      const result = await reportService.getPayrollReport(parsed);
      return success(res, 'Payroll report fetched', result, 200);
    } catch (err) {
      logger.error(`Get payroll report error: ${err.message}`);
      return next(err);
    }
  },

  // GET /reports/attendance — attendance & LWP log
  async getAttendanceReport(req, res, next) {
    try {
      const { month, year, office_id, search } = req.query;
      const parsed = parseQuery(month, year, office_id, search);
      const result = await reportService.getAttendanceReport(parsed);
      return success(res, 'Attendance report fetched', result, 200);
    } catch (err) {
      logger.error(`Get attendance report error: ${err.message}`);
      return next(err);
    }
  },

  // GET /reports/statutory — PF/ESI/PT breakdown
  async getStatutoryReport(req, res, next) {
    try {
      const { month, year, office_id, search } = req.query;
      const parsed = parseQuery(month, year, office_id, search);
      const result = await reportService.getStatutoryReport(parsed);
      return success(res, 'Statutory report fetched', result, 200);
    } catch (err) {
      logger.error(`Get statutory report error: ${err.message}`);
      return next(err);
    }
  },

  // GET /reports/branch — branch/location split
  async getBranchReport(req, res, next) {
    try {
      const { month, year } = req.query;
      const parsed = parseQuery(month, year, null, null);
      const result = await reportService.getBranchReport(parsed);
      return success(res, 'Branch report fetched', result, 200);
    } catch (err) {
      logger.error(`Get branch report error: ${err.message}`);
      return next(err);
    }
  },

  // GET /reports/full — all views in one call
  async getFullReport(req, res, next) {
    try {
      const { month, year, office_id, search } = req.query;
      const parsed = parseQuery(month, year, office_id, search);
      const result = await reportService.getFullReport(parsed);
      return success(res, 'Full report fetched', result, 200);
    } catch (err) {
      logger.error(`Get full report error: ${err.message}`);
      return next(err);
    }
  },

  // GET /reports/tour-expenses
  async getTourExpenseReport(req, res, next) {
    try {
      const { month, year, office_id, search } = req.query;
      const parsed = parseQuery(month, year, office_id, search);
      const result = await reportService.getTourExpenseReport(parsed);
      return success(res, 'Tour expenses report fetched', result, 200);
    } catch (err) {
      logger.error(`Get tour expenses report error: ${err.message}`);
      return next(err);
    }
  },
};

module.exports = reportController;