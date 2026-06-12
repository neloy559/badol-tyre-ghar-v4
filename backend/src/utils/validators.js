'use strict';

/**
 * Input Type Validation Utilities
 * 
 * Purpose: Prevent NoSQL injection attacks by validating input types
 * 
 * Security Principle: Never trust client input. Always validate type before database queries.
 * 
 * Attack Vector: Attackers can send objects instead of strings:
 *   Example: { phone: { $gt: "" } } bypasses MongoDB queries
 * 
 * Solution: Validate ALL user inputs are expected types before any database operation.
 */

/**
 * Validate that a value is a non-empty string
 * @param {*} value - The value to validate
 * @returns {boolean} - True if value is a non-empty string
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate that a value is a string (can be empty)
 * @param {*} value - The value to validate
 * @returns {boolean} - True if value is a string
 */
function isString(value) {
  return typeof value === 'string';
}

/**
 * Validate that a value is a number
 * @param {*} value - The value to validate
 * @returns {boolean} - True if value is a number and not NaN
 */
function isNumber(value) {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Validate that a value is a boolean
 * @param {*} value - The value to validate
 * @returns {boolean} - True if value is a boolean
 */
function isBoolean(value) {
  return typeof value === 'boolean';
}

/**
 * Validate that a value is an array
 * @param {*} value - The value to validate
 * @returns {boolean} - True if value is an array
 */
function isArray(value) {
  return Array.isArray(value);
}

/**
 * Validate multiple input types at once
 * @param {Object} rules - Object where keys are field names and values are validation rules
 * @param {Object} data - Object containing the data to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 * 
 * @example
 * const result = validateInputTypes({
 *   phone: { value: req.body.phone, type: 'string', required: true },
 *   age: { value: req.body.age, type: 'number', required: false }
 * });
 * 
 * if (!result.valid) {
 *   return sendResponse(res, 400, false, result.errors.join(', '), null);
 * }
 */
function validateInputTypes(rules) {
  const errors = [];

  for (const [fieldName, rule] of Object.entries(rules)) {
    const { value, type, required } = rule;

    // Skip validation if field is not required and value is undefined/null
    if (!required && (value === undefined || value === null)) {
      continue;
    }

    // If field is required, check it exists
    if (required && (value === undefined || value === null)) {
      errors.push(`${fieldName} is required`);
      continue;
    }

    // Validate type
    switch (type) {
      case 'string':
        if (!isString(value)) {
          errors.push(`${fieldName} must be a string`);
        }
        break;

      case 'nonEmptyString':
        if (!isNonEmptyString(value)) {
          errors.push(`${fieldName} must be a non-empty string`);
        }
        break;

      case 'number':
        if (!isNumber(value)) {
          errors.push(`${fieldName} must be a number`);
        }
        break;

      case 'boolean':
        if (!isBoolean(value)) {
          errors.push(`${fieldName} must be a boolean`);
        }
        break;

      case 'array':
        if (!isArray(value)) {
          errors.push(`${fieldName} must be an array`);
        }
        break;

      default:
        errors.push(`Unknown validation type for ${fieldName}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Quick validation helper for common auth inputs
 * @param {Object} inputs - Object with phone and password
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
function validateAuthInputs(inputs) {
  const { phone, password } = inputs;
  return validateInputTypes({
    phone: { value: phone, type: 'string', required: true },
    password: { value: password, type: 'string', required: true },
  });
}

/**
 * Quick validation helper for query string parameters (can be undefined)
 * Ensures if they exist, they are strings (prevents NoSQL injection via query params)
 * @param {Object} params - Query parameters from req.query
 * @param {string[]} fieldNames - Array of field names to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
function validateQueryParams(params, fieldNames) {
  const rules = {};
  for (const fieldName of fieldNames) {
    const value = params[fieldName];
    // Only validate if parameter exists
    if (value !== undefined && value !== null && value !== '') {
      rules[fieldName] = { value, type: 'string', required: false };
    }
  }
  return validateInputTypes(rules);
}

/**
 * Sanitize string input by ensuring it's a string and trimming whitespace
 * Returns empty string if input is not a string
 * @param {*} value - The value to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeString(value) {
  return isString(value) ? value.trim() : '';
}

/**
 * Sanitize number input by parsing and validating
 * Returns defaultValue if input is not a valid number
 * @param {*} value - The value to sanitize
 * @param {number} defaultValue - Default value if parsing fails
 * @returns {number} - Sanitized number
 */
function sanitizeNumber(value, defaultValue = 0) {
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return isNumber(parsed) ? parsed : defaultValue;
}

/**
 * Sanitize integer input by parsing and validating
 * Returns defaultValue if input is not a valid integer
 * @param {*} value - The value to sanitize
 * @param {number} defaultValue - Default value if parsing fails
 * @param {number} radix - Radix for parseInt (default 10)
 * @returns {number} - Sanitized integer
 */
function sanitizeInteger(value, defaultValue = 0, radix = 10) {
  const parsed = typeof value === 'string' ? parseInt(value, radix) : value;
  return isNumber(parsed) ? parsed : defaultValue;
}

/**
 * Validate that a value is a valid MongoDB ObjectId (24-character hex string).
 * Prevents Mongoose CastError from propagating as 500 errors.
 * @param {*} value
 * @returns {boolean}
 */
function isValidObjectId(value) {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

module.exports = {
  // Core validators
  isNonEmptyString,
  isString,
  isNumber,
  isBoolean,
  isArray,
  isValidObjectId,

  // Batch validators
  validateInputTypes,
  validateAuthInputs,
  validateQueryParams,

  // Sanitizers
  sanitizeString,
  sanitizeNumber,
  sanitizeInteger,
};
