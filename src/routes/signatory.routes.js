const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const signatoryController = require('../controllers/signatory.controller');

// Multer setup using memory storage for Cloudinary upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'), false);
    }
  },
});

// All routes require authentication
router.use(authenticate);

// Publicly readable by any authenticated user (e.g. HR using template generator)
router.get('/', signatoryController.getAllSignatories);

// Only admins or HR can manage signatories
router.post('/', authorize('admin', 'hr'), upload.single('signature'), signatoryController.createSignatory);
router.put('/:id', authorize('admin', 'hr'), upload.single('signature'), signatoryController.updateSignatory);
router.delete('/:id', authorize('admin', 'hr'), signatoryController.deleteSignatory);

module.exports = router;
