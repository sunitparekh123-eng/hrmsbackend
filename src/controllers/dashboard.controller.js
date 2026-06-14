const dashboardService = require('../services/dashboard.service');
const { success } = require('../utils/response');
const logger = require('../utils/logger');

class DashboardController {
  async getEmployeeSummary(req, res, next) {
    try {
      const employeeId = req.employee.id;
      const result = await dashboardService.getEmployeeSummary(employeeId);
      return success(res, 'Dashboard summary fetched', result, 200);
    } catch (err) {
      logger.error(`Get employee summary error: ${err.message}`);
      return next(err);
    }
  }

  async getEmployeeStats(req, res, next) {
    try {
      const employeeId = req.employee.id;
      const result = await dashboardService.getEmployeeStats(employeeId);
      return success(res, 'Dashboard stats fetched', result, 200);
    } catch (err) {
      logger.error(`Get employee stats error: ${err.message}`);
      return next(err);
    }
  }

  async getAdminSummary(req, res, next) {
    try {
      const result = await dashboardService.getAdminSummary();
      return success(res, 'Admin dashboard summary fetched', result, 200);
    } catch (err) {
      logger.error(`Get admin summary error: ${err.message}`);
      return next(err);
    }
  }

  async getAdminStats(req, res, next) {
    try {
      const result = await dashboardService.getAdminStats();
      return success(res, 'Admin dashboard stats fetched', result, 200);
    } catch (err) {
      logger.error(`Get admin stats error: ${err.message}`);
      return next(err);
    }
  }
}

module.exports = new DashboardController();