/**
 * Cloudinary Service
 * Handles all media upload, delete, and URL generation operations
 * via the Cloudinary SDK.
 */
const cloudinary = require('cloudinary').v2;
const env = require('../config/env');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/error.middleware');

// Initialize Cloudinary configuration once at module load
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

class CloudinaryService {
  /**
   * Upload a file buffer to Cloudinary
   * @param {Buffer} fileBuffer - The file buffer to upload
   * @param {Object} options - Upload options
   * @param {string} options.folder - Cloudinary folder (e.g., 'hrms/documents')
   * @param {string} options.filename - Desired filename without extension
   * @param {string} options.resourceType - 'image' | 'raw' (for PDFs/docs) | 'auto'
   * @param {string} [options.publicId] - Optional explicit public ID
   * @returns {Promise<{public_id: string, secure_url: string, url: string, format: string, resource_type: string, bytes: number, width?: number, height?: number}>}
   */
  async uploadFile(fileBuffer, options = {}) {
    const {
      folder = 'hrms/documents',
      filename = `file_${Date.now()}`,
      resourceType = 'auto',
      publicId,
    } = options;

    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder,
        resource_type: resourceType,
        public_id: publicId || filename,
        overwrite: true,
        use_filename: true,
        unique_filename: true,
        // Allowed formats - images and PDFs
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
      };

      if (options.transformation) uploadOptions.transformation = options.transformation;
      if (options.background_removal) uploadOptions.background_removal = options.background_removal;

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            logger.error(`Cloudinary upload failed: ${error.message}`, error);
            return reject(new AppError(`File upload failed: ${error.message}`, 500));
          }
          logger.info(`Cloudinary upload success: ${result.public_id} (${result.secure_url})`);
          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
            url: result.url,
            format: result.format,
            resource_type: result.resource_type,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
          });
        }
      );

      // Write the buffer to the upload stream
      uploadStream.end(fileBuffer);
    });
  }

  /**
   * Upload multiple files in parallel
   * @param {Array<{buffer: Buffer, options: Object}>} files - Array of {buffer, options}
   * @returns {Promise<Array<Object>>} Array of upload results
   */
  async uploadMultipleFiles(files) {
    const uploadPromises = files.map(({ buffer, options }) =>
      this.uploadFile(buffer, options)
    );
    return Promise.all(uploadPromises);
  }

  /**
   * Delete a file from Cloudinary by public ID
   * @param {string} publicId - The Cloudinary public ID
   * @param {string} resourceType - 'image' | 'raw'
   * @returns {Promise<{result: string}>}
   */
  async deleteFile(publicId, resourceType = 'image') {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
      logger.info(`Cloudinary delete: ${publicId} - ${result.result}`);
      return result;
    } catch (error) {
      logger.error(`Cloudinary delete failed for ${publicId}: ${error.message}`);
      // Don't throw here — deletion failure shouldn't break the app flow
      return { result: 'not_found' };
    }
  }

  /**
   * Extract the public ID from a Cloudinary URL
   * @param {string} url - Full Cloudinary URL
   * @returns {{publicId: string, resourceType: string} | null}
   */
  extractPublicIdFromUrl(url) {
    if (!url || !url.includes('cloudinary.com')) return null;

    // URL format: https://res.cloudinary.com/CLOUD_NAME/image/upload/v1234567890/folder/filename.ext
    // or: https://res.cloudinary.com/CLOUD_NAME/raw/upload/v1234567890/folder/filename.ext
    try {
      const urlParts = url.split('/');
      const uploadIndex = urlParts.indexOf('upload');
      if (uploadIndex === -1) return null;

      // Resource type is before 'upload'
      const resourceType = urlParts[uploadIndex - 1];

      // Public ID is everything after the version string (vXXXXXX)
      const afterUpload = urlParts.slice(uploadIndex + 1);
      // Remove version string (vXXXXXX)
      const withoutVersion = afterUpload.filter(part => !part.match(/^v\d+$/));
      // Remove file extension from last part
      const lastPart = withoutVersion[withoutVersion.length - 1];
      const lastDotIndex = lastPart.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        withoutVersion[withoutVersion.length - 1] = lastPart.substring(0, lastDotIndex);
      }

      return {
        publicId: withoutVersion.join('/'),
        resourceType: resourceType === 'raw' ? 'raw' : 'image',
      };
    } catch (err) {
      logger.warn(`Failed to extract public ID from Cloudinary URL: ${url}`);
      return null;
    }
  }

  /**
   * Generate a Cloudinary URL with transformations
   * @param {string} publicId - The Cloudinary public ID
   * @param {Object} [transform] - Transformation options (width, height, crop, quality, etc.)
   * @returns {string} The transformed URL
   */
  generateUrl(publicId, transform = {}) {
    return cloudinary.url(publicId, {
      secure: true,
      ...transform,
    });
  }
}

module.exports = new CloudinaryService();