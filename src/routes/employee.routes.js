const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, selfOrAdmin } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { updateProfileSchema, employeeQuerySchema } = require('../validators/employee.validator');
const { salaryStructureSchema } = require('../validators/auth.validator');
const employeeController = require('../controllers/employee.controller');

// All routes require authentication
router.use(authenticate);

// Self routes
router.get('/profile', employeeController.getMyProfile);
router.patch('/profile', validate(updateProfileSchema), employeeController.updateMyProfile);

// Admin/HR routes
router.get('/', authorize('admin', 'hr'), validate(employeeQuerySchema, 'query'), employeeController.getAllEmployees);
router.get('/:id', selfOrAdmin(), employeeController.getEmployeeById);
router.patch('/:id', authorize('admin', 'hr'), employeeController.updateEmployee);
router.delete('/:id', authorize('admin'), employeeController.deleteEmployee);
router.patch('/:id/status', authorize('admin', 'hr'), employeeController.updateEmployeeStatus);
router.patch('/:id/role', authorize('admin'), employeeController.updateEmployeeRole);

// ── Admin Password Reset ──
router.put('/:id/admin-reset-password', authorize('admin', 'hr'), employeeController.adminResetPassword);

// ── Salary Structure routes ──
router.get('/:id/salary', authorize('admin', 'hr'), employeeController.getEmployeeSalary);
router.put('/:id/salary', authorize('admin', 'hr'), validate(salaryStructureSchema), employeeController.updateEmployeeSalary);

module.exports = router;