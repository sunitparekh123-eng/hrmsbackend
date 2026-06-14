const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const attendanceRoutes = require('./attendance.routes');
const leaveRoutes = require('./leave.routes');
const payrollRoutes = require('./payroll.routes');
const loanRoutes = require('./loan.routes');
const performanceRoutes = require('./performance.routes');
const employeeRoutes = require('./employee.routes');
const documentRoutes = require('./document.routes');
const letterRoutes = require('./letter.routes');
const notificationRoutes = require('./notification.routes');
const dashboardRoutes = require('./dashboard.routes');
const companyRoutes = require('./company.routes');
const officeRoutes = require('./office.routes');
const configRoutes = require('./config.routes');

// Health check is already in app.js at root level
// API routes mounted at /api in app.js

router.use('/auth', authRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/leave', leaveRoutes);
router.use('/payroll', payrollRoutes);
router.use('/loans', loanRoutes);
router.use('/performance', performanceRoutes);
router.use('/employees', employeeRoutes);
router.use('/documents', documentRoutes);
router.use('/letters', letterRoutes);
router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/companies', companyRoutes);
router.use('/offices', officeRoutes);
router.use('/config', configRoutes);

module.exports = router;