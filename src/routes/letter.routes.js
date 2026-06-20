const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, selfOrAdmin } = require('../middleware/role.middleware');
const letterController = require('../controllers/letter.controller');
const offerLetterController = require('../controllers/offer_letter.controller');
const letterTemplateController = require('../controllers/letter_template.controller');

// All routes require authentication
router.use(authenticate);

// ── Employee routes ──
router.get('/my', letterController.getMyLetters);
router.get('/my/:id', letterController.getLetterById);
router.patch('/my/:id/acknowledge', letterController.acknowledgeLetter);

// ── Admin/HR letter routes ──
router.get('/', authorize('admin', 'hr'), letterController.getAllLetters);
router.post('/issue', authorize('admin', 'hr'), letterController.issueLetter);
router.patch('/:id', authorize('admin', 'hr'), letterController.updateLetter);
router.delete('/:id', authorize('admin'), letterController.deleteLetter);

// ── Generate PDF & send email (Admin/HR) ──
router.get('/generate-pdf', authorize('admin', 'hr'), letterController.generateLetterPDF);
router.post('/generate-pdf', authorize('admin', 'hr'), letterController.generateLetterPDF);
router.post('/send-email', authorize('admin', 'hr'), letterController.sendLetterEmail);

// ── Offer letter specific routes (Admin/HR only) ──
router.get('/offer-letter/:employeeId/preview', authorize('admin', 'hr'), offerLetterController.previewOfferLetter);
router.post('/offer-letter/:employeeId/send', authorize('admin', 'hr'), offerLetterController.sendOfferLetter);

// ── Letter Template routes (Admin/HR) ──
router.get('/templates', authorize('admin', 'hr'), letterTemplateController.getTemplates);
router.get('/templates/all', authorize('admin', 'hr'), letterTemplateController.getAllTemplates);
router.get('/templates/preview', authorize('admin', 'hr'), letterTemplateController.previewTemplate);
router.post('/templates/preview', authorize('admin', 'hr'), letterTemplateController.previewTemplate);
router.get('/templates/:id', authorize('admin', 'hr'), letterTemplateController.getTemplateById);
router.post('/templates', authorize('admin', 'hr'), letterTemplateController.createTemplate);
router.post('/templates/seed', authorize('admin'), letterTemplateController.seedDefaultTemplates);
router.patch('/templates/:id', authorize('admin', 'hr'), letterTemplateController.updateTemplate);
router.delete('/templates/:id', authorize('admin'), letterTemplateController.deleteTemplate);

module.exports = router;