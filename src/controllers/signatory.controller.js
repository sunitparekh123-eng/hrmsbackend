const signatoryService = require('../services/signatory.service');
const { success } = require('../utils/response');
const logger = require('../utils/logger');

class SignatoryController {
  async getAllSignatories(req, res, next) {
    try {
      const activeOnly = req.query.active === 'true';
      const signatories = activeOnly 
        ? await signatoryService.getActiveSignatories()
        : await signatoryService.getAllSignatories();
        
      return success(res, 'Signatories fetched successfully', signatories);
    } catch (err) {
      logger.error(`Get signatories error: ${err.message}`);
      return next(err);
    }
  }

  async createSignatory(req, res, next) {
    try {
      if (!req.body.name || !req.body.designation) {
        return res.status(400).json({ success: false, message: 'Name and designation are required' });
      }

      let fileData = null;
      if (req.file) {
        fileData = {
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        };
      }

      const data = {
        name: req.body.name,
        designation: req.body.designation,
        is_active: req.body.is_active === 'true' || req.body.is_active === true,
      };

      const result = await signatoryService.createSignatory(data, fileData);
      return success(res, 'Signatory created successfully', result, 201);
    } catch (err) {
      logger.error(`Create signatory error: ${err.message}`);
      return next(err);
    }
  }

  async updateSignatory(req, res, next) {
    try {
      const { id } = req.params;
      
      let fileData = null;
      if (req.file) {
        fileData = {
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        };
      }

      const data = {
        name: req.body.name,
        designation: req.body.designation,
        is_active: req.body.is_active !== undefined 
          ? (req.body.is_active === 'true' || req.body.is_active === true) 
          : undefined,
      };

      const result = await signatoryService.updateSignatory(id, data, fileData);
      return success(res, 'Signatory updated successfully', result);
    } catch (err) {
      logger.error(`Update signatory error: ${err.message}`);
      return next(err);
    }
  }

  async deleteSignatory(req, res, next) {
    try {
      const { id } = req.params;
      await signatoryService.deleteSignatory(id);
      return success(res, 'Signatory deleted successfully');
    } catch (err) {
      logger.error(`Delete signatory error: ${err.message}`);
      return next(err);
    }
  }
}

module.exports = new SignatoryController();
