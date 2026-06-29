const payrollService = require('../services/payroll.service');
const { success, paginated } = require('../utils/response');
const logger = require('../utils/logger');
const PDFDocument = require('pdfkit');
const { salaryToWords } = require('../utils/amount-to-words');

// Company logo embedded as base64 buffer — deploys with source code,
// no file-system dependency required on the production server.
const COMPANY_LOGO_BUFFER = require('../config/company_logo');

class PayrollController {
  async getMyPayslips(req, res, next) {
    try {
      const employeeId = req.employee.id;
      const { page, limit, year } = req.query;
      const result = await payrollService.getPayslips(employeeId, { page, limit, year });
      return paginated(res, 'Payslips fetched', result.data, result.pagination, 200);
    } catch (err) {
      logger.error(`Get my payslips error: ${err.message}`);
      return next(err);
    }
  }

  async getPayslipById(req, res, next) {
    try {
      const { id } = req.params;
      const employeeId = req.employee.id;
      const result = await payrollService.getPayslipById(id, employeeId);
      return success(res, 'Payslip fetched', result, 200);
    } catch (err) {
      logger.error(`Get payslip by id error: ${err.message}`);
      return next(err);
    }
  }

  async getCurrentPayslip(req, res, next) {
    try {
      const employeeId = req.employee.id;
      const result = await payrollService.getCurrentPayslip(employeeId);
      return success(res, 'Current payslip fetched', result, 200);
    } catch (err) {
      logger.error(`Get current payslip error: ${err.message}`);
      return next(err);
    }
  }

  async getEmployeePayslips(req, res, next) {
    try {
      const { employeeId } = req.params;
      const { page, limit, year } = req.query;
      const result = await payrollService.getPayslips(employeeId, { page, limit, year });
      return paginated(res, 'Employee payslips fetched', result.data, result.pagination, 200);
    } catch (err) {
      logger.error(`Get employee payslips error: ${err.message}`);
      return next(err);
    }
  }

  async generatePayslips(req, res, next) {
    try {
      const { month, year, employeeIds } = req.body;
      const result = await payrollService.generatePayslips(month, year, employeeIds);
      return success(res, 'Payslips generated successfully', result, 201);
    } catch (err) {
      logger.error(`Generate payslips error: ${err.message}`);
      return next(err);
    }
  }

  async markPayslipPaid(req, res, next) {
    try {
      const { id } = req.params;
      const result = await payrollService.markPayslipPaid(id);
      return success(res, 'Payslip marked as paid', result, 200);
    } catch (err) {
      logger.error(`Mark payslip paid error: ${err.message}`);
      return next(err);
    }
  }

