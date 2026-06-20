const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const holidayController = require('../controllers/holiday.controller');

// All routes require authentication
router.use(authenticate);

// All users can view holidays
router.get('/', holidayController.getAllHolidays);

// Admin/HR can manage holidays
router.post('/', authorize('admin', 'hr'), holidayController.createHoliday);
router.put('/:id', authorize('admin', 'hr'), holidayController.updateHoliday);
router.delete('/:id', authorize('admin', 'hr'), holidayController.deleteHoliday);
router.post('/fetch-calendar', authorize('admin', 'hr'), holidayController.seedCalendar);

module.exports = router;
