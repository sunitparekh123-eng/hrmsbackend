const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, selfOrAdmin } = require('../middleware/role.middleware');
const letterController = require('../controllers/letter.controller');
const offerLetterController = require('../controllers/offer_letter.controller');

// All routes require authentication
router.use(authenticate);

// Employee routes
router.get('/my', letterController.getMyLetters);
router.get('/my/:id', letterController.getLetterById);
router.patch('/my/:id/acknowledge', letterController.acknowledgeLetter);

// Admin/HR routes
router.get('/', authorize('admin', 'hr'), letterController.getAllLetters);
router.post('/issue', authorize('admin', 'hr'), letterController.issueLetter);
router.patch('/:id', authorize('admin', 'hr'), letterController.updateLetter);
router.delete('/:id', authorize('admin'), letterController.deleteLetter);

// Offer letter specific routes (Admin/HR only)
router.get('/offer-letter/:employeeId/preview', authorize('admin', 'hr'), offerLetterController.previewOfferLetter);
router.post('/offer-letter/:employeeId/send', authorize('admin', 'hr'), offerLetterController.sendOfferLetter);

module.exports = router;