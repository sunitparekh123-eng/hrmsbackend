require('dotenv').config();
const { Employee, LeaveBalance, LeaveRequest } = require('../src/models');

async function check() {
  try {
    const employee = await Employee.findOne({
      where: { email: 'sagarbakshe1993@gmail.com' }
    });
    
    if (!employee) {
      console.log('Employee not found');
      return;
    }
    
    console.log('Employee Info:');
    console.log({
      id: employee.id,
      name: employee.name,
      emp_code: employee.emp_code,
      date_of_joining: employee.date_of_joining,
      status: employee.status
    });
    
    const balance = await LeaveBalance.findOne({
      where: { employee_id: employee.id }
    });
    
    console.log('\nLeave Balance:');
    console.log(balance ? balance.toJSON() : 'No balance record found');
    
    const requests = await LeaveRequest.findAll({
      where: { employee_id: employee.id }
    });
    
    console.log('\nLeave Requests:');
    console.log(requests.map(r => r.toJSON()));
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

check();
