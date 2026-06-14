const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { sequelize, Employee, Loan } = require('../models');

const grantLoan = async () => {
  try {
    console.log('Starting Loan Seeder...');
    
    // Find first active employee
    const emp = await Employee.findOne({ where: { status: 'active' } });
    if (!emp) {
      console.error('No active employee found to grant a loan to!');
      return;
    }
    
    console.log(`Granting loan to employee: ${emp.name} (${emp.emp_code})`);

    // Check if they already have an active loan
    const existing = await Loan.findOne({ where: { employee_id: emp.id, status: 'active' } });
    if (existing) {
      console.log(`Employee already has an active loan (ID: ${existing.id}, Remaining: ₹${existing.total_remaining}). Skipping creation.`);
      return;
    }

    const principal = 60000;
    const rate = 12; // 12% p.a.
    const tenure = 10; // 10 months

    // Calculate EMI using standard formula: EMI = P * r * (1+r)^n / ((1+r)^n - 1)
    const monthlyRate = rate / 100 / 12;
    const emi = Math.round(
      principal * monthlyRate * Math.pow(1 + monthlyRate, tenure) /
      (Math.pow(1 + monthlyRate, tenure) - 1)
    );

    const loan = await Loan.create({
      employee_id: emp.id,
      type: 'personal',
      principal_amount: principal,
      interest_rate: rate,
      tenure_months: tenure,
      emi_amount: emi,
      total_remaining: principal,
      paid_percentage: 0,
      status: 'active',
      disbursed_on: new Date(),
    });

    console.log(`Successfully granted a personal loan to ${emp.name}!`);
    console.log(`Loan ID: ${loan.id}`);
    console.log(`Principal: ₹${principal}`);
    console.log(`EMI: ₹${emi} per month`);
  } catch (error) {
    console.error('Error seeding loan:', error);
  } finally {
    await sequelize.close();
  }
};

grantLoan();
