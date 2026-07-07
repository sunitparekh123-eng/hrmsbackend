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
router.get('/admin-governance', authorize('admin', 'hr'), dashboardController.getAdminGovernance);
router.get('/admin-compliance', authorize('admin', 'hr'), dashboardController.getAdminCompliance);
router.get('/admin-activity', authorize('admin', 'hr'), dashboardController.getAdminActivity);

module.exports = router;