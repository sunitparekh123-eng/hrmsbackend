const payrollService = require('../services/payroll.service');
const { success, paginated } = require('../utils/response');
const logger = require('../utils/logger');
const PDFDocument = require('pdfkit');

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
      const { Employee } = require('../models');
      const emp = await Employee.findByPk(payslip.employee_id);
      if (!emp) throw new Error('Employee not found');

      const fmt = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Payslip_${emp.name.replace(/\s+/g, '_')}_${payslip.month}_${payslip.year}.pdf"`,
      );
      doc.pipe(res);

      const pageW = doc.page.width - 100; // usable width
      const BLUE = '#1a237e';
      const LIGHT_BLUE = '#e3eaf8';
      const GRAY = '#f5f5f5';

      // ── Header ─────────────────────────────────────────────────
      doc.rect(50, 50, pageW, 60).fill(BLUE);
      doc.fillColor('white')
        .font('Helvetica-Bold').fontSize(18)
        .text('Apaar Logistics & Cold Supply Chain Pvt Ltd', 60, 62, { width: pageW - 20 });
      doc.font('Helvetica').fontSize(9)
        .text('Corporate Office: Mumbai, India | CIN: UXXXXXXXXXX', 60, 86, { width: pageW - 20 });

      doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(14)
        .text(`SALARY SLIP — ${(payslip.month || '').toUpperCase()} ${payslip.year}`,
          50, 125, { align: 'center', width: pageW });

      doc.moveTo(50, 148).lineTo(50 + pageW, 148).strokeColor(BLUE).lineWidth(1).stroke();

      // ── Employee Info Table ──────────────────────────────────────
      const infoY = 158;
      doc.rect(50, infoY, pageW, 14).fill(LIGHT_BLUE);
      doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(9)
        .text('EMPLOYEE DETAILS', 54, infoY + 3);

      const infoRows = [
        ['Employee Name', emp.name, 'Employee Code', emp.emp_code || '--'],
        ['Designation', emp.designation || '--', 'Department', emp.department || '--'],
        ['Date of Joining', emp.date_of_joining || '--', 'PAN Number', '--'],
        ['Working Days', `${payslip.working_days || 0}`, 'Paid Days', `${payslip.paid_days || 0}`],
        ['LOP Days', `${payslip.lop_days || 0}`, 'Payment Mode', 'Bank Transfer'],
      ];

      let rowY = infoY + 16;
      infoRows.forEach((row, i) => {
        if (i % 2 === 0) doc.rect(50, rowY, pageW, 16).fill(GRAY);
        doc.fillColor('#333333').font('Helvetica-Bold').fontSize(8)
          .text(row[0], 54, rowY + 4, { width: 130 })
          .font('Helvetica').text(row[1], 184, rowY + 4, { width: 140 })
          .font('Helvetica-Bold').text(row[2], 334, rowY + 4, { width: 110 })
          .font('Helvetica').text(row[3], 444, rowY + 4, { width: 130 });
        rowY += 16;
      });

      rowY += 10;
      doc.moveTo(50, rowY).lineTo(50 + pageW, rowY).strokeColor('#cccccc').lineWidth(0.5).stroke();

      // ── Earnings & Deductions Table ──────────────────────────────
      rowY += 12;
      const colW = pageW / 2 - 2;

      // Sub-header
      doc.rect(50, rowY, colW, 16).fill(BLUE);
      doc.rect(50 + colW + 4, rowY, colW, 16).fill(BLUE);
      doc.fillColor('white').font('Helvetica-Bold').fontSize(9)
        .text('EARNINGS', 54, rowY + 4, { width: colW - 4 })
        .text('AMOUNT (Rs.)', 54 + colW - 80, rowY + 4, { width: 80, align: 'right' })
        .text('DEDUCTIONS', 54 + colW + 4, rowY + 4, { width: colW - 84 })
        .text('AMOUNT (Rs.)', 54 + colW + 4 + colW - 80, rowY + 4, { width: 80, align: 'right' });
      rowY += 16;

      const earnings = [
        ['Basic Salary', payslip.basic_salary],
        ['HRA', payslip.hra],
        payslip.other_allowance > 0 ? ['Other Allowance', payslip.other_allowance] : null,
        payslip.conveyance > 0 ? ['Conveyance Allowance', payslip.conveyance] : null,
        payslip.medical_allowance > 0 ? ['Medical Allowance', payslip.medical_allowance] : null,
      ].filter(Boolean);

      const deductions = [
        payslip.pf_employee > 0 ? ['PF (Employee)', payslip.pf_employee] : null,
        payslip.esi_employee > 0 ? ['ESI (Employee)', payslip.esi_employee] : null,
        payslip.professional_tax > 0 ? ['Professional Tax', payslip.professional_tax] : null,
      ].filter(Boolean);

      const maxRows = Math.max(earnings.length, deductions.length);
      for (let i = 0; i < maxRows; i++) {
        if (i % 2 === 0) {
          doc.rect(50, rowY, colW, 15).fill(GRAY);
          doc.rect(50 + colW + 4, rowY, colW, 15).fill(GRAY);
        }
        const e = earnings[i];
        const d = deductions[i];
        doc.fillColor('#333333').font('Helvetica').fontSize(8);
        if (e) {
          doc.text(e[0], 54, rowY + 4, { width: colW - 84 })
            .text(Number(e[1] || 0).toLocaleString('en-IN'), 54 + colW - 80, rowY + 4, { width: 76, align: 'right' });
        }
        if (d) {
          doc.text(d[0], 54 + colW + 4, rowY + 4, { width: colW - 84 })
            .text(Number(d[1] || 0).toLocaleString('en-IN'), 54 + colW + 4 + colW - 80, rowY + 4, { width: 76, align: 'right' });
        }
        rowY += 15;
      }

      // Totals row
      doc.rect(50, rowY, colW, 16).fill(LIGHT_BLUE);
      doc.rect(50 + colW + 4, rowY, colW, 16).fill(LIGHT_BLUE);
      doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(9)
        .text('GROSS EARNINGS', 54, rowY + 4, { width: colW - 84 })
        .text(Number(payslip.gross_salary || 0).toLocaleString('en-IN'),
          54 + colW - 80, rowY + 4, { width: 76, align: 'right' })
        .text('GROSS DEDUCTIONS', 54 + colW + 4, rowY + 4, { width: colW - 84 })
        .text(Number(payslip.total_deductions || 0).toLocaleString('en-IN'),
          54 + colW + 4 + colW - 80, rowY + 4, { width: 76, align: 'right' });
      rowY += 20;

      // ── Net Take Home ────────────────────────────────────────────
      doc.rect(50, rowY, pageW, 30).fill(BLUE);
      doc.fillColor('white').font('Helvetica-Bold').fontSize(13)
        .text(`NET TAKE HOME SALARY: ${fmt(payslip.net_salary)}`,
          54, rowY + 8, { align: 'center', width: pageW - 8 });
      rowY += 40;

      // ── Employer Contributions ────────────────────────────────────
      if (payslip.pf_employer > 0 || payslip.esi_employer > 0) {
        doc.rect(50, rowY, pageW, 14).fill(LIGHT_BLUE);
        doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(9)
          .text('EMPLOYER CONTRIBUTIONS (CTC)', 54, rowY + 3);
        rowY += 16;
        doc.fillColor('#333333').font('Helvetica').fontSize(8);
        if (payslip.pf_employer > 0) {
          doc.text('PF (Employer)', 54, rowY)
            .text(Number(payslip.pf_employer).toLocaleString('en-IN'), 200, rowY);
          rowY += 14;
        }
        if (payslip.esi_employer > 0) {
          doc.text('ESI (Employer)', 54, rowY)
            .text(Number(payslip.esi_employer).toLocaleString('en-IN'), 200, rowY);
          rowY += 14;
        }
        doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(9)
          .text('TOTAL CTC', 54, rowY)
          .text(Number(payslip.ctc || 0).toLocaleString('en-IN'), 200, rowY);
        rowY += 20;
      }

      // ── Footer ───────────────────────────────────────────────────
      rowY += 10;
      doc.moveTo(50, rowY).lineTo(50 + pageW, rowY).strokeColor('#cccccc').lineWidth(0.5).stroke();
      rowY += 10;
      doc.fillColor('#666666').font('Helvetica').fontSize(7)
        .text(
          'This is a computer-generated payslip and does not require a signature. ' +
          'For any discrepancies, please contact the HR department.',
          50, rowY, { width: pageW, align: 'center' },
        );

      doc.end();
      logger.info(`Payslip PDF generated for payslip ${id}`);
    } catch (err) {
      logger.error(`Download payslip PDF error: ${err.message}`);
      return next(err);
    }
  }
}

module.exports = new PayrollController();