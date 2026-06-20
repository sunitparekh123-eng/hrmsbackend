const holidayService = require('../services/holiday.service');
const { success } = require('../utils/response');
const logger = require('../utils/logger');

class HolidayController {
  async getAllHolidays(req, res, next) {
    try {
      const result = await holidayService.getAllHolidays();
      return success(res, 'Holidays fetched successfully', result, 200);
    } catch (err) {
      logger.error(`Get all holidays error: ${err.message}`);
      return next(err);
    }
  }

  async createHoliday(req, res, next) {
    try {
      const result = await holidayService.createHoliday(req.body);
      return success(res, 'Holiday created successfully', result, 201);
    } catch (err) {
      logger.error(`Create holiday error: ${err.message}`);
      return next(err);
    }
  }

  async updateHoliday(req, res, next) {
    try {
      const { id } = req.params;
      const result = await holidayService.updateHoliday(id, req.body);
      return success(res, 'Holiday updated successfully', result, 200);
    } catch (err) {
      logger.error(`Update holiday error: ${err.message}`);
      return next(err);
    }
  }

  async deleteHoliday(req, res, next) {
    try {
      const { id } = req.params;
      const result = await holidayService.deleteHoliday(id);
      return success(res, 'Holiday deleted successfully', result, 200);
    } catch (err) {
      logger.error(`Delete holiday error: ${err.message}`);
      return next(err);
    }
  }

  async seedCalendar(req, res, next) {
    try {
      const { year } = req.body;
      const result = await holidayService.seedCalendar(year);
      return success(res, 'Calendar fetched/seeded successfully', result, 200);
    } catch (err) {
      logger.error(`Seed calendar error: ${err.message}`);
      return next(err);
    }
  }
}

module.exports = new HolidayController();
