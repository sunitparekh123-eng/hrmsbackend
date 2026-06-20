const { TourExpense, TourExpensePolicy, Employee, Office, Company } = require('../models');
const { AppError } = require('../middleware/error.middleware');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

class TourExpenseService {
  async getAllClaims({ status, search, company_id, office_id, page = 1, limit = 20, employeeId = null, isManagerial = false }) {
    const offset = (page - 1) * limit;
    const whereClause = {};

    if (status && status !== 'All') {
      whereClause.status = status.toLowerCase();
    }

    // Restriction: Non-admin/hr see only their own claims (unless they are a manager who might see team claims, but for now let's keep it simple or user-scoped)
    if (employeeId && !isManagerial) {
      whereClause.employee_id = employeeId;
    }

    const empIncludeWhere = {};
    if (company_id) empIncludeWhere.company_id = company_id;
    if (office_id) empIncludeWhere.office_id = office_id;

    if (search) {
      empIncludeWhere[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { emp_code: { [Op.like]: `%${search}%` } },
      ];
    }

    // Query claims with associated employee details
    const { rows, count } = await TourExpense.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'employee',
          where: Object.keys(empIncludeWhere).length > 0 ? empIncludeWhere : undefined,
          attributes: ['id', 'emp_code', 'name', 'department', 'role'],
          include: [
            { model: Office, as: 'office', attributes: ['id', 'name'] },
            { model: Company, as: 'company', attributes: ['id', 'name'] },
          ],
        },
        {
          model: Employee,
          as: 'approver',
          attributes: ['id', 'name'],
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Compute stats based on the subset the user is authorized to see
    const statsWhere = {};
    if (employeeId && !isManagerial) {
      statsWhere.employee_id = employeeId;
    }

    const allUserClaims = await TourExpense.findAll({
      where: statsWhere,
      attributes: ['status', 'amount'],
    });

    const totalApproved = allUserClaims.filter(c => c.status === 'approved').reduce((sum, c) => sum + parseFloat(c.amount), 0);
    const totalPending = allUserClaims.filter(c => c.status === 'pending').reduce((sum, c) => sum + parseFloat(c.amount), 0);
    const totalClaims = allUserClaims.length;
    const pendingCount = allUserClaims.filter(c => c.status === 'pending').length;

    return {
      data: rows,
      stats: {
        totalClaims,
        totalApproved,
        totalPending,
        pendingCount,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  async getClaimById(id) {
    const claim = await TourExpense.findByPk(id, {
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'emp_code', 'name', 'department', 'role'],
          include: [
            { model: Office, as: 'office', attributes: ['id', 'name'] },
            { model: Company, as: 'company', attributes: ['id', 'name'] },
          ],
        },
        {
          model: Employee,
          as: 'approver',
          attributes: ['id', 'name'],
        }
      ],
    });

    if (!claim) {
      throw new AppError('Tour expense claim not found', 404);
    }

    return claim;
  }

  async createClaim(employeeId, claimData) {
    // Generate claim code TE001 etc.
    const lastClaim = await TourExpense.findOne({
      order: [['id', 'DESC']],
    });

    let lastId = 0;
    if (lastClaim) {
      lastId = lastClaim.id;
    }
    const claim_code = `TE${String(lastId + 1).padStart(3, '0')}`;

    const claim = await TourExpense.create({
      ...claimData,
      claim_code,
      employee_id: employeeId,
      status: 'pending',
    });

    logger.info(`Tour expense claim ${claim_code} created by employee ID ${employeeId}`);
    return this.getClaimById(claim.id);
  }

  async approveClaim(id, approverId) {
    const claim = await TourExpense.findByPk(id);
    if (!claim) {
      throw new AppError('Tour expense claim not found', 404);
    }

    if (claim.status !== 'pending') {
      throw new AppError(`Claim status is already ${claim.status}`, 400);
    }

    await claim.update({
      status: 'approved',
      approved_by: approverId,
      approved_at: new Date(),
    });

    logger.info(`Tour expense claim ${claim.claim_code} approved by ID ${approverId}`);
    return this.getClaimById(id);
  }

  async rejectClaim(id, reason, rejecterId) {
    const claim = await TourExpense.findByPk(id);
    if (!claim) {
      throw new AppError('Tour expense claim not found', 404);
    }

    if (claim.status !== 'pending') {
      throw new AppError(`Claim status is already ${claim.status}`, 400);
    }

    await claim.update({
      status: 'rejected',
      rejected_reason: reason,
      approved_by: rejecterId,
      approved_at: new Date(), // Storing reject info here
    });

    logger.info(`Tour expense claim ${claim.claim_code} rejected by ID ${rejecterId}`);
    return this.getClaimById(id);
  }

  async getPolicies() {
    const policies = await TourExpensePolicy.findAll({
      where: { is_general_rule: false },
    });

    const generalRule = await TourExpensePolicy.findOne({
      where: { is_general_rule: true },
    });

    return {
      policies,
      generalRules: generalRule ? generalRule.general_rules_text : '',
    };
  }

  async updatePolicies(policiesList, generalRulesText) {
    // Reset and bulk insert policies
    await TourExpensePolicy.destroy({ where: { is_general_rule: false } });

    if (policiesList && Array.isArray(policiesList)) {
      const dbPolicies = policiesList.map(p => ({
        label: p.label,
        limit_detail: p.limit,
        note: p.note,
        is_general_rule: false,
      }));
      await TourExpensePolicy.bulkCreate(dbPolicies);
    }

    if (generalRulesText !== undefined) {
      const [generalRule] = await TourExpensePolicy.findOrCreate({
        where: { is_general_rule: true },
        defaults: {
          label: 'General Rules',
          limit_detail: 'N/A',
          general_rules_text: generalRulesText,
        },
      });

      if (generalRule) {
        await generalRule.update({ general_rules_text: generalRulesText });
      }
    }

    return this.getPolicies();
  }
}

module.exports = new TourExpenseService();
