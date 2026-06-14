const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, selfOrAdmin } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { applyLoanSchema, loanQuerySchema } = require('../validators/loan.validator');
const loanController = require('../controllers/loan.controller');

// All routes require authentication
router.use(authenticate);

// Employee routes
router.get('/my', loanController.getMyLoans);
router.get('/my/:id', loanController.getLoanById);
router.get('/my/:id/payments', loanController.getLoanPayments);
router.post('/apply', validate(applyLoanSchema), loanController.applyLoan);

// Admin/HR routes
router.get('/', authorize('admin', 'hr'), validate(loanQuerySchema, 'query'), loanController.getAllLoans);
router.get('/employee/:employeeId', selfOrAdmin(), loanController.getEmployeeLoans);
router.get('/:id', authorize('admin', 'hr'), loanController.getLoanByIdAdmin);
router.patch('/:id/approve', authorize('admin', 'hr'), loanController.approveLoan);
router.patch('/:id/reject', authorize('admin', 'hr'), loanController.rejectLoan);
router.post('/:id/payment', authorize('admin', 'hr'), loanController.recordLoanPayment);

module.exports = router;