const documentService = require('../services/document.service');
const { success, paginated } = require('../utils/response');
const logger = require('../utils/logger');

class DocumentController {
  async getMyDocuments(req, res, next) {
    try {
      const employeeId = req.employee.id;
      const { page, limit, type, status } = req.query;
      const result = await documentService.getDocuments(employeeId, { page: parseInt(page) || 1, limit: parseInt(limit) || 20, type, status });
      return paginated(res, 'Documents fetched', result.data, result.pagination, 200);
    } catch (err) {
      logger.error(`Get my documents error: ${err.message}`);
      return next(err);
    }
  }

  /**
   * Upload a document file to Cloudinary and create DB record.
   * Expects: multipart/form-data with 'file' field + optional 'name' and 'type' fields.
   * Uses the authenticated employee's ID.
   */
  async uploadDocument(req, res, next) {
    try {
      const employeeId = req.employee.id;

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided. Please attach a file.' });
      }

      const fileData = {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      };

      const metadata = {
        name: req.body.name || req.file.originalname,
        type: req.body.type || 'other',
      };

      const result = await documentService.uploadDocument(employeeId, fileData, metadata);
      return success(res, 'Document uploaded successfully', result, 201);
    } catch (err) {
      logger.error(`Upload document error: ${err.message}`);
      return next(err);
    }
  }

  /**
   * Admin/HR only: Upload a document for a specific employee.
   * Uses :employeeId from route params instead of req.employee.id.
   */
  async uploadDocumentForEmployee(req, res, next) {
    try {
      const { employeeId } = req.params;

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided. Please attach a file.' });
      }

      const fileData = {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      };

      const metadata = {
        name: req.body.name || req.file.originalname,
        type: req.body.type || 'other',
      };

      const result = await documentService.uploadDocument(parseInt(employeeId), fileData, metadata);
      return success(res, 'Document uploaded successfully', result, 201);
    } catch (err) {
      logger.error(`Upload document for employee ${req.params.employeeId} error: ${err.message}`);
      return next(err);
    }
  }

  /**
   * Admin/HR: Upload multiple documents for a specific employee in a single request.
   * Expects: multipart/form-data with 'files' field (multiple files) + optional 'type' field.
   */
  async uploadMultipleDocumentsForEmployee(req, res, next) {
    try {
      const { employeeId } = req.params;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'No files provided. Please attach at least one file.' });
      }

      // Parse per-file types if sent as JSON array, otherwise fall back to single type or auto-detect
      let types = [];
      try {
        if (req.body.types) {
          types = JSON.parse(req.body.types);
        }
      } catch { /* ignore parse errors */ }

      const results = [];
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const fileData = {
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        };

        // Determine type: explicit per-file type > explicit single type > auto-detect from filename
        const metadata = {
          name: file.originalname,
          type: (Array.isArray(types) && types[i]) || req.body.type || 'other',
        };

        const result = await documentService.uploadDocument(parseInt(employeeId), fileData, metadata);
        results.push(result);
      }

      return success(res, `${results.length} document(s) uploaded successfully`, results, 201);
    } catch (err) {
      logger.error(`Upload multiple documents for employee ${req.params.employeeId} error: ${err.message}`);
      return next(err);
    }
  }

  /**
   * Upload multiple documents in a single request.
   * Expects: multipart/form-data with 'files' field (multiple files) + optional 'type' field.
   */
  async uploadMultipleDocuments(req, res, next) {
    try {
      const employeeId = req.employee.id;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'No files provided. Please attach at least one file.' });
      }

      const results = [];
      for (const file of req.files) {
        const fileData = {
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        };

        const metadata = {
          name: file.originalname,
          type: req.body.type || 'other',
        };

        const result = await documentService.uploadDocument(employeeId, fileData, metadata);
        results.push(result);
      }

      return success(res, `${results.length} document(s) uploaded successfully`, results, 201);
    } catch (err) {
      logger.error(`Upload multiple documents error: ${err.message}`);
      return next(err);
    }
  }

  async getDocumentById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await documentService.getDocumentById(id, req.employee.id);
      return success(res, 'Document fetched', result, 200);
    } catch (err) {
      logger.error(`Get document by id error: ${err.message}`);
      return next(err);
    }
  }

  async getEmployeeDocuments(req, res, next) {
    try {
      const { employeeId } = req.params;
      const { page, limit, type, status } = req.query;
      const result = await documentService.getDocuments(employeeId, { page: parseInt(page) || 1, limit: parseInt(limit) || 20, type, status });
      return paginated(res, 'Employee documents fetched', result.data, result.pagination, 200);
    } catch (err) {
      logger.error(`Get employee documents error: ${err.message}`);
      return next(err);
    }
  }

  async verifyDocument(req, res, next) {
    try {
      const { id } = req.params;
      const result = await documentService.verifyDocument(id, req.employee.id);
      return success(res, 'Document verified', result, 200);
    } catch (err) {
      logger.error(`Verify document error: ${err.message}`);
      return next(err);
    }
  }

  async deleteDocument(req, res, next) {
    try {
      const { id } = req.params;
      await documentService.deleteDocument(id);
      return success(res, 'Document deleted', null, 200);
    } catch (err) {
      logger.error(`Delete document error: ${err.message}`);
      return next(err);
    }
  }
}

module.exports = new DocumentController();