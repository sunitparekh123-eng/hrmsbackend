const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const dashboardController = require('../controllers/dashboard.controller');

// All routes require authentication
router.use(authenticate);

// Employee dashboard
router.get('/summary', dashboardController.getEmployeeSummary);
router.get('/stats', dashboardController.getEmployeeStats);

// Admin/HR dashboard
router.get('/admin-summary', authorize('admin', 'hr'), dashboardController.getAdminSummary);
router.get('/admin-stats', authorize('admin', 'hr'), dashboardController.getAdminStats);

module.exports = router;