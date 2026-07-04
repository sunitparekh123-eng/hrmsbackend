const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, selfOrAdmin } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { punchInSchema, punchOutSchema, monthlyQuerySchema, manualEntrySchema, adminLiveQuerySchema, adminHistoryQuerySchema, adminMonthlyQuerySchema, markTourSchema, tourListQuerySchema, cancelTourSchema } = require('../validators/attendance.validator');
const attendanceController = require('../controllers/attendance.controller');

// All routes require authentication
router.use(authenticate);

// Employee routes
router.post('/punch-in', validate(punchInSchema), attendanceController.punchIn);
router.post('/punch-out', validate(punchOutSchema), attendanceController.punchOut);
router.get('/today', attendanceController.getTodayStatus);
router.get('/monthly', validate(monthlyQuerySchema, 'query'), attendanceController.getMonthlyAttendance);
router.get('/history', attendanceController.getAttendanceHistory);

// Admin/HR/Manager routes
router.get('/employee/:employeeId', selfOrAdmin(), attendanceController.getEmployeeAttendance);
router.get('/team', authorize('admin', 'hr', 'manager'), attendanceController.getTeamAttendance);
router.patch('/override/:id', authorize('admin', 'hr'), attendanceController.overrideAttendance);

// Admin: Full attendance management
router.get('/admin/live', authorize('admin', 'hr'), validate(adminLiveQuerySchema, 'query'), attendanceController.getLiveAttendance);
router.get('/admin/history-all', authorize('admin', 'hr'), validate(adminHistoryQuerySchema, 'query'), attendanceController.getAllAttendanceHistory);
router.get('/admin/monthly-all', authorize('admin', 'hr'), validate(adminMonthlyQuerySchema, 'query'), attendanceController.getAllMonthlyAttendance);
router.post('/admin/manual-entry', authorize('admin', 'hr'), validate(manualEntrySchema), attendanceController.manualEntry);

// ── Tour management routes ──
// Admin/HR: Mark an employee on tour (creates tour + attendance records)
router.post('/admin/tours', authorize('admin', 'hr'), validate(markTourSchema), attendanceController.markTour);
// Admin/HR: Get all tours (paginated + filters)
router.get('/admin/tours', authorize('admin', 'hr'), validate(tourListQuerySchema, 'query'), attendanceController.getAllTours);
// Admin/HR: Get a single tour by ID (with attendance records)
router.get('/admin/tours/:id', authorize('admin', 'hr'), attendanceController.getTourById);
// Admin/HR: Cancel a tour (past days → absent, future days → deleted)
router.patch('/admin/tours/:id/cancel', authorize('admin', 'hr'), validate(cancelTourSchema), attendanceController.cancelTour);

// Employee: Check if currently on tour (mobile app punch screen)
router.get('/tour-status', attendanceController.getTourStatus);

module.exports = router;