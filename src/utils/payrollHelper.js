const { SystemSetting, Holiday } = require('../models');
const { Op } = require('sequelize');
const logger = require('./logger');

/**
 * Shared payroll helper — provides dynamic weekend/holiday-aware working day
 * computations used by payroll.service, payroll_ledger.service, dashboard.service,
 * and attendance.service.
 */

/**
 * Read the weekend policy from SystemSetting and return an array of JS
 * day-of-week numbers that are considered weekends.
 *
 * 'sunday_only'      → [0]          (Sunday)
 * 'saturday_sunday'  → [0, 6]       (Sunday, Saturday)
 *
 * @returns {Promise<number[]>}
 */
async function getWeekendDays() {
  try {
    const setting = await SystemSetting.findByPk('weekend_policy');
    const policy = setting ? setting.value : 'sunday_only';
    return policy === 'saturday_sunday' ? [0, 6] : [0];
  } catch (e) {
    logger.error(`[payrollHelper] Failed to read weekend policy: ${e.message}`);
    return [0]; // safe default
  }
}

/**
 * Fetch active holidays that overlap with the given month.
 *
 * @param {number} year
 * @param {number} month  1-indexed (1 = Jan, 12 = Dec)
 * @returns {Promise<Array<{start_date: string, end_date: string, name: string}>>}
 */
async function getHolidaysInMonth(year, month) {
  try {
    let prevMonthYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevMonthYear = year - 1;
    }
    
    const cycleStart = `${prevMonthYear}-${String(prevMonth).padStart(2, '0')}-26`;
    const cycleEnd = `${year}-${String(month).padStart(2, '0')}-25`;

    return await Holiday.findAll({
      where: {
        is_active: true,
        start_date: { [Op.lte]: cycleEnd },
        end_date:   { [Op.gte]: cycleStart },
      },
      raw: true,
    });
  } catch (e) {
    logger.error(`[payrollHelper] Failed to fetch holidays: ${e.message}`);
    return [];
  }
}

/**
 * Check whether a YYYY-MM-DD date string falls within any of the given holidays.
 *
 * @param {string} dateStr
 * @param {Array<{start_date: string, end_date: string}>} holidays
 * @returns {boolean}
 */
function isHolidayDate(dateStr, holidays) {
  return holidays.some(h => dateStr >= h.start_date && dateStr <= h.end_date);
}

/**
 * Count the total working days in a month (excluding weekends per policy
 * and active holidays).
 *
 * @param {number} year
 * @param {number} month      1-indexed
 * @param {number[]} weekendDays  JS day-of-week numbers (0=Sun)
 * @param {Array} holidays     From getHolidaysInMonth()
 * @returns {number}
 */
function countWorkingDaysInMonth(year, month, weekendDays, holidays) {
  let prevMonthYear = year;
  let prevMonth = month - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevMonthYear = year - 1;
  }
  
  const startDate = new Date(prevMonthYear, prevMonth - 1, 26);
  const endDate = new Date(year, month - 1, 25);
  
  let count = 0;
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    if (weekendDays.includes(d.getDay())) continue;

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    if (isHolidayDate(dateStr, holidays)) continue;

    count++;
  }
  return count;
}

/**
 * Count how many working days have elapsed from the 1st of the month up to
 * (and including) `upToDay`, excluding weekends and holidays.
 *
 * @param {number} year
 * @param {number} month        1-indexed
 * @param {number} upToDay      Calendar day to count up to (inclusive)
 * @param {number[]} weekendDays
 * @param {Array} holidays
 * @returns {number}
 */
function countElapsedWorkingDays(year, month, upToDate, doj, weekendDays, holidays) {
  let prevMonthYear = year;
  let prevMonth = month - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevMonthYear = year - 1;
  }
  
  const cycleStart = new Date(prevMonthYear, prevMonth - 1, 26);
  const cycleEnd = new Date(year, month - 1, 25);
  
  let start = cycleStart;
  if (doj) {
    const dojDate = new Date(doj);
    if (dojDate > start) {
      start = dojDate;
    }
  }
  
  let end = upToDate;
  if (end > cycleEnd) end = cycleEnd;
  
  if (start > end) return 0;
  
  let count = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (weekendDays.includes(d.getDay())) continue;

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    if (isHolidayDate(dateStr, holidays)) continue;

    count++;
  }
  return count;
}

/**
 * Given a calendar-based elapsed day count and context, convert it to a
 * working-day-based elapsed count.
 *
 * When `calendarElapsed` is null the function returns null (meaning "use full
 * month denominator").  When it is 0 the function returns 0 (future joiner).
 * Otherwise it counts working days from the 1st up to `calendarElapsed`.
 *
 * @param {number|null} calendarElapsed
 * @param {number} year
 * @param {number} month        1-indexed
 * @param {number[]} weekendDays
 * @param {Array} holidays
 * @returns {number|null}
 */
function toWorkingElapsed(calendarElapsed, year, month, weekendDays, holidays) {
  return null; // Deprecated, use countElapsedWorkingDays directly with upToDate
}

module.exports = {
  getWeekendDays,
  getHolidaysInMonth,
  isHolidayDate,
  countWorkingDaysInMonth,
  countElapsedWorkingDays,
  toWorkingElapsed,
};