  async downloadPayslipPdf(req, res, next) {
    try {
      const { id } = req.params;
      const employeeId = req.employee.id;
      const payslip = await payrollService.getPayslipById(id, employeeId);

      // Fetch employee details
      const { Employee, Office, Company } = require('../models');
      const emp = await Employee.findByPk(payslip.employee_id, {
        include: [{ model: Office, as: 'office' }, { model: Company, as: 'company' }]
      });
      if (!emp) throw new Error('Employee not found');

      const doc = new PDFDocument({ margin: 15, size: 'A5', layout: 'landscape' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Payslip_${emp.name.replace(/\s+/g, '_')}_${payslip.month}_${payslip.year}.pdf"`,
      );
      doc.pipe(res);

      const primaryColor = '#0f172a'; // slate-900
      const accentColor = '#2563eb'; // blue-600
      const textColor = '#1e1e1e';
      const mutedColor = '#646464';
      const lineColor = '#e2e8f0'; // slate-200

      // ── Top Accent Bar ──
      doc.rect(0, 0, doc.page.width, 4).fill(accentColor);

      // ── Header ──
      // Company logo (left) with fallback to text
      if (COMPANY_LOGO_BUFFER) {
        try {
          doc.image(COMPANY_LOGO_BUFFER, 15, 12, { fit: [34, 34] });
        } catch (e) {
          doc.font('Helvetica-Bold').fontSize(20).fillColor(primaryColor);
          doc.text(emp.company?.name || 'Apaar Logistics Pvt Ltd', 15, 18);
        }
      } else {
        doc.font('Helvetica-Bold').fontSize(20).fillColor(primaryColor);
        doc.text(emp.company?.name || 'Apaar Logistics Pvt Ltd', 15, 18);
      }

      doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor);
      doc.text(emp.company?.name || 'Apaar Logistics Pvt Ltd', 0, 15, { align: 'right', width: doc.page.width - 15 });
      doc.font('Helvetica').fontSize(8).fillColor(mutedColor);
      doc.text(emp.office?.address || 'Corporate Office: Mumbai, India', 0, 26, { align: 'right', width: doc.page.width - 15 });

      // Title
      doc.rect(15, 38, doc.page.width - 30, 16).fill('#f8fafc');
      doc.font('Helvetica-Bold').fontSize(9).fillColor(primaryColor);
      doc.text(`PAYSLIP FOR THE MONTH OF ${payslip.month.toUpperCase()} ${payslip.year}`, 0, 43, { align: 'center', width: doc.page.width });

      // ── Employee Profile (Clean Grid) ──
      let currentY = 60;
      doc.fontSize(8);

      const drawLabelValue = (label, value, x, y) => {
          doc.font('Helvetica-Bold').fillColor(mutedColor);
          doc.text(label, x, y);
          doc.font('Helvetica-Bold').fillColor(textColor);
          doc.text(value, x + 60, y);
      };

      const col1 = 15;
      const col2 = doc.page.width / 3 + 10;
      const col3 = (doc.page.width / 3) * 2 + 5;

      drawLabelValue("Name:", emp.name || "--", col1, currentY);
      drawLabelValue("Emp ID:", emp.emp_code || "--", col2, currentY);
      drawLabelValue("UAN:", emp.uan || "--", col3, currentY);

      currentY += 12;
      drawLabelValue("Designation:", emp.designation || "--", col1, currentY);
      drawLabelValue("Department:", emp.department || "--", col2, currentY);
      drawLabelValue("PF No:", emp.pf_number || "--", col3, currentY);

      currentY += 12;
      drawLabelValue("Bank Name:", emp.bank_name || "--", col1, currentY);
      drawLabelValue("A/C No:", emp.bank_account_number || "--", col2, currentY);
      drawLabelValue("Days Worked:", String(payslip.paid_days || 0), col3, currentY);

      currentY += 18;

      // ── Salary Details Table (4 Columns) ──
      const earnings = [
        ['Basic Salary', payslip.basic_salary],
        ['House Rent Allowance', payslip.hra],
        payslip.other_allowance > 0 ? ['Special Allowance', payslip.other_allowance] : null,
        payslip.conveyance > 0 ? ['Conveyance Allowance', payslip.conveyance] : null,
        payslip.medical_allowance > 0 ? ['Medical Allowance', payslip.medical_allowance] : null,
      ].filter(Boolean);

      const deductions = [
        payslip.pf_employee > 0 ? ['Provident Fund (PF)', payslip.pf_employee] : null,
        payslip.esi_employee > 0 ? ['Employee State Ins. (ESI)', payslip.esi_employee] : null,
        payslip.professional_tax > 0 ? ['Professional Tax (PT)', payslip.professional_tax] : null,
        payslip.loan_deduction > 0 ? ['Loan Deduction', payslip.loan_deduction] : null,
      ].filter(Boolean);

      const startX = 15;
      const boxWidth = doc.page.width - 30;
      
      const col1W = boxWidth * 0.35;
      const col2W = boxWidth * 0.15;
      const col3W = boxWidth * 0.35;
      const col4W = boxWidth * 0.15;

      const col1End = startX + col1W;
      const col2End = col1End + col2W;
      const col3End = col2End + col3W;

      // Table Header
      doc.rect(startX, currentY, boxWidth, 16).fillAndStroke('#f1f5f9', lineColor);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor);
      doc.text('Earnings', startX + 5, currentY + 5);
      doc.text('Amount (INR)', col1End, currentY + 5, { width: col2W - 5, align: 'right' });
      doc.text('Deductions', col2End + 5, currentY + 5);
      doc.text('Amount (INR)', col3End, currentY + 5, { width: col4W - 5, align: 'right' });

      doc.moveTo(col1End, currentY).lineTo(col1End, currentY + 16).stroke();
      doc.moveTo(col2End, currentY).lineTo(col2End, currentY + 16).stroke();
      doc.moveTo(col3End, currentY).lineTo(col3End, currentY + 16).stroke();

      currentY += 16;
      let tableStartY = currentY;

      // Data Rows
      const rowCount = Math.max(earnings.length, deductions.length);
      for (let i = 0; i < rowCount; i++) {
        const rowHeight = 16;
        
        if (earnings[i]) {
          doc.font('Helvetica').fillColor(textColor);
          doc.text(earnings[i][0], startX + 5, currentY + 5);
          doc.text(Number(earnings[i][1]).toLocaleString('en-IN', {minimumFractionDigits: 2}), col1End, currentY + 5, { width: col2W - 5, align: 'right' });
        }
        if (deductions[i]) {
          doc.font('Helvetica').fillColor(textColor);
          doc.text(deductions[i][0], col2End + 5, currentY + 5);
          doc.text(Number(deductions[i][1]).toLocaleString('en-IN', {minimumFractionDigits: 2}), col3End, currentY + 5, { width: col4W - 5, align: 'right' });
        }
        
        currentY += rowHeight;
      }
      
      // Draw inner lines and outer border
      const tableHeight = currentY - tableStartY;
      doc.rect(startX, tableStartY, boxWidth, tableHeight).strokeColor(lineColor).lineWidth(0.5).stroke();
      doc.moveTo(col1End, tableStartY).lineTo(col1End, currentY).stroke();
      doc.moveTo(col2End, tableStartY).lineTo(col2End, currentY).stroke();
      doc.moveTo(col3End, tableStartY).lineTo(col3End, currentY).stroke();

      // Totals
      doc.rect(startX, currentY, boxWidth, 16).fillAndStroke('#ffffff', lineColor);
      doc.moveTo(col1End, currentY).lineTo(col1End, currentY + 16).stroke();
      doc.moveTo(col2End, currentY).lineTo(col2End, currentY + 16).stroke();
      doc.moveTo(col3End, currentY).lineTo(col3End, currentY + 16).stroke();

      doc.font('Helvetica-Bold').fillColor(primaryColor);
      doc.text('Gross Earnings', startX + 5, currentY + 5);
      doc.text(Number(payslip.gross_salary || 0).toLocaleString('en-IN', {minimumFractionDigits: 2}), col1End, currentY + 5, { width: col2W - 5, align: 'right' });

      doc.text('Gross Deductions', col2End + 5, currentY + 5);
      doc.text(Number(payslip.total_deductions || 0).toLocaleString('en-IN', {minimumFractionDigits: 2}), col3End, currentY + 5, { width: col4W - 5, align: 'right' });

      currentY += 25;

      // ── Excel Data Summary Section (Net, PF Employer, ESIC Employer, CTC) ──
      doc.rect(startX, currentY, boxWidth, 40).fillAndStroke('#f8fafc', lineColor);

      // Net Pay Highlight
      doc.rect(startX, currentY, boxWidth * 0.35, 40).fill('#dcfce7'); // green-100
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#166534'); // green-800
      doc.text("Net Take Home", startX, currentY + 12, { align: 'center', width: boxWidth * 0.35 });
      doc.fontSize(14);
      doc.text(`INR ${Number(payslip.net_salary || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}`, startX, currentY + 25, { align: 'center', width: boxWidth * 0.35 });

      // Divider
      doc.moveTo(startX + boxWidth * 0.35, currentY).lineTo(startX + boxWidth * 0.35, currentY + 40).strokeColor(lineColor).stroke();

      // CTC & Employer Contributions
      doc.fontSize(8).fillColor(mutedColor);
      doc.text("Employer PF:", startX + boxWidth * 0.35 + 15, currentY + 12);
      doc.text("Employer ESIC:", startX + boxWidth * 0.35 + 15, currentY + 25);
      
      doc.font('Helvetica-Bold').fillColor(textColor);
      doc.text(Number(payslip.pf_employer || 0).toLocaleString('en-IN', {minimumFractionDigits: 2}), startX + boxWidth * 0.35 + 85, currentY + 12);
      doc.text(Number(payslip.esi_employer || 0).toLocaleString('en-IN', {minimumFractionDigits: 2}), startX + boxWidth * 0.35 + 85, currentY + 25);

      // Highlight CTC
      doc.rect(startX + boxWidth * 0.70, currentY, boxWidth * 0.30, 40).fill('#fef9c3'); // yellow-100
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#854d0e'); // yellow-800
      doc.text("Total Monthly CTC", startX + boxWidth * 0.70, currentY + 12, { align: 'center', width: boxWidth * 0.30 });
      doc.fontSize(14);
      doc.text(`INR ${Number(payslip.ctc || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}`, startX + boxWidth * 0.70, currentY + 25, { align: 'center', width: boxWidth * 0.30 });

      currentY += 55;

      // ── Footer ──
      doc.font('Helvetica-Oblique').fontSize(8).fillColor(mutedColor);
      doc.text(`Amount in words: ${salaryToWords(payslip.net_salary || 0)}`, 0, currentY, { align: 'center', width: doc.page.width });

      doc.font('Helvetica').fontSize(6.5);
      doc.text("This is a computer-generated document and does not require a signature.", 0, doc.page.height - 20, { align: 'center', width: doc.page.width });

      doc.end();
      logger.info(`Payslip PDF generated for payslip ${id}`);
    } catch (err) {
      logger.error(`Download payslip PDF error: ${err.message}`);
      return next(err);
    }
  }
}

module.exports = new PayrollController();