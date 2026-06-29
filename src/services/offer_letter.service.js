    const PDFDocument = require('pdfkit');
const { amountToWords, salaryToWords } = require('../utils/amount-to-words');
const { Letter } = require('../models');
const emailService = require('./email.service');
const logger = require('../utils/logger');

// Company logo embedded as base64 buffer — deploys with source code,
// no file-system dependency required on the production server.
const COMPANY_LOGO_BUFFER = require('../config/company_logo');

/**
 * Offer letter PDF generation & delivery service.
 *
 * Generates a professionally formatted offer letter as PDF using pdfkit,
 * creates a Letter record in the database, and emails it to the employee.
 *
 * Layout follows real-world payslip data from "Apaar Logistics & Cold Supply Chain Pvt Ltd".
 */
class OfferLetterService {
  COMPANY_NAME = 'Apaar Logistics & Cold Supply Chain Pvt Ltd';
  COMPANY_SHORT = 'APAAR LOGISTICS';
  COMPANY_ADDRESS = 'Corporate Office, [Your Company Address]';

  /**
   * Calculate salary components from gross using the 40% basic formula.
   * Mirrors payroll_ledger.service.js _calculateRow() logic.
   *
   * @param {number} fixedGross
   * @returns {{ basic: number, hra: number, otherAllowance: number }}
   */
  _calculateBreakup(fixedGross) {
    const basic = Math.round(fixedGross * 0.40);
    const hra = Math.round(basic * 0.40);
    const otherAllowance = fixedGross - basic - hra;
    return { basic, hra, otherAllowance };
  }

  /**
   * Calculate CTC from salary structure.
   *
   * CTC = Gross + PF Employer + ESIC Employer
   *
   * @param {number} gross
   * @param {number} basic
   * @param {boolean} pfApplicable
   * @param {boolean} pfCeiling
   * @param {boolean} esicApplicable
   * @returns {{ ctc: number, pfEmployer: number, esiEmployer: number }}
   */
  _calculateCTC(gross, basic, pfApplicable, pfCeiling, esicApplicable, {
    pfContributionMode = 'shared',
    esicContributionMode = 'shared',
    pfEmployerRate = 0.12,
    esicEmployerRate = 0.0325,
  } = {}) {
    // ── PF employer contribution (Phase 8: respect modes) ──
    let pfEmployer = 0;
    if (pfApplicable) {
      const pfBase = pfCeiling ? Math.min(basic, 15000) : basic;
      switch (pfContributionMode) {
        case 'employer_only':
        case 'shared':
          pfEmployer = Math.round(pfBase * pfEmployerRate);
          break;
        case 'employee_only':
        case 'none':
        default:
          pfEmployer = 0;
          break;
      }
    }

    // ── ESIC employer contribution (Phase 8: respect modes) ──
    const esiEmployer = esicApplicable && esicContributionMode === 'shared'
      ? Math.ceil(gross * esicEmployerRate)
      : 0;

    const ctc = gross + pfEmployer + esiEmployer;
    return { ctc, pfEmployer, esiEmployer };
  }

