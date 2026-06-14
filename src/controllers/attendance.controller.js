const attendanceService = require('../services/attendance.service');
const { success, paginated } = require('../utils/response');
const logger = require('../utils/logger');

class AttendanceController {
  async punchIn(req, res, next) {
    try {
      const employeeId = req.employee.id;
      const { latitude, longitude } = req.body;
      const result = await attendanceService.punchIn(employeeId, latitude, longitude);
      return success(res, 'Punch in successful', result, 200);
    } catch (err) {
      logger.error(`Punch in error: ${err.message}`);
      return next(err);
    }
  }

  async punchOut(req, res, next) {
    try {
      const employeeId = req.employee.id;
      const { latitude, longitude } = req.body;
      const result = await attendanceService.punchOut(employeeId, latitude, longitude);
      return success(res, 'Punch out successful', result, 200);
    } catch (err) {
      logger.error(`Punch out error: ${err.message}`);
      return next(err);
    }
  }

  async getTodayStatus(req, res, next) {
    try {
      const employeeId = req.employee.id;
      const result = await attendanceService.getTodayStatus(employeeId);
      return success(res, 'Today status fetched', result, 200);
    } catch (err) {
      logger.error(`Get today status error: ${err.message}`);
      return next(err);
    }
  }

  async getMonthlyAttendance(req, res, next) {
    try {
      const employeeId = req.employee.id;
      const { month, year } = req.query;
      const result = await attendanceService.getMonthlyAttendance(employeeId, month, year);
      return success(res, 'Monthly attendance fetched', result, 200);
    } catch (err) {
      logger.error(`Get monthly attendance error: ${err.message}`);
      return next(err);
    }
  }

  async getAttendanceHistory(req, res, next) {
    try {
      const employeeId = req.employee.id;
      const { page, limit } = req.query;
      const result = await attendanceService.getAttendanceHistory(employeeId, page, limit);
      return paginated(res, 'Attendance history fetched', result.data, result.pagination, 200);
    } catch (err) {
      logger.error(`Get attendance history error: ${err.message}`);
      return next(err);
    }
  }

  async getEmployeeAttendance(req, res, next) {
    try {
      const { employeeId } = req.params;
      const { month, year } = req.query;
      const result = await attendanceService.getMonthlyAttendance(employeeId, month, year);
      return success(res, 'Employee attendance fetched', result, 200);
    } catch (err) {
      logger.error(`Get employee attendance error: ${err.message}`);
      return next(err);
    }
  }

  async getTeamAttendance(req, res, next) {
    try {
      const managerId = req.employee.id;
      const { date } = req.query;
      const result = await attendanceService.getTeamAttendance(managerId, date);
      return success(res, 'Team attendance fetched', result, 200);
    } catch (err) {
      logger.error(`Get team attendance error: ${err.message}`);
      return next(err);
    }
  }

  async overrideAttendance(req, res, next) {
    try {
      const { id } = req.params;
      const overrideData = req.body;
      const result = await attendanceService.overrideAttendance(id, overrideData, req.employee.id);
      return success(res, 'Attendance overridden successfully', result, 200);
    } catch (err) {
      logger.error(`Override attendance error: ${err.message}`);
      return next(err);
    }
  }

  // Admin: Get live attendance for all employees
  async getLiveAttendance(req, res, next) {
    try {
      const { office_id, company_id, search, status, page, limit } = req.query;
      const result = await attendanceService.getLiveAttendance({ office_id, company_id, search, status, page, limit });
      return success(res, 'Live attendance fetched', result, 200);
    } catch (err) {
      logger.error(`Get live attendance error: ${err.message}`);
      return next(err);
    }
  }

  // Admin: Get all attendance history
  async getAllAttendanceHistory(req, res, next) {
    try {
      const { page, limit, from, to, office_id, company_id, search } = req.query;
      const result = await attendanceService.getAllAttendanceHistory({ page, limit, from, to, office_id, company_id, search });
      return success(res, 'Attendance history fetched', result, 200);
    } catch (err) {
      logger.error(`Get all attendance history error: ${err.message}`);
      return next(err);
    }
  }

  // Admin: Get monthly attendance grid for all employees
  async getAllMonthlyAttendance(req, res, next) {
    try {
      const { month, year, office_id, company_id, search } = req.query;
      const result = await attendanceService.getAllMonthlyAttendance({ month, year, office_id, company_id, search });
      return success(res, 'Monthly attendance grid fetched', result, 200);
    } catch (err) {
      logger.error(`Get all monthly attendance error: ${err.message}`);
      return next(err);
    }
  }

  // Admin: Manual attendance entry
  async manualEntry(req, res, next) {
    try {
      const adminId = req.employee.id;
      const { employeeId, date, status, reason } = req.body;
      const result = await attendanceService.manualEntry(adminId, { employeeId, date, status, reason });
      return success(res, 'Manual attendance entry created', result, 200);
    } catch (err) {
      logger.error(`Manual entry error: ${err.message}`);
      return next(err);
    }
  }
}

module.exports = new AttendanceController();