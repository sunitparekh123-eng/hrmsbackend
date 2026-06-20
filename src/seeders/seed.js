const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { sequelize, Office, Company, Employee, LeaveBalance, AttendanceRecord, LeaveRequest, Payslip, SalaryComponent, Loan, PerformanceObjective, PerformanceReview, Document, Letter, Notification, SalaryStructure, TourExpense, TourExpensePolicy, Holiday, SystemSetting } = require('../models');
const logger = require('../utils/logger');
const { getWeekendDays, getHolidaysInMonth, isHolidayDate } = require('../utils/payrollHelper');

const seed = async () => {
  try {
    logger.info('🌱 Starting database seeding...');

    // Drop tables in reverse dependency order, then re-create
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.sync({ force: true });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    logger.info('✅ Database synced (tables recreated)');

    // ──────────────────────────────────────────────
    // 1. COMPANIES (must seed first — FK dependency for offices & employees)
    // ──────────────────────────────────────────────
    const companies = await Company.bulkCreate([
      { name: 'BP Marketing', email: 'hr@bpmarketing.com', phone: '+91-9876543210', website: 'www.bpmarketing.com', city: 'Indore', state: 'MP', address: '12/3, MG Road, Vijay Nagar, Indore, MP 452010' },
      { name: 'Apaar Logistics', email: 'hr@apaar.com', phone: '+91-8888888888', website: 'www.apaarlogistics.com', city: 'Ratlam', state: 'MP', address: 'Plot 45, Transport Nagar, Ratlam, MP 457001' },
      { name: 'AE', email: 'careers@ae.com', phone: '+91-7777777777', website: 'www.ae.com', city: 'Noida', state: 'UP', address: 'Sector 5, Noida, UP 201301' },
      { name: 'PJ', email: 'info@pj.com', phone: '+91-6666666666', website: 'www.pj.com', city: 'Gurgaon', state: 'HR', address: 'Industrial Area, Phase 2, Gurgaon, HR 122018' },
    ]);
    logger.info(`✅ Created ${companies.length} companies`);

    // ──────────────────────────────────────────────
    // 2. OFFICES (with company_id FK + geo-fencing + contact info)
    // ──────────────────────────────────────────────
    const offices = await Office.bulkCreate([
      {
        company_id: 1,
        code: 'LOC-MUM',
        name: 'Head Office - Mumbai',
        address: 'Plot 42, Bandra Kurla Complex, Bandra East, Mumbai, Maharashtra 400051',
        city: 'Mumbai',
        state: 'Maharashtra',
        latitude: 19.0640,
        longitude: 72.8357,
        radius_meters: 300,
        contact_person: 'Rajesh Kumar',
        contact_phone: '9876543210',
        is_active: true,
      },
      {
        company_id: 2,
        code: 'LOC-BLR',
        name: 'Tech Park - Bengaluru',
        address: 'Outer Ring Road, Bellandur, Bengaluru, Karnataka 560103',
        city: 'Bengaluru',
        state: 'Karnataka',
        latitude: 12.9260,
        longitude: 77.6762,
        radius_meters: 250,
        contact_person: 'Amit Patel',
        contact_phone: '9876543212',
        is_active: true,
      },
      {
        company_id: 3,
        code: 'LOC-DEL',
        name: 'Development Center - Delhi',
        address: 'Delhi NCR',
        city: 'Delhi',
        state: 'Delhi',
        latitude: 28.728311,
        longitude: 77.245483,
        radius_meters: 200,
        contact_person: 'Priya Sharma',
        contact_phone: '9876543211',
        is_active: true,
      },
      {
        company_id: 4,
        code: 'LOC-GGN',
        name: 'Warehouse - Gurgaon',
        address: 'Sector 37, Industrial Area Phase 2, Gurgaon, Haryana 122018',
        city: 'Gurgaon',
        state: 'Haryana',
        latitude: 28.4595,
        longitude: 77.0266,
        radius_meters: 150,
        contact_person: 'Vikram Desai',
        contact_phone: '9876543214',
        is_active: true,
      },
    ]);
    logger.info(`✅ Created ${offices.length} offices`);

    // ──────────────────────────────────────────────
    // 3. EMPLOYEES (with company_id FK)
    // ──────────────────────────────────────────────
    const passwordHash = await bcrypt.hash('Password@123', 12);

    const employees = await Employee.bulkCreate([
      // Admins — company 1 (BP Marketing), office 1 (Mumbai)
      { emp_code: 'EMP001', name: 'Rajesh Kumar', email: 'rajesh.kumar@company.com', phone: '9876543210', password: passwordHash, designation: 'HR Director', department: 'Human Resources', role: 'admin', status: 'active', date_of_joining: '2018-03-15', date_of_birth: '1985-07-22', gender: 'male', company_id: 1, office_id: 1, is_first_login: false, basic_salary: 48000, fixed_gross: 120000 },
      { emp_code: 'EMP002', name: 'Priya Sharma', email: 'priya.sharma@company.com', phone: '9876543211', password: passwordHash, designation: 'HR Manager', department: 'Human Resources', role: 'hr', status: 'active', date_of_joining: '2019-06-01', date_of_birth: '1990-11-05', gender: 'female', company_id: 3, office_id: 3, is_first_login: false, basic_salary: 32000, fixed_gross: 80000 },
      // Managers — assigned across different companies
      { emp_code: 'EMP003', name: 'Amit Patel', email: 'amit.patel@company.com', phone: '9876543212', password: passwordHash, designation: 'Engineering Manager', department: 'Engineering', role: 'manager', status: 'active', date_of_joining: '2019-01-10', date_of_birth: '1988-03-14', gender: 'male', company_id: 2, office_id: 2, is_first_login: false, basic_salary: 38000, fixed_gross: 95000 },
      { emp_code: 'EMP004', name: 'Sneha Iyer', email: 'sneha.iyer@company.com', phone: '9876543213', password: passwordHash, designation: 'Product Manager', department: 'Product', role: 'manager', status: 'active', date_of_joining: '2020-02-20', date_of_birth: '1992-08-18', gender: 'female', company_id: 2, office_id: 2, is_first_login: false, basic_salary: 36000, fixed_gross: 90000 },
      { emp_code: 'EMP005', name: 'Vikram Desai', email: 'vikram.desai@company.com', phone: '9876543214', password: passwordHash, designation: 'Sales Manager', department: 'Sales', role: 'manager', status: 'active', date_of_joining: '2018-08-05', date_of_birth: '1987-12-30', gender: 'male', company_id: 4, office_id: 4, is_first_login: false, basic_salary: 34000, fixed_gross: 85000 },
      // Employees - Engineering — company 2 (Apaar), office 2 (Bengaluru)
      { emp_code: 'EMP006', name: 'Rahul Verma', email: 'rahul.verma@company.com', phone: '9876543215', password: passwordHash, designation: 'Senior Software Engineer', department: 'Engineering', role: 'employee', status: 'active', date_of_joining: '2020-04-12', date_of_birth: '1994-06-25', gender: 'male', company_id: 2, office_id: 2, is_first_login: false, basic_salary: 26000, fixed_gross: 65000 },
      { emp_code: 'EMP007', name: 'Ananya Gupta', email: 'ananya.gupta@company.com', phone: '9876543216', password: passwordHash, designation: 'Software Engineer', department: 'Engineering', role: 'employee', status: 'active', date_of_joining: '2021-07-01', date_of_birth: '1996-02-14', gender: 'female', company_id: 2, office_id: 2, is_first_login: true, basic_salary: 18000, fixed_gross: 45000 },
      // Employees - Engineering — company 3 (AE), office 3 (Pune)
      { emp_code: 'EMP008', name: 'Karan Joshi', email: 'karan.joshi@company.com', phone: '9876543217', password: passwordHash, designation: 'Frontend Developer', department: 'Engineering', role: 'employee', status: 'active', date_of_joining: '2021-09-15', date_of_birth: '1995-11-20', gender: 'male', company_id: 3, office_id: 3, is_first_login: false, basic_salary: 16000, fixed_gross: 40000 },
      { emp_code: 'EMP009', name: 'Meera Nair', email: 'meera.nair@company.com', phone: '9876543218', password: passwordHash, designation: 'Backend Developer', department: 'Engineering', role: 'employee', status: 'active', date_of_joining: '2022-01-10', date_of_birth: '1997-04-08', gender: 'female', company_id: 3, office_id: 3, is_first_login: true, basic_salary: 16000, fixed_gross: 40000 },
      { emp_code: 'EMP010', name: 'Deepak Singh', email: 'deepak.singh@company.com', phone: '9876543219', password: passwordHash, designation: 'QA Engineer', department: 'Engineering', role: 'employee', status: 'active', date_of_joining: '2021-03-20', date_of_birth: '1993-09-12', gender: 'male', company_id: 2, office_id: 2, is_first_login: false, basic_salary: 15200, fixed_gross: 38000 },
      // Employees - Sales — company 1 (BP Marketing), office 1 (Mumbai)
      { emp_code: 'EMP011', name: 'Neha Kapoor', email: 'neha.kapoor@company.com', phone: '9876543220', password: passwordHash, designation: 'Sales Executive', department: 'Sales', role: 'employee', status: 'active', date_of_joining: '2021-05-18', date_of_birth: '1995-01-30', gender: 'female', company_id: 1, office_id: 1, is_first_login: false, basic_salary: 14000, fixed_gross: 35000 },
      { emp_code: 'EMP012', name: 'Rohit Malhotra', email: 'rohit.malhotra@company.com', phone: '9876543221', password: passwordHash, designation: 'Sales Executive', department: 'Sales', role: 'employee', status: 'active', date_of_joining: '2022-02-01', date_of_birth: '1996-07-15', gender: 'male', company_id: 1, office_id: 1, is_first_login: true, basic_salary: 12000, fixed_gross: 30000 },
      // Employees - Product — company 2 (Apaar), office 2 (Bengaluru)
      { emp_code: 'EMP013', name: 'Divya Reddy', email: 'divya.reddy@company.com', phone: '9876543222', password: passwordHash, designation: 'UX Designer', department: 'Product', role: 'employee', status: 'active', date_of_joining: '2020-10-05', date_of_birth: '1993-12-03', gender: 'female', company_id: 2, office_id: 2, is_first_login: false, basic_salary: 22000, fixed_gross: 55000 },
      { emp_code: 'EMP014', name: 'Arjun Menon', email: 'arjun.menon@company.com', phone: '9876543223', password: passwordHash, designation: 'Business Analyst', department: 'Product', role: 'employee', status: 'active', date_of_joining: '2021-11-15', date_of_birth: '1994-05-28', gender: 'male', company_id: 2, office_id: 2, is_first_login: false, basic_salary: 19200, fixed_gross: 48000 },
      // Employees - HR — company 1 (BP Marketing), office 1 (Mumbai)
      { emp_code: 'EMP015', name: 'Pooja Thakur', email: 'pooja.thakur@company.com', phone: '9876543224', password: passwordHash, designation: 'HR Executive', department: 'Human Resources', role: 'employee', status: 'active', date_of_joining: '2022-04-01', date_of_birth: '1997-10-10', gender: 'female', company_id: 1, office_id: 1, is_first_login: true, basic_salary: 14000, fixed_gross: 35000 },
      // Inactive Employees
      { emp_code: 'EMP016', name: 'Suresh Rao', email: 'suresh.rao@company.com', phone: '9876543225', password: passwordHash, designation: 'Software Engineer', department: 'Engineering', role: 'employee', status: 'resigned', date_of_joining: '2019-02-15', date_of_birth: '1991-08-22', gender: 'male', company_id: 2, office_id: 2, is_first_login: false, basic_salary: 20000, fixed_gross: 50000 },
      { emp_code: 'EMP017', name: 'Kavita Das', email: 'kavita.das@company.com', phone: '9876543226', password: passwordHash, designation: 'Marketing Lead', department: 'Sales', role: 'employee', status: 'suspended', date_of_joining: '2020-06-01', date_of_birth: '1992-03-17', gender: 'female', company_id: 1, office_id: 1, is_first_login: false, basic_salary: 24000, fixed_gross: 60000 },
    ]);
    logger.info(`✅ Created ${employees.length} employees`);

    // Create salary structures for all employees
    const salaryStructures = employees.map(emp => {
      const basic = Math.round(emp.fixed_gross * 0.40);
      const hra = Math.round(basic * 0.40);
      const other = emp.fixed_gross - basic - hra;
      return {
        employee_id: emp.id,
        fixed_gross: emp.fixed_gross,
        basic_salary: basic,
        hra: hra,
        special_allowance: 0,
        other_allowance: other,
        conveyance: 0,
        medical_allowance: 0,
        pf_applicable: true,
        pf_ceiling: false,
        pf_contribution_mode: 'shared',
        pf_employee_rate: 0.12,
        pf_employer_rate: 0.12,
        esic_applicable: false,
        esic_contribution_mode: 'none',
        pt_applicable: true,
        effective_work_days: 26,
        effective_from: emp.date_of_joining || '2020-01-01'
      };
    });
    await SalaryStructure.bulkCreate(salaryStructures);
    logger.info(`✅ Created ${salaryStructures.length} salary structures`);

    // ──────────────────────────────────────────────
    // 4. LEAVE BALANCES (single-type: EL only with monthly accrual)
    // ──────────────────────────────────────────────
    const now = new Date();
    const activeEmployees = employees.filter(e => e.status === 'active');
    const leaveBalanceData = [];
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    for (const emp of activeEmployees) {
      // Calculate months since joining for realistic available balance
      const doj = emp.date_of_joining ? new Date(emp.date_of_joining) : now;
      const monthsSinceJoining = Math.max(1,
        (now.getFullYear() - doj.getFullYear()) * 12 + (now.getMonth() - doj.getMonth()) + 1,
      );

      // Simulate some usage (0-40% of accrued)
      const used = Math.floor(Math.random() * Math.floor(monthsSinceJoining * 0.4));
      const available = monthsSinceJoining - used;

      leaveBalanceData.push({
        employee_id: emp.id,
        available: Math.max(0, available),
        used,
        admin_granted: 0,
        lapsed: 0,
        last_accrual_month: currentMonthStr,
        consecutive_no_usage_months: 0,
      });
    }
    await LeaveBalance.bulkCreate(leaveBalanceData);
    logger.info(`✅ Created ${leaveBalanceData.length} leave balances (single-type EL)`);

    // ──────────────────────────────────────────────
    // 4b. SYSTEM SETTINGS (weekend policy)
    // ──────────────────────────────────────────────
    await SystemSetting.upsert({ key: 'weekend_policy', value: 'sunday_only' });
    logger.info('✅ Created system setting: weekend_policy = sunday_only');

    // ──────────────────────────────────────────────
    // 4c. HOLIDAYS (must exist before attendance seeding)
    // ──────────────────────────────────────────────
    const holidays = [
      { name: "Republic Day", start_date: "2026-01-26", end_date: "2026-01-26", days_count: 1, is_active: true, is_custom: false },
      { name: "Holi Festival", start_date: "2026-03-25", end_date: "2026-03-26", days_count: 2, is_active: true, is_custom: false },
      { name: "Eid-ul-Fitr", start_date: "2026-03-21", end_date: "2026-03-21", days_count: 1, is_active: false, is_custom: false },
      { name: "Independence Day", start_date: "2026-08-15", end_date: "2026-08-15", days_count: 1, is_active: true, is_custom: false },
      { name: "Diwali Grand Festival", start_date: "2026-11-08", end_date: "2026-11-11", days_count: 4, is_active: true, is_custom: false },
      { name: "Christmas Week", start_date: "2026-12-25", end_date: "2026-12-26", days_count: 2, is_active: true, is_custom: false },
    ];
    await Holiday.bulkCreate(holidays);
    const activeHolidays = holidays.filter(h => h.is_active);
    logger.info(`✅ Created ${holidays.length} holidays (${activeHolidays.length} active)`);

    // ──────────────────────────────────────────────
    // 5. ATTENDANCE RECORDS (Current Month)
    // ──────────────────────────────────────────────
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    const today = now.getDate();
    const attendanceRecords = [];

    // Fetch dynamic weekend policy & holidays for attendance seeding
    const weekendDays = await getWeekendDays();
    const seededHolidays = await getHolidaysInMonth(currentMonth + 1, currentYear);

    for (const emp of activeEmployees) {
      for (let day = 1; day <= today; day++) {
        const d = new Date(currentYear, currentMonth, day);
        const dayOfWeek = d.getDay();
        if (weekendDays.includes(dayOfWeek)) continue; // Skip weekends per policy

        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        if (isHolidayDate(dateStr, seededHolidays)) {
          attendanceRecords.push({
            employee_id: emp.id,
            date: dateStr,
            status: 'holiday',
            check_in_time: null,
            check_out_time: null,
            total_hours: null,
            total_minutes: null,
            late_by_minutes: 0,
            early_exit_minutes: null,
            check_in_distance: null,
            check_out_distance: null,
            check_in_latitude: null,
            check_in_longitude: null,
            check_out_latitude: null,
            check_out_longitude: null,
            check_in_method: 'web',
            overtime_minutes: 0,
            remarks: 'Public Holiday',
          });
          continue;
        }

        // 85% chance of being present
        const isPresent = Math.random() > 0.15;
        if (isPresent) {
          const checkInHour = 8 + Math.floor(Math.random() * 2); // 8-9 AM
          const checkInMin = Math.floor(Math.random() * 45);
          const checkIn = new Date(currentYear, currentMonth, day, checkInHour, checkInMin, 0);

          const lateByMinutes = checkInHour >= 9 ? (checkInHour - 9) * 60 + checkInMin : 0;
          const status = lateByMinutes > 15 ? 'late' : 'present';

          const checkOutHour = 17 + Math.floor(Math.random() * 2); // 5-7 PM
          const checkOutMin = Math.floor(Math.random() * 60);
          const checkOut = new Date(currentYear, currentMonth, day, checkOutHour, checkOutMin, 0);
          const totalMinutes = Math.floor((checkOut - checkIn) / 60000);
          const totalHours = Math.floor(totalMinutes / 60);
          const earlyExitMinutes = checkOutHour < 18 ? (18 - checkOutHour) * 60 - checkOutMin : 0;

          // Office GPS coords (Indore Hub area)
          const officeLat = 22.7196 + (Math.random() - 0.5) * 0.002;
          const officeLon = 75.8577 + (Math.random() - 0.5) * 0.002;
          const checkOutLat = day < today ? 22.7196 + (Math.random() - 0.5) * 0.002 : null;
          const checkOutLon = day < today ? 75.8577 + (Math.random() - 0.5) * 0.002 : null;
          const overtimeMinutes = day < today && checkOutHour >= 18
            ? (checkOutHour - 18) * 60 + checkOutMin
            : 0;

          attendanceRecords.push({
            employee_id: emp.id,
            date: dateStr,
            status,
            check_in_time: checkIn,
            check_out_time: day < today ? checkOut : null,
            total_hours: day < today ? totalHours : null,
            total_minutes: day < today ? totalMinutes : null,
            late_by_minutes: lateByMinutes,
            early_exit_minutes: day < today ? earlyExitMinutes : null,
            check_in_distance: Math.floor(Math.random() * 150),
            check_out_distance: day < today ? Math.floor(Math.random() * 150) : null,
            check_in_latitude: officeLat,
            check_in_longitude: officeLon,
            check_out_latitude: checkOutLat,
            check_out_longitude: checkOutLon,
            check_in_method: ['gps', 'biometric', 'web'][Math.floor(Math.random() * 3)],
            overtime_minutes: overtimeMinutes,
            remarks: lateByMinutes > 15 ? `Late by ${lateByMinutes} minutes` : null,
          });
        } else {
          attendanceRecords.push({
            employee_id: emp.id,
            date: dateStr,
            status: 'absent',
            check_in_time: null,
            check_out_time: null,
            total_hours: null,
            total_minutes: null,
            late_by_minutes: 0,
            early_exit_minutes: null,
            check_in_distance: null,
            check_out_distance: null,
            check_in_latitude: null,
            check_in_longitude: null,
            check_out_latitude: null,
            check_out_longitude: null,
            check_in_method: 'web',
            overtime_minutes: 0,
            remarks: 'Absent — no check-in recorded',
          });
        }
      }
    }
    await AttendanceRecord.bulkCreate(attendanceRecords);
    logger.info(`✅ Created ${attendanceRecords.length} attendance records`);

    // ──────────────────────────────────────────────
    // 6. LEAVE REQUESTS
    // ──────────────────────────────────────────────
    const leaveRequestData = [
      { employee_id: 7, leave_type: 'el', from_date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-16`, to_date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-17`, duration: 2, reason: 'Personal work', contact_during_leave: '9876543216', status: 'pending', approved_by: null, approved_at: null },
      { employee_id: 8, leave_type: 'el', from_date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-10`, to_date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-10`, duration: 1, reason: 'Not feeling well', contact_during_leave: '9876543217', status: 'approved', approved_by: 3, approved_at: new Date(currentYear, currentMonth, 8) },
      { employee_id: 12, leave_type: 'el', from_date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-20`, to_date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-22`, duration: 3, reason: 'Family function', contact_during_leave: '9876543221', status: 'pending', approved_by: null, approved_at: null },
      { employee_id: 11, leave_type: 'el', from_date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-05`, to_date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-05`, duration: 1, reason: 'Doctor appointment', contact_during_leave: '9876543220', status: 'approved', approved_by: 5, approved_at: new Date(currentYear, currentMonth, 3) },
      { employee_id: 9, leave_type: 'el', from_date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-25`, to_date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-25`, duration: 1, reason: 'Urgent personal work', contact_during_leave: '9876543218', status: 'rejected', approved_by: 3, approved_at: new Date(currentYear, currentMonth, 12), remarks: 'Team deadline this week' },
    ];
    await LeaveRequest.bulkCreate(leaveRequestData);
    logger.info(`✅ Created ${leaveRequestData.length} leave requests`);

    // ──────────────────────────────────────────────
    // 7. PAYSLIPS (Current Month)
    // ──────────────────────────────────────────────
    const payslipData = [];
    for (const emp of activeEmployees) {
      const basic = emp.basic_salary || 35000;
      const hra = Math.round(basic * 0.4);
      const conveyance = 1600;
      const medical = 1250;
      const special = Math.round(basic * 0.2);
      const gross = basic + hra + conveyance + medical + special;
      const pfEmp = Math.round(basic * 0.12);
      const esi = Math.round(gross * 0.0075);
      const pt = 200;
      const deductions = pfEmp + esi + pt;
      const net = gross - deductions;

      const ps = await Payslip.create({
        employee_id: emp.id,
        month: now.toLocaleString('default', { month: 'long' }),
        month_index: currentMonth + 1,
        year: currentYear,
        basic_salary: basic,
        gross_salary: gross,
        net_salary: net,
        total_deductions: deductions,
        pf_employee: pfEmp,
        pf_employer: Math.round(basic * 0.12),
        esi,
        tax: 0,
        status: 'processed',
      });

      // Salary components
      await SalaryComponent.bulkCreate([
        { payslip_id: ps.id, name: 'Basic Salary', type: 'earning', amount: basic, category: 'basic' },
        { payslip_id: ps.id, name: 'HRA', type: 'earning', amount: hra, category: 'allowance' },
        { payslip_id: ps.id, name: 'Conveyance Allowance', type: 'earning', amount: conveyance, category: 'allowance' },
        { payslip_id: ps.id, name: 'Medical Allowance', type: 'earning', amount: medical, category: 'allowance' },
        { payslip_id: ps.id, name: 'Special Allowance', type: 'earning', amount: special, category: 'allowance' },
        { payslip_id: ps.id, name: 'PF (Employee)', type: 'deduction', amount: pfEmp, category: 'statutory' },
        { payslip_id: ps.id, name: 'ESI', type: 'deduction', amount: esi, category: 'statutory' },
        { payslip_id: ps.id, name: 'Professional Tax', type: 'deduction', amount: pt, category: 'statutory' },
      ]);

      payslipData.push(ps);
    }
    logger.info(`✅ Created ${payslipData.length} payslips`);

    // ──────────────────────────────────────────────
    // 8. LOANS
    // ──────────────────────────────────────────────
    const loanData = [
      { employee_id: 6, type: 'personal', principal_amount: 200000, interest_rate: 10, tenure_months: 24, emi_amount: 9229, total_remaining: 156893, paid_percentage: 21.5, status: 'active', approved_by: 1, disbursed_on: new Date(currentYear, currentMonth - 5, 15) },
      { employee_id: 13, type: 'vehicle', principal_amount: 350000, interest_rate: 8.5, tenure_months: 36, emi_amount: 11063, total_remaining: 320000, paid_percentage: 8.6, status: 'active', approved_by: 1, disbursed_on: new Date(currentYear, currentMonth - 2, 1) },
      { employee_id: 10, type: 'emergency', principal_amount: 50000, interest_rate: 12, tenure_months: 12, emi_amount: 4442, total_remaining: 0, paid_percentage: 100, status: 'closed', approved_by: 1, disbursed_on: new Date(currentYear - 1, 6, 10) },
      { employee_id: 14, type: 'education', principal_amount: 150000, interest_rate: 9, tenure_months: 18, emi_amount: 8988, total_remaining: 150000, paid_percentage: 0, status: 'active', approved_by: null, disbursed_on: null },
    ];
    await Loan.bulkCreate(loanData);
    logger.info(`✅ Created ${loanData.length} loans`);

    // ──────────────────────────────────────────────
    // 9. PERFORMANCE OBJECTIVES
    // ──────────────────────────────────────────────
    const objectiveData = [
      { employee_id: 6, title: 'Complete API Migration', description: 'Migrate legacy REST APIs to GraphQL with Apollo Server', category: 'technical', weight: 40, progress: 75, status: 'in_progress', target_date: new Date(currentYear, currentMonth + 1, 30) },
      { employee_id: 6, title: 'Code Review Champion', description: 'Review at least 30 pull requests and maintain 24h turnaround time', category: 'collaboration', weight: 30, progress: 85, status: 'in_progress', target_date: new Date(currentYear, currentMonth, 30) },
      { employee_id: 7, title: 'Unit Test Coverage', description: 'Increase unit test coverage from 65% to 80%', category: 'technical', weight: 50, progress: 40, status: 'in_progress', target_date: new Date(currentYear, currentMonth + 2, 15) },
      { employee_id: 11, title: 'Sales Target Q2', description: 'Achieve ₹25L in new business for Q2', category: 'revenue', weight: 60, progress: 55, status: 'in_progress', target_date: new Date(currentYear, 2, 31) },
      { employee_id: 13, title: 'Redesign Onboarding Flow', description: 'Complete UX redesign of the user onboarding flow', category: 'product', weight: 50, progress: 90, status: 'in_progress', target_date: new Date(currentYear, currentMonth, 15) },
      { employee_id: 8, title: 'Performance Optimization', description: 'Improve Lighthouse performance score from 65 to 90', category: 'technical', weight: 40, progress: 100, status: 'completed', target_date: new Date(currentYear, currentMonth, 1) },
    ];
    await PerformanceObjective.bulkCreate(objectiveData);
    logger.info(`✅ Created ${objectiveData.length} performance objectives`);

    // ──────────────────────────────────────────────
    // 10. PERFORMANCE REVIEWS
    // ──────────────────────────────────────────────
    const reviewData = [
      { employee_id: 6, review_period: 'Q1 2026', overall_score: 4.2, delivery_score: 4.5, quality_score: 4.0, learning_score: 4.0, rating: 'excellent', comments: 'Consistently delivered high-quality work. Strong team player and mentor to juniors.', reviewed_by: 3, reviewed_at: new Date(currentYear, 3, 1), status: 'finalized' },
      { employee_id: 7, review_period: 'Q1 2026', overall_score: 3.8, delivery_score: 3.5, quality_score: 4.0, learning_score: 4.0, rating: 'good', comments: 'Good progress. Needs to improve on meeting deadlines consistently.', reviewed_by: 3, reviewed_at: new Date(currentYear, 3, 1), status: 'finalized' },
      { employee_id: 11, review_period: 'Q4 2025', overall_score: 4.5, delivery_score: 5.0, quality_score: 4.0, learning_score: 4.5, rating: 'excellent', comments: 'Top performer. Exceeded sales targets by 120%.', reviewed_by: 5, reviewed_at: new Date(currentYear - 1, 12, 15), status: 'finalized' },
    ];
    await PerformanceReview.bulkCreate(reviewData);
    logger.info(`✅ Created ${reviewData.length} performance reviews`);

    // ──────────────────────────────────────────────
    // 11. DOCUMENTS
    // ──────────────────────────────────────────────
    const documentData = [
      { employee_id: 7, name: 'Offer Letter.pdf', type: 'offer_letter', file_path: '/uploads/documents/offer_letter_007.pdf', file_size: 245760, mime_type: 'application/pdf', status: 'verified', verified_by: 2, verified_at: new Date(currentYear - 4, 6, 15) },
      { employee_id: 7, name: 'Aadhaar Card.pdf', type: 'id_proof', file_path: '/uploads/documents/aadhaar_007.pdf', file_size: 128000, mime_type: 'application/pdf', status: 'verified', verified_by: 2, verified_at: new Date(currentYear - 4, 6, 16) },
      { employee_id: 12, name: 'PAN Card.pdf', type: 'id_proof', file_path: '/uploads/documents/pan_012.pdf', file_size: 96000, mime_type: 'application/pdf', status: 'pending', verified_by: null, verified_at: null },
      { employee_id: 12, name: 'Degree Certificate.pdf', type: 'certificate', file_path: '/uploads/documents/degree_012.pdf', file_size: 512000, mime_type: 'application/pdf', status: 'pending', verified_by: null, verified_at: null },
      { employee_id: 10, name: 'Resignation Letter.pdf', type: 'other', file_path: '/uploads/documents/resignation_010.pdf', file_size: 72000, mime_type: 'application/pdf', status: 'verified', verified_by: 1, verified_at: new Date(currentYear - 2, 2, 1) },
    ];
    await Document.bulkCreate(documentData);
    logger.info(`✅ Created ${documentData.length} documents`);

    // ──────────────────────────────────────────────
    // 12. LETTERS
    // ──────────────────────────────────────────────
    const letterData = [
      { employee_id: 7, type: 'offer', title: 'Offer of Employment', content: 'We are pleased to offer you the position of Software Engineer...', issued_date: new Date(currentYear - 4, 6, 1), issued_by: 1, status: 'issued' },
      { employee_id: 7, type: 'appointment', title: 'Appointment Letter', content: 'Confirming your appointment as Software Engineer effective July 1, 2021...', issued_date: new Date(currentYear - 4, 6, 15), issued_by: 1, status: 'issued', acknowledged_at: new Date(currentYear - 4, 6, 20) },
      { employee_id: 6, type: 'promotion', title: 'Promotion to Senior Software Engineer', content: 'In recognition of your outstanding performance, you are promoted to Senior Software Engineer...', issued_date: new Date(currentYear - 2, 0, 10), issued_by: 1, status: 'issued', acknowledged_at: new Date(currentYear - 2, 0, 12) },
      { employee_id: 16, type: 'resignation', title: 'Resignation Acceptance', content: 'Your resignation has been accepted effective March 31...', issued_date: new Date(currentYear, 2, 28), issued_by: 1, status: 'issued' },
    ];
    await Letter.bulkCreate(letterData);
    logger.info(`✅ Created ${letterData.length} letters`);

    // ──────────────────────────────────────────────
    // 13. NOTIFICATIONS
    // ──────────────────────────────────────────────
    const notificationData = [
      { employee_id: 7, title: 'Welcome to the Team!', message: 'Welcome aboard! Complete your onboarding tasks to get started.', type: 'info', category: 'onboarding', is_read: false },
      { employee_id: 7, title: 'Payslip Generated', message: `Your payslip for ${now.toLocaleString('default', { month: 'long' })} ${currentYear} has been generated.`, type: 'info', category: 'payroll', is_read: true },
      { employee_id: 7, title: 'Leave Request Approved', message: 'Your sick leave request for 10th has been approved by Amit Patel.', type: 'success', category: 'leave', is_read: false },
      { employee_id: 6, title: 'Code Review Reminder', message: 'You have 5 pending pull requests awaiting your review.', type: 'reminder', category: 'general', is_read: false },
      { employee_id: 6, title: 'Payslip Generated', message: `Your payslip for ${now.toLocaleString('default', { month: 'long' })} ${currentYear} has been generated.`, type: 'info', category: 'payroll', is_read: true },
      { employee_id: 12, title: 'Document Verification', message: 'Please upload your ID proof for verification.', type: 'warning', category: 'documents', is_read: false },
      { employee_id: 1, title: 'Pending Leave Requests', message: 'There are 2 leave requests waiting for your approval.', type: 'info', category: 'leave', is_read: false },
      { employee_id: 3, title: 'Team Attendance Alert', message: '3 team members are marked absent today without prior notice.', type: 'warning', category: 'attendance', is_read: false },
    ];
    await Notification.bulkCreate(notificationData);
    logger.info(`✅ Created ${notificationData.length} notifications`);

    // ──────────────────────────────────────────────
    // 14. TOUR EXPENSE POLICIES
    // ──────────────────────────────────────────────
    const policyRules = [
      { label: "Air Travel (Economy)",   limit_detail: "₹ 12,000 / trip",    note: "Business class requires VP approval", is_general_rule: false },
      { label: "Hotel Stay",             limit_detail: "₹ 3,500 / night",    note: "Metro cities: ₹ 5,000 / night",      is_general_rule: false },
      { label: "Meals & Per Diem",       limit_detail: "₹ 800 / day",        note: "Receipts mandatory above ₹ 300",     is_general_rule: false },
      { label: "Local Conveyance",       limit_detail: "₹ 500 / day",        note: "Cab receipts required",              is_general_rule: false },
      { label: "Fuel / Own Vehicle",     limit_detail: "₹ 8 / km",           note: "Log sheet mandatory",                is_general_rule: false },
      { label: "Client Entertainment",   limit_detail: "₹ 5,000 / occasion", note: "Manager approval required",          is_general_rule: false },
      { label: "General Rules",          limit_detail: "N/A",                note: "",                                   is_general_rule: true,   general_rules_text: "All claims must be submitted within 7 days of tour completion. Receipts are mandatory for all expenses above ₹ 200. Claims submitted after 15 days will not be reimbursed without HOD approval. Advance settlement must be done within 3 days of return." }
    ];
    await TourExpensePolicy.bulkCreate(policyRules);
    logger.info(`✅ Created ${policyRules.length} tour expense policies`);

    // ──────────────────────────────────────────────
    // 15. TOUR EXPENSES
    // ──────────────────────────────────────────────
    const tourExpenses = [
      {
        claim_code: "TE001", employee_id: 14, // Arjun Menon
        purpose: "Client visit – Mumbai", from_location: "Indore", to_location: "Mumbai",
        start_date: "2026-05-05", end_date: "2026-05-07", amount: 14250,
        status: "approved", category: "Travel (Air/Train/Bus)",
        receipts: [
          { id: "R1", name: "flight_ticket.pdf", size: "245 KB", type: "PDF" },
          { id: "R2", name: "hotel_invoice.pdf", size: "128 KB", type: "PDF" },
          { id: "R3", name: "meal_receipt.jpg",  size: "84 KB",  type: "IMG" },
        ],
        remarks: "Client meeting successful.", approved_by: 1, approved_at: new Date()
      },
      {
        claim_code: "TE002", employee_id: 2, // Priya Sharma
        purpose: "Vendor meeting – Delhi", from_location: "Mumbai", to_location: "Delhi",
        start_date: "2026-05-10", end_date: "2026-05-11", amount: 9800,
        status: "pending", category: "Hotel / Accommodation",
        receipts: [
          { id: "R4", name: "train_ticket.pdf", size: "112 KB", type: "PDF" },
          { id: "R5", name: "hotel_bill.pdf",   size: "95 KB",  type: "PDF" },
        ],
        remarks: "Vendor negotiation completed."
      },
      {
        claim_code: "TE003", employee_id: 6, // Rahul Verma
        purpose: "Conference – Pune", from_location: "Indore", to_location: "Pune",
        start_date: "2026-04-22", end_date: "2026-04-24", amount: 18500,
        status: "approved", category: "Travel (Air/Train/Bus)",
        receipts: [
          { id: "R6", name: "flight_pune.pdf",  size: "200 KB", type: "PDF" },
          { id: "R7", name: "hotel_pune.pdf",   size: "150 KB", type: "PDF" },
          { id: "R8", name: "conf_fee.pdf",     size: "60 KB",  type: "PDF" },
          { id: "R9", name: "taxi_receipt.jpg", size: "45 KB",  type: "IMG" },
        ],
        remarks: "Tech conference attendance.", approved_by: 1, approved_at: new Date()
      },
      {
        claim_code: "TE004", employee_id: 17, // Kavita Das
        purpose: "Training – Bhopal", from_location: "Indore", to_location: "Bhopal",
        start_date: "2026-05-14", end_date: "2026-05-14", amount: 2100,
        status: "rejected", category: "Local Conveyance",
        receipts: [{ id: "R10", name: "fuel_receipt.jpg", size: "30 KB", type: "IMG" }],
        remarks: "Day trip for training.", approved_by: 1, approved_at: new Date(),
        rejected_reason: "Receipts insufficient. Please resubmit with detailed fuel log."
      },
      {
        claim_code: "TE005", employee_id: 12, // Rohit Malhotra
        purpose: "Depot audit – Surat", from_location: "Indore", to_location: "Surat",
        start_date: "2026-05-01", end_date: "2026-05-03", amount: 11600,
        status: "approved", category: "Fuel & Vehicle",
        receipts: [
          { id: "R11", name: "fuel_log.pdf",    size: "88 KB", type: "PDF" },
          { id: "R12", name: "toll_receipt.jpg",size: "22 KB", type: "IMG" },
          { id: "R13", name: "hotel_surat.pdf", size: "110 KB",type: "PDF" },
        ],
        remarks: "Annual depot audit.", approved_by: 1, approved_at: new Date()
      },
      {
        claim_code: "TE006", employee_id: 9, // Meera Nair
        purpose: "GST audit – Hyderabad", from_location: "Indore", to_location: "Hyderabad",
        start_date: "2026-05-16", end_date: "2026-05-17", amount: 21000,
        status: "pending", category: "Hotel / Accommodation",
        receipts: [
          { id: "R14", name: "flight_hyd.pdf",  size: "195 KB", type: "PDF" },
          { id: "R15", name: "hotel_hyd.pdf",   size: "140 KB", type: "PDF" },
          { id: "R16", name: "gst_docs.pdf",    size: "320 KB", type: "PDF" },
        ],
        remarks: "Statutory GST audit visit."
      },
    ];
    await TourExpense.bulkCreate(tourExpenses);
    logger.info(`✅ Created ${tourExpenses.length} tour expenses`);

    // ──────────────────────────────────────────────
    // SUMMARY
    // ──────────────────────────────────────────────
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('🎉 Database seeding completed successfully!');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('📊 Summary:');
    logger.info(`   - Companies:         ${companies.length}`);
    logger.info(`   - Offices:           ${offices.length}`);
    logger.info(`   - Employees:         ${employees.length}`);
    logger.info(`   - Leave Balances:    ${leaveBalanceData.length}`);
    logger.info(`   - Attendance:        ${attendanceRecords.length}`);
    logger.info(`   - Leave Requests:    ${leaveRequestData.length}`);
    logger.info(`   - Payslips:          ${payslipData.length}`);
    logger.info(`   - Loans:             ${loanData.length}`);
    logger.info(`   - Objectives:        ${objectiveData.length}`);
    logger.info(`   - Reviews:           ${reviewData.length}`);
    logger.info(`   - Documents:         ${documentData.length}`);
    logger.info(`   - Letters:           ${letterData.length}`);
    logger.info(`   - Notifications:     ${notificationData.length}`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('🔑 Demo Login Credentials:');
    logger.info('   Admin:  rajesh.kumar@company.com / Password@123');
    logger.info('   HR:     priya.sharma@company.com / Password@123');
    logger.info('   Mgr:    amit.patel@company.com / Password@123');
    logger.info('   Emp:    rahul.verma@company.com / Password@123');
    logger.info('   New:    ananya.gupta@company.com / Password@123');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Seeding failed — full error dump:');
    logger.error('  name:', error.name);
    logger.error('  message:', error.message);
    logger.error('  sql:', error.sql);
    if (error.original) {
      logger.error('  original.code:', error.original.code);
      logger.error('  original.errno:', error.original.errno);
      logger.error('  original.sqlMessage:', error.original.sqlMessage);
      logger.error('  original.sqlState:', error.original.sqlState);
    }
    if (error.parent) {
      logger.error('  parent.code:', error.parent.code);
      logger.error('  parent.errno:', error.parent.errno);
      logger.error('  parent.sqlMessage:', error.parent.sqlMessage);
    }
    if (error.errors && Array.isArray(error.errors)) {
      error.errors.forEach((e, i) => {
        logger.error(`  errors[${i}]:`, JSON.stringify({
          message: e.message,
          type: e.type,
          path: e.path,
          value: e.value,
        }));
      });
    }
    logger.error(error.stack);
    process.exit(1);
  }
};

seed();