'use strict';

const cloudinary = require('cloudinary').v2;
const MediaAsset = require('./MediaAsset.model');

// Configure Cloudinary once at module load
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * uploadMedia — validates and uploads a file to Cloudinary.
 * Creates a MediaAsset record in DB after successful upload.
 *
 * @param {object} file - Multer file object (memoryStorage)
 * @param {string} type - Asset type ('product' | 'logo' | 'banner' | 'other')
 * @param {string} uploadedBy - User ObjectId
 * @returns {Promise<object>} MediaAsset document
 * @throws {statusCode: 400} if MIME type is invalid
 * @throws {statusCode: 413} if file size exceeds limit
 * @throws {statusCode: 500} if Cloudinary upload fails
 */
async function uploadMedia(file, type, uploadedBy) {
  if (!file) {
    throw { statusCode: 400, message: 'No file provided.' };
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw {
      statusCode: 400,
      message: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
    };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw {
      statusCode: 413,
      message: 'File size exceeds 5MB limit.',
    };
  }

  // Upload to Cloudinary via stream
  const uploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'btg-v4',
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        return resolve(result);
      }
    );

    uploadStream.end(file.buffer);
  });

  // Extract format from Cloudinary result
  const format = uploadResult.format || '';

  // Create MediaAsset record
  const mediaAsset = await MediaAsset.create({
    filename: file.originalname,
    cloudinaryUrl: uploadResult.secure_url,
    cloudinaryPublicId: uploadResult.public_id,
    type,
    uploadedBy,
    size: file.size,
    format,
  });

  return mediaAsset;
}

/**
 * listMedia — retrieves media assets with optional filtering.
 *
 * @param {object} filters - { type?: string }
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Results per page
 * @returns {Promise<object>} { assets, total }
 */
async function listMedia(filters = {}, page = 1, limit = 20) {
  const query = {};

  if (filters.type) {
    query.type = filters.type;
  }

  const skip = (page - 1) * limit;

  const assets = await MediaAsset.find(query)
    .populate('uploadedBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .maxTimeMS(5000) // Security: Query timeout prevents slow query DoS
    .lean();

  const total = await MediaAsset.countDocuments(query);

  return { assets, total };
}

/**
 * deleteMedia — deletes a media asset from Cloudinary and DB.
 * CRITICAL: Cloudinary delete MUST succeed before DB deletion.
 * If Cloudinary fails, DB record is preserved to prevent orphaned cloud assets.
 *
 * @param {string} id - MediaAsset ObjectId
 * @returns {Promise<object>}
 * @throws {statusCode: 404} if asset not found
 * @throws {statusCode: 500} if Cloudinary deletion fails
 */
async function deleteMedia(id) {
  const mediaAsset = await MediaAsset.findById(id)
    .maxTimeMS(5000); // Security: Query timeout

  if (!mediaAsset) {
    throw { statusCode: 404, message: 'Media asset not found.' };
  }

  // Delete from Cloudinary FIRST
  try {
    await cloudinary.uploader.destroy(mediaAsset.cloudinaryPublicId);
  } catch (err) {
    console.error('[media] Cloudinary deletion failed:', err.message);
    throw {
      statusCode: 500,
      message: 'Failed to delete media from Cloudinary. DB record preserved.',
    };
  }

  // Only delete DB record after successful Cloudinary deletion
  await MediaAsset.findByIdAndDelete(id);

  return mediaAsset;
}

module.exports = { uploadMedia, listMedia, deleteMedia };
