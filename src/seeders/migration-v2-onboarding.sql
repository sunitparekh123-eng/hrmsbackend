-- ============================================================
-- HRMS Migration: Employee Onboarding + Salary Structure
-- Run against: hrms_db (MySQL 8.0)
-- Date: 2026-06-10
-- ============================================================

-- 1. Add columns to employees table
ALTER TABLE employees
  ADD COLUMN bank_name VARCHAR(100) NULL COMMENT 'Bank name for salary disbursement' AFTER esic_applicable,
  ADD COLUMN bank_account_number VARCHAR(30) NULL COMMENT 'Bank account number' AFTER bank_name,
  ADD COLUMN ifsc_code VARCHAR(15) NULL COMMENT 'IFSC code' AFTER bank_account_number,
  ADD COLUMN pan_number VARCHAR(10) NULL COMMENT 'Permanent Account Number' AFTER ifsc_code,
  ADD COLUMN pf_number VARCHAR(30) NULL COMMENT 'PF account number' AFTER pan_number,
  ADD COLUMN uan VARCHAR(20) NULL COMMENT 'Universal Account Number' AFTER pf_number,
  ADD COLUMN location VARCHAR(100) NULL COMMENT 'Work location / city' AFTER uan,
  ADD COLUMN company_name VARCHAR(150) NULL COMMENT 'Legal entity name' AFTER location,
  ADD COLUMN emergency_contact_name VARCHAR(100) NULL COMMENT 'Emergency contact person' AFTER company_name,
  ADD COLUMN emergency_contact_relation VARCHAR(50) NULL COMMENT 'Relation to employee' AFTER emergency_contact_name;

-- 2. Add columns to payslips table (rename esi → esi_employee first)
ALTER TABLE payslips
  CHANGE COLUMN esi esi_employee DECIMAL(12,2) NULL DEFAULT 0 COMMENT 'ESIC employee contribution (0.75%)';

ALTER TABLE payslips
  ADD COLUMN esi_employer DECIMAL(12,2) NULL DEFAULT 0 COMMENT 'ESIC employer contribution (3.25%)' AFTER esi_employee,
  ADD COLUMN professional_tax DECIMAL(12,2) NULL DEFAULT 0 COMMENT 'Professional Tax' AFTER esi_employer,
  ADD COLUMN hra DECIMAL(12,2) NULL DEFAULT 0 COMMENT 'House Rent Allowance' AFTER professional_tax,
  ADD COLUMN special_allowance DECIMAL(12,2) NULL DEFAULT 0 AFTER hra,
  ADD COLUMN other_allowance DECIMAL(12,2) NULL DEFAULT 0 AFTER special_allowance,
  ADD COLUMN conveyance DECIMAL(12,2) NULL DEFAULT 0 AFTER other_allowance,
  ADD COLUMN medical_allowance DECIMAL(12,2) NULL DEFAULT 0 AFTER conveyance,
  ADD COLUMN working_days INT NULL DEFAULT 26 COMMENT 'Total working days in month' AFTER medical_allowance,
  ADD COLUMN paid_days INT NULL DEFAULT 26 COMMENT 'Days actually paid' AFTER working_days,
  ADD COLUMN lop_days INT NULL DEFAULT 0 COMMENT 'Loss of Pay days' AFTER paid_days,
  ADD COLUMN ctc DECIMAL(12,2) NULL DEFAULT 0 COMMENT 'Monthly CTC = gross + employer contributions' AFTER lop_days;

-- 3. Create salary_structures table
CREATE TABLE IF NOT EXISTS salary_structures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  fixed_gross DECIMAL(12,2) NOT NULL,
  basic_salary DECIMAL(12,2) NOT NULL,
  hra DECIMAL(12,2) NOT NULL DEFAULT 0,
  special_allowance DECIMAL(12,2) NOT NULL DEFAULT 0,
  other_allowance DECIMAL(12,2) NOT NULL DEFAULT 0,
  conveyance DECIMAL(12,2) NOT NULL DEFAULT 0,
  medical_allowance DECIMAL(12,2) NOT NULL DEFAULT 0,
  pf_applicable TINYINT(1) NOT NULL DEFAULT 1,
  pf_ceiling TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'If 1, PF calculated on min(basic, 15000)',
  esic_applicable TINYINT(1) NOT NULL DEFAULT 0,
  pt_applicable TINYINT(1) NOT NULL DEFAULT 1,
  effective_work_days INT NOT NULL DEFAULT 26 COMMENT 'Working days for LOP calc',
  effective_from DATE NOT NULL,
  effective_to DATE NULL COMMENT 'NULL = currently active',
  created_by INT NULL,
  updated_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_ss_employee (employee_id),
  INDEX idx_ss_effective_from (effective_from),
  CONSTRAINT fk_ss_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Create salary_revisions table
CREATE TABLE IF NOT EXISTS salary_revisions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  previous_gross DECIMAL(12,2) NULL COMMENT 'NULL for initial setup',
  new_gross DECIMAL(12,2) NOT NULL,
  previous_basic DECIMAL(12,2) NULL,
  new_basic DECIMAL(12,2) NOT NULL,
  revision_type ENUM('initial', 'appraisal', 'promotion', 'correction') NOT NULL,
  effective_date DATE NOT NULL,
  remarks TEXT NULL,
  approved_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sr_employee (employee_id),
  INDEX idx_sr_effective_date (effective_date),
  INDEX idx_sr_revision_type (revision_type),
  CONSTRAINT fk_sr_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_sr_approved_by FOREIGN KEY (approved_by) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Backfill: Create salary_structures for existing employees from employee-level fields
INSERT INTO salary_structures (employee_id, fixed_gross, basic_salary, hra, special_allowance, other_allowance, pf_applicable, pf_ceiling, esic_applicable, effective_from, created_at, updated_at)
SELECT
  e.id,
  e.fixed_gross,
  e.basic_salary,
  ROUND(ROUND(e.fixed_gross * 0.40, 2) * 0.40, 2) AS hra,
  0 AS special_allowance,
  ROUND(e.fixed_gross - ROUND(e.fixed_gross * 0.40, 2) - ROUND(ROUND(e.fixed_gross * 0.40, 2) * 0.40, 2), 2) AS other_allowance,
  e.pf_applicable,
  e.pf_ceiling,
  e.esic_applicable,
  COALESCE(e.date_of_joining, CURDATE()) AS effective_from,
  NOW(),
  NOW()
FROM employees e
WHERE e.fixed_gross > 0
  AND e.id NOT IN (SELECT employee_id FROM salary_structures);

-- 6. Backfill: Create salary_revisions for existing employees
INSERT INTO salary_revisions (employee_id, previous_gross, new_gross, previous_basic, new_basic, revision_type, effective_date, remarks, created_at, updated_at)
SELECT
  e.id,
  NULL AS previous_gross,
  e.fixed_gross,
  NULL AS previous_basic,
  e.basic_salary,
  'initial' AS revision_type,
  COALESCE(e.date_of_joining, CURDATE()) AS effective_date,
  'Backfilled from employee record' AS remarks,
  NOW(),
  NOW()
FROM employees e
WHERE e.fixed_gross > 0
  AND e.id NOT IN (SELECT employee_id FROM salary_revisions);