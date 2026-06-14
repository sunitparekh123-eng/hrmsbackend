const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { sequelize, Employee, Payslip, SalaryComponent } = require('../models');

const seedHistory = async () => {
  try {
    console.log('Seeding historical payslips...');
    const employees = await Employee.findAll({ where: { status: 'active' } });
    console.log(`Found ${employees.length} active employees.`);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed (e.g. 5 for June)

    // Seed for the last 5 months (January to May)
    for (let mOffset = 5; mOffset >= 1; mOffset--) {
      let targetMonthIndex = currentMonth - mOffset; // 0-indexed
      let targetYear = currentYear;
      if (targetMonthIndex < 0) {
        targetMonthIndex += 12;
        targetYear -= 1;
      }
      
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = monthNames[targetMonthIndex];
      const monthDisplayIndex = targetMonthIndex + 1; // 1-indexed

      console.log(`Generating payslips for ${monthName} ${targetYear}...`);

      for (const emp of employees) {
        // Check if payslip already exists
        const existing = await Payslip.findOne({
          where: {
            employee_id: emp.id,
            month: monthName,
            year: targetYear
          }
        });

        if (existing) {
          console.log(`Payslip for ${emp.name} in ${monthName} ${targetYear} already exists. Skipping.`);
          continue;
        }

        const gross = Number(emp.fixed_gross) > 0 ? Number(emp.fixed_gross) : 45000;
        const basic = Math.round(gross * 0.40);
        const hra = Math.round(basic * 0.40);
        const other = gross - basic - hra;
        
        // Employee PF & Deductions
        const pfEmp = Math.round(basic * 0.12);
        const esi = Math.round(gross * 0.0075);
        const pt = 200;
        const deductions = pfEmp + esi + pt;
        const net = gross - deductions;

        const ps = await Payslip.create({
          employee_id: emp.id,
          month: monthName,
          month_index: monthDisplayIndex,
          year: targetYear,
          basic_salary: basic,
          gross_salary: gross,
          net_salary: net,
          total_deductions: deductions,
          pf_employee: pfEmp,
          pf_employer: Math.round(basic * 0.12),
          esi: esi,
          tax: 0,
          status: 'processed',
        });

        // Seed components
        await SalaryComponent.bulkCreate([
          { payslip_id: ps.id, name: 'Basic Salary', type: 'earning', amount: basic, category: 'basic' },
          { payslip_id: ps.id, name: 'HRA', type: 'earning', amount: hra, category: 'allowance' },
          { payslip_id: ps.id, name: 'Other Allowance', type: 'earning', amount: other, category: 'allowance' },
          { payslip_id: ps.id, name: 'PF (Employee)', type: 'deduction', amount: pfEmp, category: 'statutory' },
          { payslip_id: ps.id, name: 'ESI', type: 'deduction', amount: esi, category: 'statutory' },
          { payslip_id: ps.id, name: 'Professional Tax', type: 'deduction', amount: pt, category: 'statutory' },
        ]);
      }
    }

    console.log('Historical payslips seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding historical payslips:', error);
    process.exit(1);
  }
};

seedHistory();
