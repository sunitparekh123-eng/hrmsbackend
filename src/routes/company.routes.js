const express = require('express');
const router = express.Router();
const companyController = require('../controllers/company.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

// All authenticated users can view companies
router.get('/', authenticate, companyController.getCompanies);
router.get('/:id', authenticate, companyController.getCompanyById);

// Admin & HR can create/update/delete companies
router.post('/', authenticate, authorize('admin', 'hr'), companyController.createCompany);
router.put('/:id', authenticate, authorize('admin', 'hr'), companyController.updateCompany);
router.delete('/:id', authenticate, authorize('admin'), companyController.deleteCompany);

module.exports = router;