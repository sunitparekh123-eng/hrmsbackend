const { Holiday } = require('../models');
const { AppError } = require('../middleware/error.middleware');
const logger = require('../utils/logger');

class HolidayService {
  async getAllHolidays() {
    return await Holiday.findAll({
      order: [['start_date', 'ASC']],
    });
  }

  async createHoliday(data) {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new AppError('Invalid dates provided', 400);
    }
    
    if (end < start) {
      throw new AppError('End date must be on or after start date', 400);
    }

    // Calculate days count
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const holiday = await Holiday.create({
      name: data.name,
      start_date: data.start_date,
      end_date: data.end_date,
      days_count: diffDays,
      is_active: data.is_active !== false,
      is_custom: data.is_custom !== false,
    });

    logger.info(`Holiday "${holiday.name}" created (ID: ${holiday.id}, Days: ${holiday.days_count})`);
    return holiday;
  }

  async updateHoliday(id, data) {
    const holiday = await Holiday.findByPk(id);
    if (!holiday) {
      throw new AppError('Holiday not found', 404);
    }

    const updatePayload = { ...data };

    if (data.start_date || data.end_date) {
      const start = new Date(data.start_date || holiday.start_date);
      const end = new Date(data.end_date || holiday.end_date);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new AppError('Invalid dates provided', 400);
      }
      
      if (end < start) {
        throw new AppError('End date must be on or after start date', 400);
      }

      const diffTime = Math.abs(end - start);
      updatePayload.days_count = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    await holiday.update(updatePayload);
    logger.info(`Holiday ID ${id} updated`);
    return holiday;
  }

  async deleteHoliday(id) {
    const holiday = await Holiday.findByPk(id);
    if (!holiday) {
      throw new AppError('Holiday not found', 404);
    }

    await holiday.destroy();
    logger.info(`Holiday ID ${id} deleted`);
    return holiday;
  }

  async seedCalendar(year = 2026) {
    // Standard Indian Public Holidays for the year
    const defaultHolidays = [
      { name: "Republic Day", start_date: `${year}-01-26`, end_date: `${year}-01-26`, is_custom: false },
      { name: "Holi Festival", start_date: `${year}-03-25`, end_date: `${year}-03-26`, is_custom: false },
      { name: "Eid-ul-Fitr", start_date: `${year}-03-21`, end_date: `${year}-03-21`, is_custom: false },
      { name: "Independence Day", start_date: `${year}-08-15`, end_date: `${year}-08-15`, is_custom: false },
      { name: "Diwali Grand Festival", start_date: `${year}-11-08`, end_date: `${year}-11-11`, is_custom: false },
      { name: "Christmas Week", start_date: `${year}-12-25`, end_date: `${year}-12-26`, is_custom: false },
    ];

    const results = [];
    for (const h of defaultHolidays) {
      // Check if already exists for this date range/name
      const existing = await Holiday.findOne({ where: { name: h.name, start_date: h.start_date } });
      if (!existing) {
        const created = await this.createHoliday(h);
        results.push(created);
      }
    }

    logger.info(`Calendar seeded for year ${year}. Seeded ${results.length} new holidays.`);
    return await this.getAllHolidays();
  }
}

module.exports = new HolidayService();
