const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createClaimSchema, rejectClaimSchema } = require('../validators/tour_expense.validator');
const tourExpenseController = require('../controllers/tour_expense.controller');

// All routes are protected
router.use(authenticate);

// Claims routes
router.get('/', tourExpenseController.getAllClaims);
router.get('/policy', tourExpenseController.getPolicies);
router.put('/policy', authorize('admin'), tourExpenseController.updatePolicies);
router.post('/', validate(createClaimSchema), tourExpenseController.createClaim);
router.get('/:id', tourExpenseController.getClaimById);
router.post('/:id/approve', authorize('admin', 'hr'), tourExpenseController.approveClaim);
router.post('/:id/reject', authorize('admin', 'hr'), validate(rejectClaimSchema), tourExpenseController.rejectClaim);

module.exports = router;
