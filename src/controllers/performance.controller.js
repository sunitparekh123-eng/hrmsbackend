const performanceService = require('../services/performance.service');
const { success, paginated } = require('../utils/response');
const logger = require('../utils/logger');

class PerformanceController {
  // Objectives
  async getMyObjectives(req, res, next) {
    try {
      const employeeId = req.employee.id;
      const { status, category } = req.query;
      const result = await performanceService.getObjectives(employeeId, { status, category });
      return success(res, 'Objectives fetched', result, 200);
    } catch (err) {
      logger.error(`Get my objectives error: ${err.message}`);
      return next(err);
    }
  }

  async createObjective(req, res, next) {
    try {
      const employeeId = req.employee.id;
      const objectiveData = req.body;
      const result = await performanceService.createObjective(employeeId, objectiveData);
      return success(res, 'Objective created', result, 201);
    } catch (err) {
      logger.error(`Create objective error: ${err.message}`);
      return next(err);
    }
  }

  async updateObjective(req, res, next) {
    try {
      const { id } = req.params;
      const objectiveData = req.body;
      const result = await performanceService.updateObjective(id, objectiveData, req.employee.id);
      return success(res, 'Objective updated', result, 200);
    } catch (err) {
      logger.error(`Update objective error: ${err.message}`);
      return next(err);
    }
  }

  async deleteObjective(req, res, next) {
    try {
      const { id } = req.params;
      await performanceService.deleteObjective(id, req.employee.id);
      return success(res, 'Objective deleted', null, 200);
    } catch (err) {
      logger.error(`Delete objective error: ${err.message}`);
      return next(err);
    }
  }

  // Reviews
  async getMyReviews(req, res, next) {
    try {
      const employeeId = req.employee.id;
      const result = await performanceService.getReviews(employeeId);
      return success(res, 'Reviews fetched', result, 200);
    } catch (err) {
      logger.error(`Get my reviews error: ${err.message}`);
      return next(err);
    }
  }

  async getReviewById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await performanceService.getReviewById(id);
      return success(res, 'Review fetched', result, 200);
    } catch (err) {
      logger.error(`Get review by id error: ${err.message}`);
      return next(err);
    }
  }

  // Admin/HR/Manager
  async getEmployeeObjectives(req, res, next) {
    try {
      const { employeeId } = req.params;
      const result = await performanceService.getObjectives(employeeId, req.query);
      return success(res, 'Employee objectives fetched', result, 200);
    } catch (err) {
      logger.error(`Get employee objectives error: ${err.message}`);
      return next(err);
    }
  }

  async getEmployeeReviews(req, res, next) {
    try {
      const { employeeId } = req.params;
      const result = await performanceService.getReviews(employeeId);
      return success(res, 'Employee reviews fetched', result, 200);
    } catch (err) {
      logger.error(`Get employee reviews error: ${err.message}`);
      return next(err);
    }
  }

  async createReview(req, res, next) {
    try {
      const { employeeId } = req.params;
      const reviewData = req.body;
      const result = await performanceService.createReview(employeeId, reviewData, req.employee.id);
      return success(res, 'Review created', result, 201);
    } catch (err) {
      logger.error(`Create review error: ${err.message}`);
      return next(err);
    }
  }

  async updateReview(req, res, next) {
    try {
      const { id } = req.params;
      const reviewData = req.body;
      const result = await performanceService.updateReview(id, reviewData, req.employee.id);
      return success(res, 'Review updated', result, 200);
    } catch (err) {
      logger.error(`Update review error: ${err.message}`);
      return next(err);
    }
  }
}

module.exports = new PerformanceController();