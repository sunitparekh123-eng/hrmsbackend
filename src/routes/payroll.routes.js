const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, selfOrAdmin } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  payslipQuerySchema,
  updateEntrySchema,
  updateEntryStatusSchema,
  disburseSchema,
  historyQuerySchema,
} = require('../validators/payroll.validator');
const payrollController = require('../controllers/payroll.controller');
const payrollLedgerController = require('../controllers/payroll_ledger.controller');

// All routes require authentication
router.use(authenticate);

// ── Legacy payslip routes ──
router.get('/payslips', payrollController.getMyPayslips);
router.get('/payslips/:id/download', payrollController.downloadPayslipPdf);
router.get('/payslips/:id', payrollController.getPayslipById);
router.get('/current', payrollController.getCurrentPayslip);

// Admin/HR — legacy payslip
router.get('/employee/:employeeId', selfOrAdmin(), validate(payslipQuerySchema, 'query'), payrollController.getEmployeePayslips);
router.post('/generate', authorize('admin', 'hr'), payrollController.generatePayslips);
router.patch('/payslips/:id/mark-paid', authorize('admin', 'hr'), payrollController.markPayslipPaid);

// ── Payroll ledger routes (new) ──

// GET /payroll/ledger — current-cycle ledger with full calculations
router.get('/ledger', authorize('admin', 'hr', 'manager'), payrollLedgerController.getCurrentLedger);

// GET /payroll/ledger/:cycleId — specific cycle
router.get('/ledger/:cycleId', authorize('admin', 'hr', 'manager'), payrollLedgerController.getLedgerByCycleId);

// GET /payroll/history — past cycles summary
router.get('/history', authorize('admin', 'hr', 'manager'), validate(historyQuerySchema, 'query'), payrollLedgerController.getCycleHistory);

// PATCH /payroll/entry/:entryId — update single entry
router.patch('/entry/:entryId', authorize('admin', 'hr'), validate(updateEntrySchema, 'body'), payrollLedgerController.updateEntry);

// PATCH /payroll/entry/:entryId/status — change entry status
router.patch('/entry/:entryId/status', authorize('admin', 'hr'), validate(updateEntryStatusSchema, 'body'), payrollLedgerController.updateEntryStatus);

// POST /payroll/disburse/:cycleId — disburse entire cycle
router.post('/disburse/:cycleId', authorize('admin', 'hr'), validate(disburseSchema, 'body'), payrollLedgerController.disburseCycle);

module.exports = router;