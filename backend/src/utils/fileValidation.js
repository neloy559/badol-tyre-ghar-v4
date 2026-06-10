'use strict';

/**
 * File validation utilities using magic bytes (file signatures)
 * to prevent MIME type spoofing attacks.
 *
 * SECURITY PRINCIPLE: Never trust client-provided MIME types.
 * Always validate actual file content by reading the file signature.
 */

/**
 * Known file signatures (magic bytes) for allowed image formats
 */
const IMAGE_SIGNATURES = {
  JPEG: {
    signature: [0xff, 0xd8, 0xff],
    offset: 0,
    name: 'jpeg',
  },
  PNG: {
    signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    offset: 0,
    name: 'png',
  },
  WEBP_RIFF: {
    signature: [0x52, 0x49, 0x46, 0x46], // "RIFF"
    offset: 0,
    name: 'webp',
    additionalCheck: (bytes) => {
      // WEBP also has "WEBP" at offset 8
      return (
        bytes.length >= 12 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
      );
    },
  },
  GIF_87a: {
    signature: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // "GIF87a"
    offset: 0,
    name: 'gif',
  },
  GIF_89a: {
    signature: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // "GIF89a"
    offset: 0,
    name: 'gif',
  },
};

/**
 * Check if a buffer matches a specific file signature
 *
 * @param {Buffer} buffer - File buffer to check
 * @param {object} signatureConfig - Signature configuration
 * @returns {boolean} True if signature matches
 */
function matchesSignature(buffer, signatureConfig) {
  const { signature, offset, additionalCheck } = signatureConfig;

  // Ensure buffer is large enough
  if (buffer.length < offset + signature.length) {
    return false;
  }

  // Check each byte in the signature
  for (let i = 0; i < signature.length; i++) {
    if (buffer[offset + i] !== signature[i]) {
      return false;
    }
  }

  // Run additional check if provided (e.g., WEBP needs RIFF + WEBP check)
  if (additionalCheck && !additionalCheck(buffer)) {
    return false;
  }

  return true;
}

/**
 * Validate image file by checking magic bytes (file signature)
 *
 * @param {Buffer} buffer - File buffer to validate
 * @returns {object} { valid: boolean, type: string|null, message: string }
 *
 * @example
 * const result = validateImageMagicBytes(req.file.buffer);
 * if (!result.valid) {
 *   return res.status(400).json({ error: result.message });
 * }
 */
function validateImageMagicBytes(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return {
      valid: false,
      type: null,
      message: 'Invalid buffer provided.',
    };
  }

  if (buffer.length < 16) {
    return {
      valid: false,
      type: null,
      message: 'File is too small to be a valid image.',
    };
  }

  // Read first 16 bytes for signature checking
  const bytes = buffer.slice(0, 16);

  // Check against each known signature
  for (const [key, config] of Object.entries(IMAGE_SIGNATURES)) {
    if (matchesSignature(bytes, config)) {
      return {
        valid: true,
        type: config.name,
        message: `Valid ${config.name.toUpperCase()} file.`,
      };
    }
  }

  // No matching signature found
  return {
    valid: false,
    type: null,
    message: 'Invalid image file. Only JPEG, PNG, WEBP, and GIF are allowed.',
  };
}

/**
 * Get human-readable file signature information (for debugging)
 *
 * @param {Buffer} buffer - File buffer
 * @returns {string} Hex representation of first 16 bytes
 */
function getFileSignature(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return 'Invalid buffer';
  }

  const bytes = buffer.slice(0, 16);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
}

module.exports = {
  validateImageMagicBytes,
  getFileSignature,
  IMAGE_SIGNATURES,
};
