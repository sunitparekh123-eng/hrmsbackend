/**
 * Application constants
 */

// Employee roles
const ROLES = {
  ADMIN: 'admin',
  HR: 'hr',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
};

// Employee statuses
const EMPLOYEE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  RESIGNED: 'resigned',
};

// Attendance statuses
const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  HALF_DAY: 'half_day',
  WEEKEND: 'weekend',
  HOLIDAY: 'holiday',
};

// Leave types
const LEAVE_TYPES = {
  EL: 'el',    // Earned Leave — single leave type system
};

// Leave request statuses
const LEAVE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

// Payslip statuses
const PAYSLIP_STATUS = {
  DRAFT: 'draft',
  PROCESSED: 'processed',
  PAID: 'paid',
};

// Loan types
const LOAN_TYPES = {
  PERSONAL: 'personal',
  EMERGENCY: 'emergency',
  EDUCATION: 'education',
  VEHICLE: 'vehicle',
  HOUSING: 'housing',
};

// Loan statuses
const LOAN_STATUS = {
  ACTIVE: 'active',
  CLOSED: 'closed',
  DEFAULTED: 'defaulted',
};

// Performance rating levels
const PERFORMANCE_RATING = {
  EXCELLENT: 'excellent',
  GOOD: 'good',
  AVERAGE: 'average',
  BELOW_AVERAGE: 'below_average',
  POOR: 'poor',
};

// Document types
const DOCUMENT_TYPES = {
  ID_PROOF: 'id_proof',
  ADDRESS_PROOF: 'address_proof',
  CERTIFICATE: 'certificate',
  OFFER_LETTER: 'offer_letter',
  CONTRACT: 'contract',
  OTHER: 'other',
};

// Letter types
const LETTER_TYPES = {
  OFFER: 'offer',
  APPOINTMENT: 'appointment',
  PROMOTION: 'promotion',
  TRANSFER: 'transfer',
  RESIGNATION: 'resignation',
  EXPERIENCE: 'experience',
  RELIEVING: 'relieving',
};

// Notification types
const NOTIFICATION_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  SUCCESS: 'success',
  ERROR: 'error',
  REMINDER: 'reminder',
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// Geo-fence
const GEO_FENCE = {
  DEFAULT_RADIUS: 200, // meters
  MAX_RADIUS: 5000,    // meters
};

// Professional Tax slabs (Maharashtra — monthly)
const PT_SLABS = [
  { from: 0, to: 15000, amount: 0 },
  { from: 15001, to: 25000, amount: 125 },
  { from: 25001, to: 33333, amount: 167 },
  { from: 33334, to: Infinity, amount: 208 },
];

// Salary revision types
const SALARY_REVISION_TYPES = {
  INITIAL: 'initial',
  APPRAISAL: 'appraisal',
  PROMOTION: 'promotion',
  CORRECTION: 'correction',
};

// PF & ESIC contribution modes
const PF_CONTRIBUTION_MODES = {
  NONE: 'none',
  EMPLOYEE_ONLY: 'employee_only',
  EMPLOYER_ONLY: 'employer_only',
  SHARED: 'shared',
};

const ESIC_CONTRIBUTION_MODES = {
  NONE: 'none',
  SHARED: 'shared',
};

// Default statutory rates (overridable per employee)
const PF_RATES = {
  EMPLOYEE: 0.12,
  EMPLOYER: 0.12,
};

const ESIC_RATES = {
  EMPLOYEE: 0.0075,
  EMPLOYER: 0.0325,
};

const ESIC_WAGE_THRESHOLD = 21000;

// Default leave allocations per type (annual)
// Single leave type system — 1 leave earned per month, max 2-month carry-forward
const LEAVE_ACCRUAL = {
  MONTHLY_ACCRUAL: 1,         // 1 leave per month
  MAX_CARRY_FORWARD_MONTHS: 2, // carry forward max 2 months, then resets to 0
};

module.exports = {
  ROLES,
  EMPLOYEE_STATUS,
  ATTENDANCE_STATUS,
  LEAVE_TYPES,
  LEAVE_ACCRUAL,
  LEAVE_STATUS,
  PAYSLIP_STATUS,
  LOAN_TYPES,
  LOAN_STATUS,
  PERFORMANCE_RATING,
  DOCUMENT_TYPES,
  LETTER_TYPES,
  NOTIFICATION_TYPES,
  PAGINATION,
  GEO_FENCE,
  PT_SLABS,
  SALARY_REVISION_TYPES,
  PF_CONTRIBUTION_MODES,
  ESIC_CONTRIBUTION_MODES,
  PF_RATES,
  ESIC_RATES,
  ESIC_WAGE_THRESHOLD,
};