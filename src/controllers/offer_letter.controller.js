const offerLetterService = require('../services/offer_letter.service');
const { Employee, SalaryStructure } = require('../models');
const { success } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Offer Letter controller — handles preview and re-send of offer letters
 * separate from the generic letter CRUD.
 */
class OfferLetterController {
  /**
   * GET /api/v1/letters/offer-letter/:employeeId/preview
   * Generate and return the offer letter PDF for preview (no DB save, no email).
   * The PDF is streamed directly as application/pdf.
   */
  async previewOfferLetter(req, res, next) {
    try {
      const { employeeId } = req.params;

      const employee = await Employee.findByPk(employeeId);
      if (!employee) {
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }

      const salaryStructure = await SalaryStructure.findOne({
        where: { employee_id: employeeId },
        order: [['effective_from', 'DESC']],
      });
      if (!salaryStructure) {
        return res.status(404).json({ success: false, message: 'Salary structure not found for this employee' });
      }

      const pdfBuffer = await offerLetterService.generateOfferLetterPDF(employee, salaryStructure);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="offer-letter-${employee.emp_code}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.send(pdfBuffer);
    } catch (err) {
      logger.error(`Preview offer letter error: ${err.message}`);
      return next(err);
    }
  }

  /**
   * POST /api/v1/letters/offer-letter/:employeeId/send
   * Generate, save, and email the offer letter to the employee.
   * Body: { password?: string } — plain password for the welcome email (defaults to "Welcome@123").
   */
  async sendOfferLetter(req, res, next) {
    try {
      const { employeeId } = req.params;
      const { password } = req.body;
      const plainPassword = password || 'Welcome@123';
      const issuedBy = req.employee ? req.employee.id : null;

      const employee = await Employee.findByPk(employeeId);
      if (!employee) {
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }

      const salaryStructure = await SalaryStructure.findOne({
        where: { employee_id: employeeId },
        order: [['effective_from', 'DESC']],
      });
      if (!salaryStructure) {
        return res.status(404).json({ success: false, message: 'Salary structure not found for this employee' });
      }

      const { letter, emailResult } = await offerLetterService.issueAndSendOfferLetter(
        employee,
        salaryStructure,
        plainPassword,
        issuedBy,
      );

      return success(res, 'Offer letter sent successfully', {
        letter_id: letter.id,
        email_accepted: emailResult.accepted,
        email_rejected: emailResult.rejected,
      }, 200);
    } catch (err) {
      logger.error(`Send offer letter error: ${err.message}`);
      return next(err);
    }
  }
}

module.exports = new OfferLetterController();