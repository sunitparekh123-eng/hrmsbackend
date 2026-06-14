const router = require('express').Router();
const officeController = require('../controllers/office.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createOfficeSchema, updateOfficeSchema, officeQuerySchema } = require('../validators/office.validator');

// All routes require authentication
router.use(authenticate);

// ── Read endpoints (any authenticated user can access) ──
router.get('/stats', officeController.getOfficeStats);
router.get('/', validate(officeQuerySchema, 'query'), officeController.getOffices);
router.get('/:id', officeController.getOfficeById);

// ── Management endpoints (admin & hr only) ──
router.post('/', authorize('admin', 'hr'), validate(createOfficeSchema), officeController.createOffice);
router.put('/:id', authorize('admin', 'hr'), validate(updateOfficeSchema), officeController.updateOffice);
router.delete('/:id', authorize('admin'), officeController.deleteOffice);

module.exports = router;