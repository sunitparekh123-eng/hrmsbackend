-- ============================================================
-- HRMS Migration: Phase 8 — PF/ESIC Contribution Modes
-- Run against: hrms_db (MySQL 8.0)
-- Date: 2026-06-10
-- Description:
--   Adds per-employee PF/ESIC contribution mode configuration
--   allowing production-industry scenarios:
--     - PF: none | employee_only | employer_only | shared
--     - ESIC: none | shared
--   All new columns default to current behavior (shared, standard rates)
-- ============================================================

-- 1. Add contribution mode columns to employees table
ALTER TABLE employees
  ADD COLUMN pf_contribution_mode ENUM('none', 'employee_only', 'employer_only', 'shared') 
    NOT NULL DEFAULT 'shared' 
    COMMENT 'Who pays PF — shared (default), employee_only, employer_only, or none' 
    AFTER pf_ceiling,
  ADD COLUMN esic_contribution_mode ENUM('none', 'shared') 
    NOT NULL DEFAULT 'shared' 
    COMMENT 'Who pays ESIC — shared (legally mandated) or none' 
    AFTER esic_applicable;

-- 2. Add contribution mode + rate columns to salary_structures table
ALTER TABLE salary_structures
  ADD COLUMN pf_contribution_mode ENUM('none', 'employee_only', 'employer_only', 'shared') 
    NOT NULL DEFAULT 'shared' 
    COMMENT 'Who pays PF — shared (default), employee_only, employer_only, or none' 
    AFTER pf_ceiling,
  ADD COLUMN pf_employee_rate DECIMAL(5,4) 
    NOT NULL DEFAULT 0.1200 
    COMMENT 'Employee PF contribution rate (e.g., 0.12 = 12%)' 
    AFTER pf_contribution_mode,
  ADD COLUMN pf_employer_rate DECIMAL(5,4) 
    NOT NULL DEFAULT 0.1200 
    COMMENT 'Employer PF contribution rate (e.g., 0.12 = 12%)' 
    AFTER pf_employee_rate,
  ADD COLUMN esic_contribution_mode ENUM('none', 'shared') 
    NOT NULL DEFAULT 'shared' 
    COMMENT 'Who pays ESIC — shared (legally mandated) or none' 
    AFTER esic_applicable,
  ADD COLUMN esic_employee_rate DECIMAL(5,4) 
    NOT NULL DEFAULT 0.0075 
    COMMENT 'Employee ESIC contribution rate (e.g., 0.0075 = 0.75%)' 
    AFTER esic_contribution_mode,
  ADD COLUMN esic_employer_rate DECIMAL(5,4) 
    NOT NULL DEFAULT 0.0325 
    COMMENT 'Employer ESIC contribution rate (e.g., 0.0325 = 3.25%)' 
    AFTER esic_employee_rate;

-- ============================================================
-- ROLLBACK (if needed):
-- ============================================================
-- ALTER TABLE employees
--   DROP COLUMN pf_contribution_mode,
--   DROP COLUMN esic_contribution_mode;
-- 
-- ALTER TABLE salary_structures
--   DROP COLUMN pf_contribution_mode,
--   DROP COLUMN pf_employee_rate,
--   DROP COLUMN pf_employer_rate,
--   DROP COLUMN esic_contribution_mode,
--   DROP COLUMN esic_employee_rate,
--   DROP COLUMN esic_employer_rate;