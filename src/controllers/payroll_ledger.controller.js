const payrollLedgerService = require('../services/payroll_ledger.service');
const { success, paginated } = require('../utils/response');
const logger = require('../utils/logger');

class PayrollLedgerController {
  // ── GET /payroll/ledger — current-cycle ledger rows ──
  async getCurrentLedger(req, res, next) {
    try {
      const result = await payrollLedgerService.getCurrentLedger();
      return success(res, 'Current ledger fetched', result, 200);
    } catch (err) {
      logger.error(`[PayrollLedger] getCurrentLedger error: ${err.message}`);
      return next(err);
    }
  }

  // ── GET /payroll/ledger/:cycleId — specific cycle detail ──
  async getLedgerByCycleId(req, res, next) {
    try {
      const { cycleId } = req.params;
      const result = await payrollLedgerService.getLedgerByCycleId(cycleId);
      return success(res, 'Ledger cycle fetched', result, 200);
    } catch (err) {
      logger.error(`[PayrollLedger] getLedgerByCycleId error: ${err.message}`);
      return next(err);
    }
  }

  // ── GET /payroll/history — past cycles summary ──
  async getCycleHistory(req, res, next) {
    try {
      const { page = 1, limit = 20, year } = req.query;
      const result = await payrollLedgerService.getCycleHistory({ page, limit, year });
      return paginated(res, 'Cycle history fetched', result.data, result.pagination, 200);
    } catch (err) {
      logger.error(`[PayrollLedger] getCycleHistory error: ${err.message}`);
      return next(err);
    }
  }

  // ── PATCH /payroll/entry/:entryId — update a single entry ──
  async updateEntry(req, res, next) {
    try {
      const { entryId } = req.params;
      const data = req.body;
      const result = await payrollLedgerService.updateEntry(entryId, data);
      return success(res, 'Entry updated', result, 200);
    } catch (err) {
      logger.error(`[PayrollLedger] updateEntry error: ${err.message}`);
      return next(err);
    }
  }

  // ── PATCH /payroll/entry/:entryId/status — change entry status ──
  async updateEntryStatus(req, res, next) {
    try {
      const { entryId } = req.params;
      const { status: newStatus } = req.body;
      const result = await payrollLedgerService.updateEntryStatus(entryId, newStatus);
      return success(res, 'Entry status updated', result, 200);
    } catch (err) {
      logger.error(`[PayrollLedger] updateEntryStatus error: ${err.message}`);
      return next(err);
    }
  }

  // ── POST /payroll/disburse/:cycleId — disburse entire cycle ──
  async disburseCycle(req, res, next) {
    try {
      const { cycleId } = req.params;
      const { mode, reference, authorizedBy, remarks } = req.body;
      const result = await payrollLedgerService.disburseCycle(cycleId, {
        mode,
        reference,
        authorizedBy,
        remarks,
      });
      return success(res, 'Cycle disbursed successfully', result, 200);
    } catch (err) {
      logger.error(`[PayrollLedger] disburseCycle error: ${err.message}`);
      return next(err);
    }
  }
}

module.exports = new PayrollLedgerController();