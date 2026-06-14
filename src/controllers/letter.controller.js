const letterService = require('../services/letter.service');
const { success, paginated } = require('../utils/response');
const logger = require('../utils/logger');

class LetterController {
  async getMyLetters(req, res, next) {
    try {
      const employeeId = req.employee.id;
      const { page, limit, type, status } = req.query;
      const result = await letterService.getLetters(employeeId, { page, limit, type, status });
      return paginated(res, 'Letters fetched', result.data, result.pagination, 200);
    } catch (err) {
      logger.error(`Get my letters error: ${err.message}`);
      return next(err);
    }
  }

  async getLetterById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await letterService.getLetterById(id, req.employee.id);
      return success(res, 'Letter fetched', result, 200);
    } catch (err) {
      logger.error(`Get letter by id error: ${err.message}`);
      return next(err);
    }
  }

  async acknowledgeLetter(req, res, next) {
    try {
      const { id } = req.params;
      const result = await letterService.acknowledgeLetter(id, req.employee.id);
      return success(res, 'Letter acknowledged', result, 200);
    } catch (err) {
      logger.error(`Acknowledge letter error: ${err.message}`);
      return next(err);
    }
  }

  async getAllLetters(req, res, next) {
    try {
      const { page, limit, type, status } = req.query;
      const result = await letterService.getAllLetters({ page, limit, type, status });
      return paginated(res, 'All letters fetched', result.data, result.pagination, 200);
    } catch (err) {
      logger.error(`Get all letters error: ${err.message}`);
      return next(err);
    }
  }

  async issueLetter(req, res, next) {
    try {
      const letterData = req.body;
      const result = await letterService.issueLetter(letterData, req.employee.id);
      return success(res, 'Letter issued', result, 201);
    } catch (err) {
      logger.error(`Issue letter error: ${err.message}`);
      return next(err);
    }
  }

  async updateLetter(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const result = await letterService.updateLetter(id, updateData);
      return success(res, 'Letter updated', result, 200);
    } catch (err) {
      logger.error(`Update letter error: ${err.message}`);
      return next(err);
    }
  }

  async deleteLetter(req, res, next) {
    try {
      const { id } = req.params;
      await letterService.deleteLetter(id);
      return success(res, 'Letter deleted', null, 200);
    } catch (err) {
      logger.error(`Delete letter error: ${err.message}`);
      return next(err);
    }
  }
}

module.exports = new LetterController();