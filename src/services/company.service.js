const { Company, Office } = require('../models');
const { PAGINATION } = require('../utils/constants');
const logger = require('../utils/logger');

class CompanyService {
  /**
   * Get all active companies.
   * @param {Object} [options]
   * @param {boolean} [options.activeOnly=true] - Only return active companies
   * @returns {Promise<Array>}
   */
  async getCompanies({ activeOnly = true } = {}) {
    const where = activeOnly ? { is_active: true } : {};
    const companies = await Company.findAll({
      where,
      order: [['name', 'ASC']],
    });
    return companies;
  }

  /**
   * Get a single company by ID.
   */
  async getCompanyById(id) {
    const company = await Company.findByPk(id);
    if (!company) {
      const err = new Error('Company not found');
      err.statusCode = 404;
      throw err;
    }
    return company;
  }

  /**
   * Create a new company entity.
   */
  async createCompany({ name, email, phone, website, city, state, address }) {
    const existing = await Company.findOne({ where: { name } });
    if (existing) {
      const err = new Error('A company with this name already exists');
      err.statusCode = 409;
      throw err;
    }
    const company = await Company.create({ name, email, phone, website, city, state, address });
    logger.info(`Company created: ${company.name} (id: ${company.id})`);
    return company;
  }

  /**
   * Update a company.
   */
  async updateCompany(id, { name, email, phone, website, city, state, address, is_active }) {
    const company = await this.getCompanyById(id);
    if (name !== undefined) company.name = name;
    if (email !== undefined) company.email = email;
    if (phone !== undefined) company.phone = phone;
    if (website !== undefined) company.website = website;
    if (city !== undefined) company.city = city;
    if (state !== undefined) company.state = state;
    if (address !== undefined) company.address = address;
    if (is_active !== undefined) company.is_active = is_active;
    await company.save();
    logger.info(`Company updated: ${company.name} (id: ${company.id})`);
    return company;
  }

  /**
   * Soft-delete (deactivate) a company.
   */
  async deleteCompany(id) {
    const company = await this.getCompanyById(id);
    await company.destroy();
    logger.info(`Company deleted: ${company.name} (id: ${company.id})`);
    return true;
  }
}

module.exports = new CompanyService();