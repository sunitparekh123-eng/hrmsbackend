const { error } = require('../utils/response');
const { ROLES } = require('../utils/constants');

/**
 * Role-based access control middleware
 * @param {String[]} allowedRoles - Array of roles that can access the route
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.employee) {
      return error(res, 'Authentication required', 401);
    }

    if (!allowedRoles.includes(req.employee.role)) {
      return error(res, `Access denied. Required role: ${allowedRoles.join(' or ')}`, 403);
    }

    next();
  };
};

/**
 * Self-or-admin middleware factory — allows employee to access their own data, or admin/hr to access any
 * Checks req.params.id against req.employee.id
 */
const selfOrAdmin = () => {
  return (req, res, next) => {
    if (!req.employee) {
      return error(res, 'Authentication required', 401);
    }

    const targetId = parseInt(req.params.id || req.params.employee_id || req.params.employeeId);
    const isSelf = req.employee.id === targetId;
    const isAdminOrHR = [ROLES.ADMIN, ROLES.HR].includes(req.employee.role);

    if (!isSelf && !isAdminOrHR) {
      return error(res, 'Access denied. You can only access your own data', 403);
    }

    next();
  };
};

module.exports = { authorize, selfOrAdmin };