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

  async getAdminGovernance(req, res, next) {
    try {
      const result = await dashboardService.getAdminGovernance();
      return success(res, 'Admin governance rules fetched', result, 200);
    } catch (err) {
      logger.error(`Get admin governance error: ${err.message}`);
      return next(err);
    }
  }

  async getAdminCompliance(req, res, next) {
    try {
      const result = await dashboardService.getAdminCompliance();
      return success(res, 'Admin compliance audit fetched', result, 200);
    } catch (err) {
      logger.error(`Get admin compliance error: ${err.message}`);
      return next(err);
    }
  }

  async getAdminActivity(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 8;
      const result = await dashboardService.getAdminActivity(limit);
      return success(res, 'Admin recent activities fetched', result, 200);
    } catch (err) {
      logger.error(`Get admin activity error: ${err.message}`);
      return next(err);
    }
  }
}

module.exports = new DashboardController();