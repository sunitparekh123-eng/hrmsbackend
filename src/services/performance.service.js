const { PerformanceObjective, PerformanceReview, Employee } = require('../models');
const { AppError } = require('../middleware/error.middleware');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

class PerformanceService {
  async getObjectives(employeeId, { status, category } = {}) {
    const whereClause = { employee_id: employeeId };
    if (status) whereClause.status = status;
    if (category) whereClause.category = category;

    const objectives = await PerformanceObjective.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
    });

    return objectives;
  }

  async createObjective(employeeId, objectiveData) {
    const objective = await PerformanceObjective.create({
      employee_id: employeeId,
      ...objectiveData,
    });

    logger.info(`Objective created for employee ${employeeId}: ${objectiveData.title}`);
    return objective;
  }

  async updateObjective(objectiveId, objectiveData, employeeId) {
    const objective = await PerformanceObjective.findByPk(objectiveId);
    if (!objective) throw new AppError('Objective not found', 404);

    // Only the owner or admin/hr can update
    const employee = await Employee.findByPk(employeeId);
    if (objective.employee_id !== employeeId && employee.role !== 'admin' && employee.role !== 'hr') {
      throw new AppError('You can only update your own objectives', 403);
    }

    await objective.update(objectiveData);
    return objective;
  }

  async deleteObjective(objectiveId, employeeId) {
    const objective = await PerformanceObjective.findByPk(objectiveId);
    if (!objective) throw new AppError('Objective not found', 404);

    const employee = await Employee.findByPk(employeeId);
    if (objective.employee_id !== employeeId && employee.role !== 'admin' && employee.role !== 'hr') {
      throw new AppError('You can only delete your own objectives', 403);
    }

    await objective.destroy();
    logger.info(`Objective ${objectiveId} deleted`);
    return true;
  }

  async getReviews(employeeId) {
    const reviews = await PerformanceReview.findAll({
      where: { employee_id: employeeId },
      include: [{
        model: Employee,
        as: 'reviewer',
        attributes: ['id', 'name', 'designation'],
      }],
      order: [['reviewed_at', 'DESC']],
    });

    return reviews;
  }

  async getReviewById(reviewId) {
    const review = await PerformanceReview.findByPk(reviewId, {
      include: [{
        model: Employee,
        as: 'reviewedEmployee',
        attributes: ['id', 'emp_code', 'name', 'designation', 'department', 'profile_image'],
      }, {
        model: Employee,
        as: 'reviewer',
        attributes: ['id', 'name', 'designation'],
      }],
    });

    if (!review) throw new AppError('Review not found', 404);
    return review;
  }

  async createReview(employeeId, reviewData, reviewedBy) {
    // Check if review already exists for this period
    const existing = await PerformanceReview.findOne({
      where: {
        employee_id: employeeId,
        review_period: reviewData.review_period,
      },
    });

    if (existing) {
      throw new AppError('Review already exists for this period', 409);
    }

    const review = await PerformanceReview.create({
      employee_id: employeeId,
      ...reviewData,
      reviewed_by: reviewedBy,
      reviewed_at: new Date(),
      status: 'completed',
    });

    logger.info(`Performance review created for employee ${employeeId} by ${reviewedBy}`);
    return review;
  }

  async updateReview(reviewId, reviewData, updatedBy) {
    const review = await PerformanceReview.findByPk(reviewId);
    if (!review) throw new AppError('Review not found', 404);

    await review.update({
      ...reviewData,
      reviewed_by: updatedBy,
      reviewed_at: new Date(),
    });

    return review;
  }
}

module.exports = new PerformanceService();