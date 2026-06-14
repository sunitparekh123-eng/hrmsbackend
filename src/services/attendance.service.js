const { AttendanceRecord, MonthlyAttendance, Employee, Office, sequelize } = require('../models');
const { AppError } = require('../middleware/error.middleware');
const { Op, literal } = require('sequelize');
const logger = require('../utils/logger');
const { GEO_FENCE } = require('../utils/constants');
const env = require('../config/env');

const TIMEZONE = process.env.TIMEZONE || 'Asia/Kolkata';

/**
 * Returns the current local Date object for the target timezone.
 */
function getLocalDate(date = new Date(), timeZone = TIMEZONE) {
  return new Date(date.toLocaleString('en-US', { timeZone }));
}

/**
 * Returns the current local date string (YYYY-MM-DD) for the target timezone.
 */
function getLocalDateString(date = new Date(), timeZone = TIMEZONE) {
  const local = getLocalDate(date, timeZone);
  const yyyy = local.getFullYear();
  const mm = String(local.getMonth() + 1).padStart(2, '0');
  const dd = String(local.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns the minutes since midnight for a Date in the target timezone.
 */
function getLocalMinutesFromMidnight(date, timeZone = TIMEZONE) {
  const localStr = date.toLocaleString('en-US', { timeZone, hour12: false });
  const timePart = localStr.includes(',') ? localStr.split(',')[1].trim() : localStr.split(' ')[1].trim();
  const parts = timePart.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  return hours * 60 + minutes;
}

/**
 * Parses a "HH:MM:SS" string to minutes since midnight.
 */
function timeStringToMinutes(timeStr, defaultMins) {
  if (!timeStr) return defaultMins;
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10) || 0;
  if (isNaN(hours) || isNaN(minutes)) return defaultMins;
  return hours * 60 + minutes;
}

/**
 * Generates timezone offset suffix (e.g. "+05:30") for building ISO timestamps.
 */
function getTzOffsetSuffix(date, timeZone = TIMEZONE) {
  try {
    const localStr = date.toLocaleString('en-US', { timeZone, timeZoneName: 'longOffset' });
    const gmtIndex = localStr.indexOf('GMT');
    if (gmtIndex !== -1) {
      const offsetStr = localStr.substring(gmtIndex + 3).trim();
      const sign = offsetStr[0];
      const rest = offsetStr.substring(1);
      let hours = 0;
      let minutes = 0;
      if (rest.includes(':')) {
        const parts = rest.split(':');
        hours = parseInt(parts[0], 10);
        minutes = parseInt(parts[1], 10) || 0;
      } else if (rest.length >= 3) {
        hours = parseInt(rest.substring(0, rest.length - 2), 10);
        minutes = parseInt(rest.substring(rest.length - 2), 10) || 0;
      } else {
        hours = parseInt(rest, 10);
      }
      return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  } catch (e) {
    logger.error(`Error calculating timezone offset: ${e.message}`);
  }
  return '+05:30';
}

/**
 * Creates a Date object representing the specified time on the given date in the target timezone.
 */
function createTzDate(dateStr, timeStr, timeZone = TIMEZONE) {
  const tempDate = new Date(`${dateStr}T12:00:00`);
  const offset = getTzOffsetSuffix(tempDate, timeZone);
  return new Date(`${dateStr}T${timeStr}${offset}`);
}

/**
 * Format a TIME value (string "HH:MM:SS" or Date object) to "HH:MM AM/PM" display format in target local timezone.
 * Returns '---' for falsy values.
 */
function _formatTime(time, timeZone = TIMEZONE) {
  if (!time) return '---';
  let hours, minutes;
  if (typeof time === 'string') {
    const parts = time.split(':');
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
  } else if (time instanceof Date) {
    const localStr = time.toLocaleString('en-US', { timeZone, hour12: false });
    const timePart = localStr.includes(',') ? localStr.split(',')[1].trim() : localStr.split(' ')[1].trim();
    const parts = timePart.split(':');
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
  } else {
    return '---';
  }
  if (isNaN(hours) || isNaN(minutes)) return '---';
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

class AttendanceService {
  async punchIn(employeeId, latitude, longitude) {
    const today = new Date();
    const dateStr = getLocalDateString(today);

    // Check if already punched in today
    const existingRecord = await AttendanceRecord.findOne({
      where: { employee_id: employeeId, date: dateStr },
    });

    if (existingRecord && existingRecord.check_in_time) {
      throw new AppError('Already punched in today', 400);
    }

    // Get employee's office for geo-fencing
    const employee = await Employee.findByPk(employeeId, { include: ['office'] });
    if (!employee || !employee.office) {
      throw new AppError('Office location not configured for your account', 400);
    }

    // Geo-fence check
    const distance = this._calculateDistance(
      latitude, longitude,
      employee.office.latitude, employee.office.longitude
    );

    if (distance > employee.office.radius_meters) {
      throw new AppError(`You are outside the office perimeter (${Math.round(distance)}m away). Office radius: ${employee.office.radius_meters}m`, 403);
    }

    // Determine status and late arrival using shift_start_time (default 10:00 AM = 600 mins)
    const localCheckInMins = getLocalMinutesFromMidnight(today);
    const shiftStartMins = timeStringToMinutes(employee.shift_start_time, 600); // default 10:00 AM = 600 mins
    const shiftEndMins = timeStringToMinutes(employee.shift_end_time, 1080); // default 6:00 PM = 1080 mins

    // Enforce allowed punch-in window (2 hours before shift start until shift end)
    const allowedStart = shiftStartMins - 120;
    const allowedEnd = shiftEndMins;

    let isWithinWindow = false;
    if (allowedStart < 0) {
      isWithinWindow = (localCheckInMins >= (allowedStart + 1440)) || (localCheckInMins <= allowedEnd);
    } else {
      isWithinWindow = (localCheckInMins >= allowedStart) && (localCheckInMins <= allowedEnd);
    }

    if (env.NODE_ENV && env.NODE_ENV.trim() === 'development') {
      isWithinWindow = true;
    }

    if (!isWithinWindow) {
      throw new AppError(`Punch in is only allowed during shift hours (from ${_formatTime(employee.shift_start_time || '10:00:00')} to ${_formatTime(employee.shift_end_time || '18:00:00')} with 2 hours early buffer).`, 403);
    }

    const isLate = localCheckInMins > shiftStartMins;
    const lateByMinutes = isLate ? (localCheckInMins - shiftStartMins) : 0;
    const status = isLate ? 'late' : 'present';

    const record = await AttendanceRecord.create({
      employee_id: employeeId,
      date: dateStr,
      status,
      check_in_time: today,
      check_in_distance: distance,
      late_by_minutes: lateByMinutes,
      check_in_latitude: latitude,
      check_in_longitude: longitude,
      check_in_method: 'web',
    });

    logger.info(`Employee ${employee.emp_code} punched in at ${today.toISOString()}`);

    return {
      id: record.id,
      date: record.date,
      check_in_time: record.check_in_time,
      status: record.status,
      late_by_minutes: record.late_by_minutes,
      distance: Math.round(distance),
    };
  }

  async punchOut(employeeId, latitude, longitude) {
    const today = new Date();
    const dateStr = getLocalDateString(today);

    const record = await AttendanceRecord.findOne({
      where: { employee_id: employeeId, date: dateStr },
    });

    if (!record || !record.check_in_time) {
      throw new AppError('You have not punched in today', 400);
    }

    if (record.check_out_time) {
      throw new AppError('Already punched out today', 400);
    }

    // Geo-fence check for punch out
    const employee = await Employee.findByPk(employeeId, { include: ['office'] });
    let distance = null;
    if (employee && employee.office) {
      distance = this._calculateDistance(
        latitude, longitude,
        employee.office.latitude, employee.office.longitude
      );
    }

    let checkInTime = null;
    if (typeof record.check_in_time === 'string') {
      checkInTime = new Date(`${record.date}T${record.check_in_time}Z`);
      if (checkInTime > today) {
        checkInTime.setUTCDate(checkInTime.getUTCDate() - 1);
      }
    } else if (record.check_in_time instanceof Date) {
      checkInTime = record.check_in_time;
    } else {
      checkInTime = new Date(record.check_in_time);
    }
    const totalMinutes = Math.floor((today - checkInTime) / 60000);
    const totalHours = totalMinutes > 0 ? (totalMinutes / 60) : 0; // use decimal hours matching DECIMAL(4,2)
    const remainingMinutes = totalMinutes % 60;

    // Check for early exit and overtime using shift_end_time
    const localCheckOutMins = getLocalMinutesFromMidnight(today);
    const shiftEndMins = timeStringToMinutes(employee ? employee.shift_end_time : null, 1080); // default 6:00 PM = 1080 mins

    const isEarlyExit = localCheckOutMins < shiftEndMins;
    const earlyExitMinutes = isEarlyExit ? (shiftEndMins - localCheckOutMins) : 0;

    // Update status if half day
    let status = record.status;
    if (totalMinutes < 240) { // Less than 4 hours = half day
      status = 'half_day';
    }

    // Calculate overtime (minutes past shift end)
    let overtimeMinutes = 0;
    if (localCheckOutMins > shiftEndMins) {
      overtimeMinutes = localCheckOutMins - shiftEndMins;
    }

    await record.update({
      check_out_time: today,
      check_out_distance: distance,
      total_hours: totalHours,
      total_minutes: totalMinutes,
      early_exit_minutes: earlyExitMinutes,
      status,
      check_out_latitude: latitude,
      check_out_longitude: longitude,
      overtime_minutes: overtimeMinutes,
    });

    // Update monthly attendance
    await this._updateMonthlyAttendance(employeeId, dateStr);

    logger.info(`Employee ${employee ? employee.emp_code : employeeId} punched out at ${today.toISOString()} — OT: ${overtimeMinutes}min`);

    return {
      id: record.id,
      date: record.date,
      check_in_time: record.check_in_time,
      check_out_time: record.check_out_time,
      total_hours: totalHours,
      total_minutes: totalMinutes,
      status,
      early_exit_minutes: earlyExitMinutes,
    };
  }

  async getTodayStatus(employeeId) {
    const today = new Date();
    const dateStr = getLocalDateString(today);
    const record = await AttendanceRecord.findOne({
      where: { employee_id: employeeId, date: dateStr },
    });

    const employee = await Employee.findByPk(employeeId);
    
    // Shift calculations (default 10:00 AM - 6:00 PM)
    const localMins = getLocalMinutesFromMidnight(today);
    const shiftStartMins = timeStringToMinutes(employee ? employee.shift_start_time : null, 600); // 10:00 AM = 600 mins
    const shiftEndMins = timeStringToMinutes(employee ? employee.shift_end_time : null, 1080); // 6:00 PM = 1080 mins

    const allowedStart = shiftStartMins - 120; // 2 hour early buffer
    const allowedEnd = shiftEndMins;

    let isWithinWindow = false;
    if (allowedStart < 0) {
      isWithinWindow = (localMins >= (allowedStart + 1440)) || (localMins <= allowedEnd);
    } else {
      isWithinWindow = (localMins >= allowedStart) && (localMins <= allowedEnd);
    }

    if (env.NODE_ENV && env.NODE_ENV.trim() === 'development') {
      isWithinWindow = true;
    }

    const isPunchedIn = !!(record && record.check_in_time && !record.check_out_time);
    const isPunchedOut = !!(record && record.check_out_time);

    // Punch in is allowed if within the shift window
    const isPunchInAllowed = isWithinWindow;
    const isPunchOutAllowed = true;

    return {
      date: dateStr,
      isPunchedIn,
      isPunchedOut,
      isPunchInAllowed,
      isPunchOutAllowed,
      record: record || null,
    };
  }

  async getMonthlyAttendance(employeeId, month, year) {
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;

    const monthlyRecord = await MonthlyAttendance.findOne({
      where: {
        employee_id: employeeId,
        month: currentMonth,
        year: currentYear,
      },
    });

    const lastDay = new Date(currentYear, currentMonth, 0).getDate();

    const dailyRecords = await AttendanceRecord.findAll({
      where: {
        employee_id: employeeId,
        date: {
          [Op.between]: [
            `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`,
            `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
          ],
        },
      },
      order: [['date', 'ASC']],
    });

    return {
      monthly: monthlyRecord,
      daily: dailyRecords,
    };
  }

  async getAttendanceHistory(employeeId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const { rows, count } = await AttendanceRecord.findAndCountAll({
      where: { employee_id: employeeId },
      order: [['date', 'DESC']],
      limit,
      offset,
    });

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  async getTeamAttendance(managerId, date) {
    const dateStr = date || getLocalDateString(new Date());

    // Get employees under this manager's department
    const manager = await Employee.findByPk(managerId);
    if (!manager) {
      throw new AppError('Manager not found', 404);
    }

    const teamMembers = await Employee.findAll({
      where: { department: manager.department, status: 'active' },
      attributes: ['id', 'emp_code', 'name', 'designation', 'profile_image'],
    });

    const teamIds = teamMembers.map(e => e.id);

    const attendanceRecords = await AttendanceRecord.findAll({
      where: { employee_id: { [Op.in]: teamIds }, date: dateStr },
    });

    // Map attendance to team members
    const result = teamMembers.map(member => {
      const record = attendanceRecords.find(r => r.employee_id === member.id);
      return {
        ...member.toJSON(),
        attendance: record || null,
      };
    });

    return result;
  }

  async overrideAttendance(recordId, overrideData, adminId) {
    const record = await AttendanceRecord.findByPk(recordId);
    if (!record) {
      throw new AppError('Attendance record not found', 404);
    }

    await record.update({
      ...overrideData,
      remarks: `Overridden by admin ID ${adminId}: ${overrideData.remarks || 'No reason provided'}`,
    });

    // Recalculate monthly attendance
    await this._updateMonthlyAttendance(record.employee_id, record.date);

    logger.info(`Attendance record ${recordId} overridden by admin ${adminId}`);
    return record;
  }

  // Admin: Get today's attendance for all employees (Live Status tab)
  async getLiveAttendance({ office_id, company_id, search, status: statusFilter, page = 1, limit = 8 } = {}) {
    const today = getLocalDateString(new Date());

    // Build employee where clause
    const empWhere = { status: 'active' };
    if (search) {
      empWhere[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { emp_code: { [Op.like]: `%${search}%` } },
      ];
    }
    if (office_id) empWhere.office_id = office_id;
    if (company_id) empWhere.company_id = company_id;

    const { rows: employees, count: totalEmployees } = await Employee.findAndCountAll({
      where: empWhere,
      include: ['office', 'company'],
      attributes: ['id', 'emp_code', 'name', 'designation', 'profile_image'],
    });

    const empIds = employees.map(e => e.id);
    const todayRecords = await AttendanceRecord.findAll({
      where: { employee_id: { [Op.in]: empIds }, date: today },
    });

    // Device name mapping for frontend display
    const deviceLabel = (method) => {
      const map = { biometric: 'Biometric', gps: 'GPS/Mobile', manual: 'Manual', qr_code: 'QR Code', web: 'Web App' };
      return map[method] || 'Web App';
    };

    // Build stats
    const recordMap = new Map(todayRecords.map(r => [r.employee_id, r]));
    let presentCount = 0, absentCount = 0, lateCount = 0;

    const rows = employees.map(emp => {
      const record = recordMap.get(emp.id);
      let status = 'Absent';
      let punchIn = null, punchOut = null, hours = '0h', overtime = '---', distance = '---', lateFine = 0;
      let device = '---', remarks = '', checkInLat = null, checkInLon = null;

      if (record) {
        if (record.status === 'present') { status = 'Present'; presentCount++; }
        else if (record.status === 'late') { status = 'Late'; lateCount++; presentCount++; }
        else if (record.status === 'half_day') { status = 'Half Day'; presentCount++; }
        else { status = 'Absent'; absentCount++; }

        punchIn = record.check_in_time;
        punchOut = record.check_out_time;
        if (record.total_hours) hours = `${Math.floor(record.total_hours)}h ${Math.round((record.total_hours % 1) * 60)}m`;
        if (record.late_by_minutes > 0) lateFine = record.late_by_minutes * 2;
        if (record.check_in_distance) distance = `${Math.round(record.check_in_distance)}m`;
        device = deviceLabel(record.check_in_method);
        remarks = record.remarks || '';
        if (record.overtime_minutes > 0) {
          const otH = Math.floor(record.overtime_minutes / 60);
          const otM = record.overtime_minutes % 60;
          overtime = otH > 0 ? `${otH}h ${otM}m` : `${otM}m`;
        }
        checkInLat = record.check_in_latitude;
        checkInLon = record.check_in_longitude;
      } else {
        absentCount++;
      }

      return {
        id: emp.emp_code,
        name: emp.name,
        designation: emp.designation || '',
        status,
        punchIn: punchIn ? _formatTime(punchIn) : '---',
        punchOut: punchOut ? _formatTime(punchOut) : '---',
        location: emp.office?.name || '---',
        company: emp.company?.name || '---',
        distance,
        device,
        shift: 'General',
        hours: record?.check_out_time ? hours : (record?.check_in_time ? 'Ongoing' : '0h'),
        overtime,
        remarks: record?.remarks || null,
        lateFine,
        checkInLatitude: checkInLat,
        checkInLongitude: checkInLon,
        employee_id: emp.id,
        record_id: record?.id || null,
        // Office geo-fence data for map circle overlay
        officeLatitude: emp.office?.latitude || null,
        officeLongitude: emp.office?.longitude || null,
        officeRadius: emp.office?.radius_meters || 200,
      };
    });

    // Apply status filter
    const filteredRows = statusFilter && statusFilter !== 'All'
      ? rows.filter(r => r.status === statusFilter)
      : rows;

    // Paginate
    const offset = (page - 1) * limit;
    const paginatedRows = filteredRows.slice(offset, offset + limit);

    return {
      stats: {
        total: totalEmployees,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
      },
      rows: paginatedRows,
      pagination: {
        page,
        limit,
        total: filteredRows.length,
        totalPages: Math.ceil(filteredRows.length / limit),
      },
    };
  }

  // Admin: Get all attendance history (History tab)
  async getAllAttendanceHistory({ page = 1, limit = 20, from, to, office_id, company_id, search } = {}) {
    const where = {};
    if (from && to) {
      where.date = { [Op.between]: [from, to] };
    } else if (from) {
      where.date = { [Op.gte]: from };
    } else if (to) {
      where.date = { [Op.lte]: to };
    }

    const empWhere = { status: 'active' };
    if (search) {
      empWhere[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { emp_code: { [Op.like]: `%${search}%` } },
      ];
    }
    if (office_id) empWhere.office_id = office_id;
    if (company_id) empWhere.company_id = company_id;

    // Device name mapping for frontend display
    const deviceLabel = (method) => {
      const map = { biometric: 'Biometric', gps: 'GPS/Mobile', manual: 'Manual', qr_code: 'QR Code', web: 'Web App' };
      return map[method] || 'Web App';
    };

    // Get employees first
    const allEmployees = await Employee.findAll({ where: empWhere, include: ['office', 'company'], attributes: ['id', 'emp_code', 'name'] });
    const empIds = allEmployees.map(e => e.id);
    const empMap = new Map(allEmployees.map(e => [e.id, e]));
    const officeMap = new Map(allEmployees.map(e => [e.id, e.office]));

    if (empIds.length === 0) {
      return { rows: [], pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 } };
    }

    where.employee_id = { [Op.in]: empIds };

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows, count } = await AttendanceRecord.findAndCountAll({
      where,
      order: [['date', 'DESC'], ['check_in_time', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    const historyRows = rows.map(r => {
      const emp = empMap.get(r.employee_id);
      const office = officeMap.get(r.employee_id);
      let status = 'Present';
      if (r.status === 'absent') status = 'Absent';
      else if (r.status === 'late') status = 'Late';
      else if (r.status === 'half_day') status = 'Half Day';

      // Format overtime
      let overtimeStr = '---';
      if (r.overtime_minutes > 0) {
        const otH = Math.floor(r.overtime_minutes / 60);
        const otM = r.overtime_minutes % 60;
        overtimeStr = otH > 0 ? `${otH}h ${otM}m` : `${otM}m`;
      }

      return {
        date: r.date,
        name: emp?.name || 'Unknown',
        id: emp?.emp_code || '-',
        hub: office?.name || '---',
        company: emp?.company?.name || '---',
        shift: 'General',
        hours: r.total_hours ? `${Math.floor(r.total_hours)}h ${Math.round((r.total_hours % 1) * 60)}m` : '---',
        ot: overtimeStr,
        status,
        in: r.check_in_time ? _formatTime(r.check_in_time) : '---',
        out: r.check_out_time ? _formatTime(r.check_out_time) : '---',
        device: deviceLabel(r.check_in_method),
        fine: r.late_by_minutes > 0 ? r.late_by_minutes * 2 : 0,
        dist: r.check_in_distance ? `${Math.round(r.check_in_distance)}m` : '---',
        record_id: r.id,
        remarks: r.remarks || null,
      };
    });

    // Compute stats from ALL matching records (not just paginated slice)
    const allRecords = await AttendanceRecord.findAll({
      where: { employee_id: { [Op.in]: empIds }, ...(from && to ? { date: { [Op.between]: [from, to] } } : from ? { date: { [Op.gte]: from } } : to ? { date: { [Op.lte]: to } } : {}) },
      attributes: ['status', 'total_hours', 'total_minutes', 'late_by_minutes', 'overtime_minutes'],
    });

    const totalRecords = allRecords.length;
    const presentRecords = allRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const lateRecords = allRecords.filter(r => r.status === 'late').length;
    const absentRecords = allRecords.filter(r => r.status === 'absent').length;
    const totalWorkHours = allRecords.reduce((sum, r) => sum + (r.total_hours || 0), 0);
    const totalOvertimeMinutes = allRecords.reduce((sum, r) => sum + (r.overtime_minutes || 0), 0);
    const avgAttendance = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;

    return {
      rows: historyRows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count, totalPages: Math.ceil(count / parseInt(limit)) },
      stats: {
        avgAttendance,
        totalRecords,
        presentRecords,
        lateRecords,
        absentRecords,
        totalWorkHours: Math.round(totalWorkHours),
        totalOvertimeHours: Math.round(totalOvertimeMinutes / 60),
        activeEmployees: empIds.length,
      },
    };
  }

  // Admin: Get monthly attendance grid for all employees
  async getAllMonthlyAttendance({ month, year, office_id, company_id, search } = {}) {
    const localToday = getLocalDate(new Date());
    const currentMonth = month ? parseInt(month) : localToday.getMonth() + 1;
    const currentYear = year ? parseInt(year) : localToday.getFullYear();

    const empWhere = { status: 'active' };
    if (search) {
      empWhere[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { emp_code: { [Op.like]: `%${search}%` } },
      ];
    }
    if (office_id) empWhere.office_id = office_id;
    if (company_id) empWhere.company_id = company_id;

    const employees = await Employee.findAll({
      where: empWhere,
      include: ['office', 'company'],
      attributes: ['id', 'emp_code', 'name', 'designation', 'fixed_gross'],
    });

    const empIds = employees.map(e => e.id);
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    // Get all daily records for these employees in the month
    const dailyRecords = await AttendanceRecord.findAll({
      where: {
        employee_id: { [Op.in]: empIds },
        date: {
          [Op.between]: [
            `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`,
            `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`,
          ],
        },
      },
      order: [['date', 'ASC']],
    });

    // Get monthly summaries
    const monthlySummaries = await MonthlyAttendance.findAll({
      where: { employee_id: { [Op.in]: empIds }, month: currentMonth, year: currentYear },
    });

    const monthlyMap = new Map(monthlySummaries.map(m => [m.employee_id, m]));

    // Map records by employee and date
    const recordMap = new Map();
    dailyRecords.forEach(r => {
      if (!recordMap.has(r.employee_id)) recordMap.set(r.employee_id, new Map());
      recordMap.get(r.employee_id).set(r.date, r);
    });

    const rows = employees.map(emp => {
      const empRecords = recordMap.get(emp.id) || new Map();
      const monthly = monthlyMap.get(emp.id);

      const salary = emp.fixed_gross || 0;
      const dailyRate = daysInMonth > 0 ? Math.round(salary / daysInMonth) : 0;

      // Build daily grid string
      let grid = '';
      let presentCount = 0, absentCount = 0, woffCount = 0, leaveCount = 0, holidayCount = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dateObj = new Date(currentYear, currentMonth - 1, d);
        const dayOfWeek = dateObj.getDay();

        const record = empRecords.get(dateStr);
        if (record) {
          if (record.status === 'present' || record.status === 'late') {
            grid += 'P'; presentCount++;
          } else if (record.status === 'half_day') {
            grid += 'P'; presentCount++; // treat half day as present for grid
          } else if (record.status === 'absent') {
            grid += 'A'; absentCount++;
          } else if (record.status === 'holiday') {
            grid += 'H'; holidayCount++;
          } else if (record.status === 'weekend') {
            grid += 'W'; woffCount++;
          } else {
            grid += 'P'; presentCount++;
          }
        } else {
          if (dayOfWeek === 0) { // Sunday
            grid += 'W'; woffCount++;
          } else {
            grid += 'A'; absentCount++;
          }
        }
      }

      // Use monthly data if available for counts
      const p = monthly ? monthly.present_days : presentCount;
      const a = monthly ? monthly.absent_days : absentCount;
      const w = monthly ? (monthly.weekend_days || 0) : woffCount;
      const l = monthly ? monthly.half_days : 0;
      const h = monthly ? (monthly.holiday_days || 0) : holidayCount;

      return {
        id: emp.emp_code,
        name: emp.name,
        role: emp.designation || 'Employee',
        hub: emp.office?.name || '---',
        company: emp.company?.name || '---',
        salary,
        present: p + l, // present includes half days for display
        woff: w,
        leave: l,
        holiday: h,
        absent: a,
        grid,
        employee_id: emp.id,
      };
    });

    return {
      month: currentMonth,
      year: currentYear,
      daysInMonth,
      rows,
    };
  }

  // Admin: Manual attendance entry
  async manualEntry(adminId, { employeeId, date, status, reason }) {
    const emp = await Employee.findOne({ where: { emp_code: employeeId, status: 'active' } });
    if (!emp) {
      throw new AppError(`Employee with code ${employeeId} not found or inactive`, 404);
    }

    // Handle both ISO string (from raw request) and Date object (from Joi convert)
    const dateStr = date instanceof Date
      ? date.toISOString().split('T')[0]
      : (date || getLocalDateString(new Date()));
    const statusMap = { 'Present': 'present', 'Absent': 'absent', 'Half Day': 'half_day' };
    const recordStatus = statusMap[status] || 'present';

    // Build timestamps for Present / Half Day entries so they show meaningful in/out times
    let checkInTime = null;
    let checkOutTime = null;
    let totalHours = null;
    let totalMinutes = 0;

    const shiftStartTimeStr = emp.shift_start_time || '10:00:00';
    const shiftEndTimeStr = emp.shift_end_time || '18:00:00';

    if (recordStatus === 'present') {
      checkInTime = createTzDate(dateStr, shiftStartTimeStr);
      checkOutTime = createTzDate(dateStr, shiftEndTimeStr);
      
      const startMins = timeStringToMinutes(shiftStartTimeStr, 600);
      const endMins = timeStringToMinutes(shiftEndTimeStr, 1080);
      totalMinutes = endMins - startMins;
      totalHours = totalMinutes / 60;
    } else if (recordStatus === 'half_day') {
      checkInTime = createTzDate(dateStr, shiftStartTimeStr);
      
      const startMins = timeStringToMinutes(shiftStartTimeStr, 600);
      const endMins = timeStringToMinutes(shiftEndTimeStr, 1080);
      const halfDuration = Math.round((endMins - startMins) / 2);
      const halfEndMins = startMins + halfDuration;
      
      const halfEndHours = Math.floor(halfEndMins / 60);
      const halfEndMinsRemainder = halfEndMins % 60;
      const halfEndTimeStr = `${String(halfEndHours).padStart(2, '0')}:${String(halfEndMinsRemainder).padStart(2, '0')}:00`;
      
      checkOutTime = createTzDate(dateStr, halfEndTimeStr);
      totalMinutes = halfDuration;
      totalHours = totalMinutes / 60;
    }

    // Check if record already exists for this date
    let record = await AttendanceRecord.findOne({ where: { employee_id: emp.id, date: dateStr } });

    if (record) {
      await record.update({
        status: recordStatus,
        check_in_time: checkInTime || record.check_in_time,
        check_out_time: checkOutTime || record.check_out_time,
        total_hours: totalHours !== null ? totalHours : record.total_hours,
        total_minutes: totalMinutes || record.total_minutes,
        check_in_method: record.check_in_method || 'manual',
        remarks: `Manual entry by admin ${adminId}: ${reason || 'No reason provided'}`,
      });
    } else {
      record = await AttendanceRecord.create({
        employee_id: emp.id,
        date: dateStr,
        status: recordStatus,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        total_hours: totalHours,
        total_minutes: totalMinutes,
        late_by_minutes: 0,
        early_exit_minutes: 0,
        overtime_minutes: 0,
        check_in_method: 'manual',
        remarks: `Manual entry by admin ${adminId}: ${reason || 'No reason provided'}`,
      });
    }

    // Recalculate monthly
    await this._updateMonthlyAttendance(emp.id, dateStr);

    logger.info(`Admin ${adminId} manually set attendance for ${employeeId} on ${dateStr} to ${recordStatus}`);
    return record;
  }

  // Private: Calculate distance between two coordinates (Haversine formula)
  _calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = this._toRad(lat2 - lat1);
    const dLon = this._toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _toRad(deg) {
    return deg * (Math.PI / 180);
  }

  // Private: Update monthly attendance summary
  async _updateMonthlyAttendance(employeeId, dateStr) {
    const [year, month] = dateStr.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate(); // correct last day of month (28/29/30/31)

    const records = await AttendanceRecord.findAll({
      where: {
        employee_id: employeeId,
        date: {
          [Op.between]: [
            `${year}-${String(month).padStart(2, '0')}-01`,
            `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
          ],
        },
      },
    });

    const presentDays = records.filter(r => r.status === 'present').length;
    const lateDays = records.filter(r => r.status === 'late').length;
    const halfDays = records.filter(r => r.status === 'half_day').length;
    const absentDays = records.filter(r => r.status === 'absent').length;

    // Calculate working days (excluding weekends - Sat/Sun)
    const totalWorkingDays = this._getWorkingDaysInMonth(year, month);
    const attendancePercentage = totalWorkingDays > 0
      ? Math.round(((presentDays + lateDays + halfDays * 0.5) / totalWorkingDays) * 100)
      : 0;

    await MonthlyAttendance.upsert({
      employee_id: employeeId,
      month,
      year,
      present_days: presentDays,
      absent_days: absentDays,
      late_days: lateDays,
      half_days: halfDays,
      total_working_days: totalWorkingDays,
      attendance_percentage: attendancePercentage,
    });
  }

  _getWorkingDaysInMonth(year, month) {
    let count = 0;
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month - 1, day);
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
    }
    return count;
  }
}

module.exports = new AttendanceService();