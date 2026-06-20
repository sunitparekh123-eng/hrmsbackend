const tourExpenseService = require('../services/tour_expense.service');
const { success } = require('../utils/response');
const logger = require('../utils/logger');

class TourExpenseController {
  async getAllClaims(req, res, next) {
    try {
      const { status, search, company_id, office_id, page, limit } = req.query;
      const employeeId = req.employee.id;
      const role = req.employee.role;
      // Check if user has admin/hr role or manager privileges
      const isManagerial = ['admin', 'hr', 'manager'].includes(role);

      const result = await tourExpenseService.getAllClaims({
        status,
        search,
        company_id,
        office_id,
        page,
        limit,
        employeeId,
        isManagerial,
      });

      return success(res, 'Tour expense claims fetched', result, 200);
    } catch (err) {
      logger.error(`Get all claims error: ${err.message}`);
      return next(err);
    }
  }

  async getClaimById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await tourExpenseService.getClaimById(id);
      return success(res, 'Tour expense claim fetched', result, 200);
    } catch (err) {
      logger.error(`Get claim by ID error: ${err.message}`);
      return next(err);
    }
  }

  async createClaim(req, res, next) {
    try {
      const employeeId = req.employee.id;
      const claimData = req.body;
      const result = await tourExpenseService.createClaim(employeeId, claimData);
      return success(res, 'Tour expense claim submitted successfully', result, 201);
    } catch (err) {
      logger.error(`Create claim error: ${err.message}`);
      return next(err);
    }
  }

  async approveClaim(req, res, next) {
    try {
      const { id } = req.params;
      const approverId = req.employee.id;
      const result = await tourExpenseService.approveClaim(id, approverId);
      return success(res, 'Tour expense claim approved successfully', result, 200);
    } catch (err) {
      logger.error(`Approve claim error: ${err.message}`);
      return next(err);
    }
  }

  async rejectClaim(req, res, next) {
    try {
      const { id } = req.params;
      const rejecterId = req.employee.id;
      const { rejected_reason } = req.body;
      const result = await tourExpenseService.rejectClaim(id, rejected_reason, rejecterId);
      return success(res, 'Tour expense claim rejected successfully', result, 200);
    } catch (err) {
      logger.error(`Reject claim error: ${err.message}`);
      return next(err);
    }
  }

  async getPolicies(req, res, next) {
    try {
      const result = await tourExpenseService.getPolicies();
      return success(res, 'Tour expense policies fetched', result, 200);
    } catch (err) {
      logger.error(`Get policies error: ${err.message}`);
      return next(err);
    }
  }

  async updatePolicies(req, res, next) {
    try {
      const { policies, generalRules } = req.body;
      const result = await tourExpenseService.updatePolicies(policies, generalRules);
      return success(res, 'Tour expense policies updated successfully', result, 200);
    } catch (err) {
      logger.error(`Update policies error: ${err.message}`);
      return next(err);
    }
  }
}

module.exports = new TourExpenseController();
