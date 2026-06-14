-- ============================================================
-- HRMS Migration: Phase 5/6 Catch-up — Employee Columns
-- Run against: hrms_db (MySQL 8.0)
-- Date: 2026-06-10
-- Description:
--   Adds bank details, statutory identifiers, location,
--   company name, and emergency contact columns to employees
--   table that were defined in the Sequelize model but never
--   ALTERed into the live database.
-- ============================================================

ALTER TABLE employees
  -- Bank details
  ADD COLUMN bank_name VARCHAR(100) NULL
    COMMENT 'Bank name for salary disbursement'
    AFTER esic_contribution_mode,
  ADD COLUMN bank_account_number VARCHAR(30) NULL
    COMMENT 'Bank account number (encrypted/hashed at app level)'
    AFTER bank_name,
  ADD COLUMN ifsc_code VARCHAR(15) NULL
    COMMENT 'IFSC code for NEFT/RTGS'
    AFTER bank_account_number,
  -- Statutory identifiers
  ADD COLUMN pan_number VARCHAR(10) NULL
    COMMENT 'Permanent Account Number'
    AFTER ifsc_code,
  ADD COLUMN pf_number VARCHAR(30) NULL
    COMMENT 'PF account number'
    AFTER pan_number,
  ADD COLUMN uan VARCHAR(20) NULL
    COMMENT 'Universal Account Number (UAN)'
    AFTER pf_number,
  -- Location & legal entity
  ADD COLUMN location VARCHAR(100) NULL
    COMMENT 'Work location / city'
    AFTER uan,
  ADD COLUMN company_name VARCHAR(150) NULL
    COMMENT 'Legal entity name for multi-company setups'
    AFTER location,
  -- Emergency contact details
  ADD COLUMN emergency_contact_name VARCHAR(100) NULL
    COMMENT 'Emergency contact person name'
    AFTER company_name,
  ADD COLUMN emergency_contact_relation VARCHAR(50) NULL
    COMMENT 'Relation to employee'
    AFTER emergency_contact_name;

-- ============================================================
-- ROLLBACK (if needed):
-- ============================================================
-- ALTER TABLE employees
--   DROP COLUMN bank_name,
--   DROP COLUMN bank_account_number,
--   DROP COLUMN ifsc_code,
--   DROP COLUMN pan_number,
--   DROP COLUMN pf_number,
--   DROP COLUMN uan,
--   DROP COLUMN location,
--   DROP COLUMN company_name,
--   DROP COLUMN emergency_contact_name,
--   DROP COLUMN emergency_contact_relation;