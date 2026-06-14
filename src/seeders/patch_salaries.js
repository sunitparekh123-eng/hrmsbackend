const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { sequelize, Employee, SalaryStructure } = require('../models');

const patch = async () => {
  try {
    console.log('Starting salary patching...');
    
    // Get all employees
    const employees = await Employee.findAll();
    console.log(`Found ${employees.length} employees.`);
    
    for (const emp of employees) {
      // Use the basic_salary column value as fixed_gross if fixed_gross is 0 or null
      const gross = Number(emp.fixed_gross) > 0 ? Number(emp.fixed_gross) : (Number(emp.basic_salary) > 0 ? Number(emp.basic_salary) : 45000);
      
      // Update Employee fixed_gross
      await emp.update({
        fixed_gross: gross,
        basic_salary: Math.round(gross * 0.40)
      });
      
      // Calculate structures
      const basic = Math.round(gross * 0.40);
      const hra = Math.round(basic * 0.40);
      const other = gross - basic - hra;
      
      // Check if SalaryStructure exists
      let structure = await SalaryStructure.findOne({ where: { employee_id: emp.id } });
      if (!structure) {
        structure = await SalaryStructure.create({
          employee_id: emp.id,
          fixed_gross: gross,
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
        });
        console.log(`Created SalaryStructure for employee ${emp.name} (ID: ${emp.id}) with Gross: ${gross}`);
      } else {
        await structure.update({
          fixed_gross: gross,
          basic_salary: basic,
          hra: hra,
          other_allowance: other
        });
        console.log(`Updated SalaryStructure for employee ${emp.name} (ID: ${emp.id}) with Gross: ${gross}`);
      }
    }
    
    console.log('Salary patching completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error patching salaries:', error);
    process.exit(1);
  }
};

patch();