  /**
   * Generate a professional offer letter PDF.
   *
   * @param {object} employee - Employee record with all fields
   * @param {object} salaryStructure - SalaryStructure record
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generateOfferLetterPDF(employee, salaryStructure) {
    const gross = Number(salaryStructure.fixed_gross) || Number(employee.fixed_gross) || 0;
    const { basic, hra, otherAllowance } = this._calculateBreakup(gross);
    const specialAllowance = Number(salaryStructure.special_allowance) || 0;
    const conveyance = Number(salaryStructure.conveyance) || 0;
    const medicalAllowance = Number(salaryStructure.medical_allowance) || 0;
    const effectiveWorkDays = salaryStructure.effective_work_days || 26;

    const { ctc, pfEmployer, esiEmployer } = this._calculateCTC(
      gross, basic,
      salaryStructure.pf_applicable !== false,
      salaryStructure.pf_ceiling || false,
      salaryStructure.esic_applicable || false,
      {
        pfContributionMode: salaryStructure.pf_contribution_mode || employee.pf_contribution_mode || 'shared',
        esicContributionMode: salaryStructure.esic_contribution_mode || employee.esic_contribution_mode || 'shared',
        pfEmployerRate: Number(salaryStructure.pf_employer_rate ?? 0.12),
        esicEmployerRate: Number(salaryStructure.esic_employer_rate ?? 0.0325),
      },
    );

    const grossWords = salaryToWords(gross);
    const dateOfJoining = employee.date_of_joining
      ? new Date(employee.date_of_joining).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      : '_______________';
    const issuedDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    return new Promise((resolve, reject) => {
      const chunks = [];
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
      });

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Navy Top Bar ──
      doc.rect(0, 0, doc.page.width, 14).fill('#0f172a');
      
      doc.y = 40;
      doc.x = 60;
      
      // ── Header row ──
      const headerY = doc.y;
      // Left side – company logo + name
      const logoSize = 42;
      let textLeftX = 60;
      if (COMPANY_LOGO_BUFFER) {
        try {
          doc.image(COMPANY_LOGO_BUFFER, 60, headerY - 6, { fit: [logoSize, logoSize] });
          textLeftX = 60 + logoSize + 12;
        } catch (e) {
          // ignore image errors, fall back to text-only header
        }
      }
      doc.fontSize(22).font('Helvetica-Bold').fillColor('#0f172a').text(employee.company?.name || this.COMPANY_SHORT, textLeftX, headerY, { continued: false });
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('HUMAN RESOURCES DEPARTMENT', textLeftX, doc.y + 4);
      
      // Right side
      const rightX = doc.page.width - 60 - 150;
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#475569');
      doc.text(`Ref: APAAR/HR/OL/${employee.emp_code}`, rightX, headerY, { width: 150, align: 'right' });
      doc.text(`Date: ${issuedDate}`, rightX, headerY + 14, { width: 150, align: 'right' });
      doc.text(`Page: 1 of 1`, rightX, headerY + 28, { width: 150, align: 'right' });
      
      doc.y = Math.max(doc.y, headerY + 42) + 20;
      
      // Horizontal line
      doc.moveTo(60, doc.y).lineTo(doc.page.width - 60, doc.y).strokeColor('#0f172a').lineWidth(2).stroke();
      doc.y += 32;
      
      // ── Title ──
      doc.fontSize(15).font('Helvetica-Bold').fillColor('#16a34a').text('OFFER LETTER', 60, doc.y, { align: 'center', underline: true });
      doc.y += 28;
      
      // ── Recipient ──
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b').text('To,', 60, doc.y);
      doc.font('Helvetica').text(employee.name);
      doc.text(`${employee.designation || 'TBD'}, ${employee.department || 'TBD'}`);
      doc.text(`${employee.company?.name || this.COMPANY_NAME} – ${employee.location || this.COMPANY_ADDRESS}`);
      doc.y += 20;

      // ── Body ──
      doc.fontSize(11).lineGap(6);
      doc.text(`Dear ${employee.name},`, 60, doc.y);
      doc.moveDown(0.5);

      doc.text(
        `We are pleased to offer you the position of "${employee.designation || '_______________'}" ` +
        `at ${employee.company?.name || this.COMPANY_NAME}. We were impressed by your qualifications and believe ` +
        `that your skills and experience will be a valuable addition to our team.`,
        { align: 'justify' }
      );
      doc.moveDown(0.5);

      doc.text('The terms and conditions of your employment are as follows:');
      doc.moveDown(0.5);

      // ── 1. Date of Joining ──
      doc.font('Helvetica-Bold').text('1. Date of Joining:');
      doc.font('Helvetica').text(`   ${dateOfJoining}`);
      doc.moveDown(0.5);

      // ── 2. Location ──
      doc.font('Helvetica-Bold').text('2. Place of Posting:');
      doc.font('Helvetica').text(`   ${employee.location || this.COMPANY_ADDRESS}`);
      doc.moveDown(0.5);

      // ── 3. Compensation ──
      doc.font('Helvetica-Bold').text('3. Compensation Package (Per Month):');
      doc.moveDown(0.5);

      // Salary table
      const tableStartY = doc.y;
      const col1 = 60;
      const col2 = 250;
      const col3 = 400;
      const rowH = 22;

      const drawTableHeader = (y) => {
        doc.rect(60, y, 475, rowH).fill('#1a237e');
        doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold');
        doc.text('Component', col1 + 5, y + 6, { width: col2 - col1 - 10 });
        doc.text('Monthly (₹)', col3, y + 6, { width: 130, align: 'right' });
        doc.fillColor('#1e293b');
      };

      const drawTableRow = (y, label, value, highlight) => {
        if (highlight) {
          doc.rect(60, y, 475, rowH).fill('#e8eaf6');
          doc.fillColor('#1e293b');
        } else {
          doc.rect(60, y, 475, rowH).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
        }
        doc.fontSize(9).font('Helvetica');
        doc.text(label, col1 + 5, y + 6, { width: col2 - col1 - 10 });
        doc.text(value.toLocaleString('en-IN'), col3, y + 6, { width: 130, align: 'right' });
        doc.fillColor('#1e293b');
        return y + rowH;
      };

      let y = tableStartY;
      drawTableHeader(y); y += rowH;
      y = drawTableRow(y, 'Basic Salary', basic, false);
      y = drawTableRow(y, 'House Rent Allowance (HRA)', hra, false);
      if (specialAllowance > 0) y = drawTableRow(y, 'Special Allowance', specialAllowance, false);
      y = drawTableRow(y, 'Other Allowance', otherAllowance, false);
      if (conveyance > 0) y = drawTableRow(y, 'Conveyance Allowance', conveyance, false);
      if (medicalAllowance > 0) y = drawTableRow(y, 'Medical Allowance', medicalAllowance, false);
      y = drawTableRow(y, 'Gross Salary', gross, true);

      // Reset cursor after explicit-coordinate table drawing
      doc.x = 60;
      doc.y = y;

      doc.moveDown(0.8);

      // Gross in words
      doc.fontSize(10).font('Helvetica');
      doc.text(`Gross Salary in Words: ${grossWords}`, { indent: 10 });
      doc.moveDown(0.8);

      // ── 4. Statutory Contributions ──
      doc.fontSize(11).font('Helvetica-Bold').text('4. Statutory Contributions & CTC:');
      doc.fontSize(11).font('Helvetica');
      doc.text(`   • PF: ${employee.pf_applicable !== false ? 'Applicable (12% of Basic)' : 'Not Applicable'}${employee.pf_ceiling ? ' (ceiling ₹15,000)' : ''}`);
      doc.text(`   • ESIC: ${employee.esic_applicable ? 'Applicable' : 'Not Applicable'}  • Professional Tax: As per state slab`);
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').fontSize(11);
      doc.text(`   Monthly CTC: ₹ ${ctc.toLocaleString('en-IN')} (${salaryToWords(ctc)})`);

      doc.moveDown(0.8);

      // ── 5. Working Days ──
      doc.fontSize(11).font('Helvetica-Bold').text('5. Working Days:');
      doc.fontSize(11).font('Helvetica').text(`   ${effectiveWorkDays} working days per month. Loss of Pay (LOP) calculated proportionally.`);
      doc.moveDown(0.5);

      // ── 6. Probation ──
      doc.fontSize(11).font('Helvetica-Bold').text('6. Probation Period:');
      doc.fontSize(11).font('Helvetica').text('   6 months from date of joining. Upon successful completion, employment will be confirmed in writing.');
      doc.moveDown(0.5);

      // ── 7. Leave ──
      doc.fontSize(11).font('Helvetica-Bold').text('7. Leave Entitlement:');
      doc.fontSize(11).font('Helvetica').text('   As per company policy. Details available on the HRMS portal after onboarding.');
      doc.moveDown(0.5);

      // ── 8. Notice Period ──
      doc.fontSize(11).font('Helvetica-Bold').text('8. Notice Period:');
      doc.fontSize(11).font('Helvetica').text('   During probation: 15 days. After confirmation: 30 days or salary in lieu thereof.');
      doc.moveDown(0.8);

      // ── Acceptance note ──
      doc.fontSize(11).font('Helvetica');
      doc.text('Please confirm your acceptance by signing and returning a copy, and acknowledging through the HRMS portal.', { align: 'justify' });
      doc.moveDown(0.5);
      doc.text('We look forward to a long and mutually beneficial association. Welcome aboard!');
      
      // ── Signatures (Variant1 Style) ──
      doc.y += 60;
      doc.moveTo(60, doc.y).lineTo(doc.page.width - 60, doc.y).strokeColor('#e2e8f0').lineWidth(1).stroke();
      doc.y += 40;
      
      const sigY = doc.y;
      
      // Left signature
      doc.moveTo(60, sigY).lineTo(180, sigY).strokeColor('#0f172a').lineWidth(2).stroke();
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b').text('AUTHORISED SIGNATORY', 60, sigY + 6);
      doc.fontSize(9).font('Helvetica').fillColor('#64748b').text('HR Manager', 60, sigY + 18);
      
      // Right signature
      const rightSigX = doc.page.width - 60 - 120;
      doc.moveTo(rightSigX, sigY).lineTo(rightSigX + 120, sigY).strokeColor('#0f172a').lineWidth(2).stroke();
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b').text('EMPLOYEE SIGNATURE', rightSigX, sigY + 6);
      doc.fontSize(9).font('Helvetica').fillColor('#64748b').text(employee.name, rightSigX, sigY + 18);

      // ── Footer ──
      const footerY = doc.page.height - 30;
      doc.moveTo(60, footerY - 10).lineTo(doc.page.width - 60, footerY - 10).strokeColor('#f1f5f9').lineWidth(1).stroke();
      doc.fontSize(8).font('Helvetica').fillColor('#94a3b8').text(`${employee.company?.name || this.COMPANY_NAME} Pvt. Ltd. | ${employee.office?.city || 'City'}, ${employee.office?.state || 'State'} | hr@company.com | +91-XXXXX XXXXX`, 60, footerY, { align: 'center' });

      doc.end();
    });
  }

  /**
   * Full onboarding workflow: Generate offer letter PDF → Save Letter record → Send email.
   *
   * @param {object} employee - Employee record (after creation)
   * @param {object} salaryStructure - SalaryStructure record
   * @param {string} plainPassword - Plain-text password for the welcome email
   * @param {number} issuedBy - Admin employee ID who initiated the onboarding
   * @returns {Promise<{letter: object, emailResult: object}>}
   */
  async issueAndSendOfferLetter(employee, salaryStructure, plainPassword, issuedBy) {
    // 1. Generate PDF
    const pdfBuffer = await this.generateOfferLetterPDF(employee, salaryStructure);

    // 2. Create Letter record in database
    const letter = await Letter.create({
      employee_id: employee.id,
      type: 'offer',
      title: `Offer Letter — ${employee.designation || 'Employment'}`,
      content: `Offer letter issued for the position of ${employee.designation || 'N/A'} with gross salary of ₹${Number(salaryStructure.fixed_gross).toLocaleString('en-IN')}.`,
      issued_date: new Date(),
      issued_by: issuedBy,
      status: 'issued',
    });

    logger.info(`Offer letter record created: letter_id=${letter.id} for employee ${employee.emp_code}`);

    // 3. Send email with PDF attachment (fire-and-forget — don't block the response)
    //    Render free tier blocks outbound SMTP, so email may fail but the employee
    //    is already fully created and the letter is saved.
    let emailResult = { accepted: [], messageId: 'fire-and-forget' };
    emailService
      .sendWelcomeEmail(employee, plainPassword, pdfBuffer)
      .then((result) => {
        logger.info(`Welcome email sent to ${employee.email} — ${result.messageId}`);
      })
      .catch((err) => {
        logger.error(`Welcome email failed for ${employee.email}: ${err.message}`);
      });

    return { letter, emailResult };
  }
}

module.exports = new OfferLetterService();