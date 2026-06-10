'use strict';

const mediaService = require('./media.service');
const sendResponse = require('../../utils/sendResponse');
const { createAuditLog } = require('../../utils/auditLogger');
const { validateImageMagicBytes, getFileSignature } = require('../../utils/fileValidation');

/**
 * uploadMedia — handles file upload and asset creation.
 */
exports.uploadMedia = async (req, res) => {
  try {
    const file = req.file;
    const type = req.body.type || 'other';
    const uploadedBy = req.user.userId;

    // Validate file exists
    if (!file || !file.buffer) {
      return sendResponse(res, 400, false, 'No file provided.', null);
    }

    // SECURITY: Validate file content using magic bytes (file signature)
    // This prevents MIME type spoofing attacks where malicious files
    // are renamed to bypass client-side MIME type checks
    const validation = validateImageMagicBytes(file.buffer);

    if (!validation.valid) {
      // Log the attempted upload with actual file signature for security monitoring
      console.warn(
        `[media] Invalid file upload attempt - ` +
          `originalname: ${file.originalname}, ` +
          `mimetype: ${file.mimetype}, ` +
          `signature: ${getFileSignature(file.buffer)}, ` +
          `user: ${uploadedBy}`
      );

      return sendResponse(
        res,
        400,
        false,
        'Invalid image file. Only JPEG, PNG, WEBP, and GIF images are allowed.',
        null
      );
    }

    // Log successful validation for security monitoring
    console.log(
      `[media] File validation passed - ` +
        `type: ${validation.type}, ` +
        `originalname: ${file.originalname}, ` +
        `user: ${uploadedBy}`
    );

    const mediaAsset = await mediaService.uploadMedia(file, type, uploadedBy);

    // Fire-and-forget audit log
    createAuditLog({
      adminId: req.user.userId,
      action: 'MEDIA_UPLOAD',
      targetId: mediaAsset._id.toString(),
      details: { filename: mediaAsset.filename, type: mediaAsset.type },
    }).catch((err) => {
      console.warn('[media] Audit log failed:', err.message);
    });

    return sendResponse(res, 201, true, 'Media uploaded successfully.', mediaAsset);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const message =
      statusCode < 500
        ? err.message
        : process.env.NODE_ENV !== 'production'
        ? err.message
        : 'Internal server error.';
    return sendResponse(res, statusCode, false, message, null);
  }
};

/**
 * listMedia — retrieves media assets with optional filtering.
 */
exports.listMedia = async (req, res) => {
  try {
    const filters = {};
    if (req.query.type) {
      filters.type = req.query.type;
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await mediaService.listMedia(filters, page, limit);

    const totalPages = Math.ceil(result.total / limit);

    const pagination = {
      page,
      limit,
      total: result.total,
      totalPages,
    };

    return sendResponse(res, 200, true, 'Media assets fetched.', result.assets, pagination);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const message =
      statusCode < 500
        ? err.message
        : process.env.NODE_ENV !== 'production'
        ? err.message
        : 'Internal server error.';
    return sendResponse(res, statusCode, false, message, null);
  }
};

/**
 * deleteMedia — deletes a media asset from Cloudinary and DB.
 */
exports.deleteMedia = async (req, res) => {
  try {
    const mediaAsset = await mediaService.deleteMedia(req.params.id);

    // Fire-and-forget audit log
    createAuditLog({
      adminId: req.user.userId,
      action: 'MEDIA_DELETE',
      targetId: mediaAsset._id.toString(),
      details: { filename: mediaAsset.filename },
    }).catch((err) => {
      console.warn('[media] Audit log failed:', err.message);
    });

    return sendResponse(res, 200, true, 'Media deleted successfully.', mediaAsset);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const message =
      statusCode < 500
        ? err.message
        : process.env.NODE_ENV !== 'production'
        ? err.message
        : 'Internal server error.';
    return sendResponse(res, statusCode, false, message, null);
  }
};
