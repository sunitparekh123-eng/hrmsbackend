const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, selfOrAdmin } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { applyLeaveSchema, approveLeaveSchema, leaveQuerySchema, grantLeaveSchema } = require('../validators/leave.validator');
const leaveController = require('../controllers/leave.controller');

// All routes require authentication
router.use(authenticate);

// Employee routes
router.get('/balance', leaveController.getLeaveBalance);
router.get('/balance/:employeeId', selfOrAdmin(), leaveController.getLeaveBalance);
router.post('/apply', validate(applyLeaveSchema), leaveController.applyLeave);
router.get('/my-requests', leaveController.getMyLeaveRequests);
router.patch('/cancel/:id', leaveController.cancelLeaveRequest);

// Admin/HR/Manager routes
router.get('/requests', authorize('admin', 'hr', 'manager'), validate(leaveQuerySchema, 'query'), leaveController.getAllLeaveRequests);
router.patch('/approve/:id', authorize('admin', 'hr', 'manager'), validate(approveLeaveSchema), leaveController.approveLeaveRequest);
router.get('/team', authorize('admin', 'hr', 'manager'), leaveController.getTeamLeaves);

// Admin-only: grant extra leaves
router.post('/grant', authorize('admin'), validate(grantLeaveSchema), leaveController.grantLeave);

// Departments list (for filters)
router.get('/departments', leaveController.getDepartments);

module.exports = router;