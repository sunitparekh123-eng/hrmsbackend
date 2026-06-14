const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { sequelize, Employee, Document, Letter } = require('../models');

const patch = async () => {
  try {
    console.log('Starting profile fields patching and document/letter seeding...');

    // 1. Alter table to add columns if they don't exist
    try {
      await sequelize.query('ALTER TABLE employees ADD COLUMN blood_group VARCHAR(10) NULL');
      console.log('Added blood_group column to employees table.');
    } catch (err) {
      console.log('blood_group column already exists or table alter failed:', err.message);
    }

    try {
      await sequelize.query('ALTER TABLE employees ADD COLUMN lic_details VARCHAR(200) NULL');
      console.log('Added lic_details column to employees table.');
    } catch (err) {
      console.log('lic_details column already exists or table alter failed:', err.message);
    }

    // 2. Fetch all employees
    const employees = await Employee.findAll();
    console.log(`Found ${employees.length} employees to update.`);

    const bloodGroups = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const bg = bloodGroups[i % bloodGroups.length];
      const lic = `LIC Policy #${100000000 + i * 27}; Premium: ₹1,500/mo`;

      // Update fields
      await emp.update({
        blood_group: bg,
        lic_details: lic,
        gender: emp.gender || 'male',
        address: emp.address || 'Flat 102, Shanti Vihar, Vijay Nagar, Indore, MP 452010',
        emergency_contact_name: emp.emergency_contact_name || 'Ramesh Kumar',
        emergency_contact_relation: emp.emergency_contact_relation || 'Father',
        location: emp.location || 'Indore Hub',
        bank_name: emp.bank_name || 'HDFC Bank',
        bank_account_number: emp.bank_account_number || '50100234567890',
        ifsc_code: emp.ifsc_code || 'HDFC0000102',
        pan_number: emp.pan_number || 'ABCDE1234F',
        aadhaar_number: emp.aadhaar_number || '123456789012',
        pf_number: emp.pf_number || 'MP/IND/2026/00123',
        uan: emp.uan || '100123456789',
        fixed_gross: emp.fixed_gross || 60000.00,
        basic_salary: emp.basic_salary || 24000.00,
      });

      console.log(`Updated profile fields for employee: ${emp.name} (Code: ${emp.emp_code})`);

      // 3. Seed Documents if none exist
      const existingDocs = await Document.count({ where: { employee_id: emp.id } });
      if (existingDocs === 0) {
        await Document.bulkCreate([
          {
            employee_id: emp.id,
            name: 'Aadhaar Card',
            type: 'id_proof',
            file_path: 'uploads/aadhaar.pdf',
            file_size: 409600,
            mime_type: 'application/pdf',
            status: 'verified',
            verified_by: emp.id, // self-referencing for seed convenience or default
            verified_at: new Date(),
          },
          {
            employee_id: emp.id,
            name: 'PAN Card',
            type: 'id_proof',
            file_path: 'uploads/pan.pdf',
            file_size: 204800,
            mime_type: 'application/pdf',
            status: 'verified',
            verified_by: emp.id,
            verified_at: new Date(),
          },
          {
            employee_id: emp.id,
            name: 'Bank Passbook / cancelled cheque',
            type: 'address_proof',
            file_path: 'uploads/bank_passbook.pdf',
            file_size: 1048576,
            mime_type: 'application/pdf',
            status: 'verified',
            verified_by: emp.id,
            verified_at: new Date(),
          },
          {
            employee_id: emp.id,
            name: 'PF Statement 2025-26',
            type: 'other',
            file_path: 'uploads/pf_statement.pdf',
            file_size: 512000,
            mime_type: 'application/pdf',
            status: 'pending',
          },
          {
            employee_id: emp.id,
            name: 'LIC Policy Bond',
            type: 'other',
            file_path: 'uploads/lic_policy.pdf',
            file_size: 2048000,
            mime_type: 'application/pdf',
            status: 'pending',
          }
        ]);
        console.log(`Seeded 5 documents for ${emp.name}`);
      }

      // 4. Seed Letters if none exist
      const existingLetters = await Letter.count({ where: { employee_id: emp.id } });
      if (existingLetters === 0) {
        await Letter.bulkCreate([
          {
            employee_id: emp.id,
            type: 'offer',
            title: `Offer Letter — ${emp.designation || 'Software Engineer'}`,
            content: `Dear ${emp.name},\n\nWe are pleased to offer you the position of ${emp.designation || 'Software Engineer'} at Apaar Logistics & Cold Supply Chain Pvt Ltd.\n\nYour joining date is ${emp.date_of_joining || '2026-01-01'}.\n\nRegards,\nHR Department`,
            issued_date: emp.date_of_joining || '2026-01-01',
            status: 'acknowledged',
            acknowledged_at: new Date(),
          },
          {
            employee_id: emp.id,
            type: 'appointment',
            title: `Appointment Letter`,
            content: `Dear ${emp.name},\n\nFollowing your joining on ${emp.date_of_joining || '2026-01-01'}, we are pleased to confirm your appointment at Apaar Logistics & Cold Supply Chain Pvt Ltd.\n\nRegards,\nHR Department`,
            issued_date: emp.date_of_joining || '2026-01-01',
            status: 'acknowledged',
            acknowledged_at: new Date(),
          }
        ]);
        console.log(`Seeded 2 letters for ${emp.name}`);
      }
    }

    console.log('Database profile patching and seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during patch profile fields execution:', error);
    process.exit(1);
  }
};

patch();
