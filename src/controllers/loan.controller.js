const loanService = require('../services/loan.service');
const { success, paginated } = require('../utils/response');
const logger = require('../utils/logger');

class LoanController {
  async getMyLoans(req, res, next) {
    try {
      const employeeId = req.employee.id;
      const result = await loanService.getEmployeeLoans(employeeId);
      return success(res, 'My loans fetched', result, 200);
    } catch (err) {
      logger.error(`Get my loans error: ${err.message}`);
      return next(err);
    }
  }

  async getLoanById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await loanService.getLoanById(id, req.employee.id);
      return success(res, 'Loan fetched', result, 200);
    } catch (err) {
      logger.error(`Get loan by id error: ${err.message}`);
      return next(err);
    }
  }

  async getLoanPayments(req, res, next) {
    try {
      const { id } = req.params;
      const result = await loanService.getLoanPayments(id, req.employee.id);
      return success(res, 'Loan payments fetched', result, 200);
    } catch (err) {
      logger.error(`Get loan payments error: ${err.message}`);
      return next(err);
    }
  }

  async applyLoan(req, res, next) {
    try {
      let employeeId = req.employee.id;
      let approvedBy = null;
      if ((req.employee.role === 'admin' || req.employee.role === 'hr') && req.body.employee_id) {
        employeeId = req.body.employee_id;
        approvedBy = req.employee.id;
      }
      const loanData = req.body;
      const result = await loanService.applyLoan(employeeId, loanData, approvedBy);
      return success(res, 'Loan application submitted', result, 201);
    } catch (err) {
      logger.error(`Apply loan error: ${err.message}`);
      return next(err);
    }
  }

  async getAllLoans(req, res, next) {
    try {
      const { page, limit, status, type } = req.query;
      const result = await loanService.getAllLoans({ page, limit, status, type });
      return paginated(res, 'All loans fetched', result.data, result.pagination, 200);
    } catch (err) {
      logger.error(`Get all loans error: ${err.message}`);
      return next(err);
    }
  }

  async getEmployeeLoans(req, res, next) {
    try {
      const { employeeId } = req.params;
      const result = await loanService.getEmployeeLoans(employeeId);
      return success(res, 'Employee loans fetched', result, 200);
    } catch (err) {
      logger.error(`Get employee loans error: ${err.message}`);
      return next(err);
    }
  }

  async getLoanByIdAdmin(req, res, next) {
    try {
      const { id } = req.params;
      const result = await loanService.getLoanByIdAdmin(id);
      return success(res, 'Loan fetched', result, 200);
    } catch (err) {
      logger.error(`Get loan by id (admin) error: ${err.message}`);
      return next(err);
    }
  }

  async approveLoan(req, res, next) {
    try {
      const { id } = req.params;
      const result = await loanService.approveLoan(id, req.employee.id);
      return success(res, 'Loan approved successfully', result, 200);
    } catch (err) {
      logger.error(`Approve loan error: ${err.message}`);
      return next(err);
    }
  }

  async rejectLoan(req, res, next) {
    try {
      const { id } = req.params;
      const { remarks } = req.body;
      const result = await loanService.rejectLoan(id, remarks, req.employee.id);
      return success(res, 'Loan rejected', result, 200);
    } catch (err) {
      logger.error(`Reject loan error: ${err.message}`);
      return next(err);
    }
  }

  async recordLoanPayment(req, res, next) {
    try {
      const { id } = req.params;
      const paymentData = req.body;
      const result = await loanService.recordLoanPayment(id, paymentData);
      return success(res, 'Loan payment recorded', result, 201);
    } catch (err) {
      logger.error(`Record loan payment error: ${err.message}`);
      return next(err);
    }
  }
}

module.exports = new LoanController();