'use strict';

/**
 * Unit Tests for Input Type Validators
 * Tests NoSQL injection prevention through type validation
 */

const {
  isNonEmptyString,
  isString,
  isNumber,
  isBoolean,
  isArray,
  validateInputTypes,
  validateAuthInputs,
  validateQueryParams,
  sanitizeString,
  sanitizeNumber,
  sanitizeInteger,
} = require('../../src/utils/validators');

describe('Input Type Validators - NoSQL Injection Prevention', () => {
  
  describe('isString', () => {
    test('should return true for valid strings', () => {
      expect(isString('hello')).toBe(true);
      expect(isString('')).toBe(true);
      expect(isString('  ')).toBe(true);
    });

    test('should return false for objects (NoSQL injection attempt)', () => {
      expect(isString({ $gt: '' })).toBe(false);
      expect(isString({ $ne: null })).toBe(false);
    });

    test('should return false for non-string types', () => {
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString([])).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    test('should return true for non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
      expect(isNonEmptyString('  test  ')).toBe(true);
    });

    test('should return false for empty strings', () => {
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString('   ')).toBe(false);
    });

    test('should return false for objects (NoSQL injection attempt)', () => {
      expect(isNonEmptyString({ $gt: '' })).toBe(false);
    });
  });

  describe('isNumber', () => {
    test('should return true for valid numbers', () => {
      expect(isNumber(0)).toBe(true);
      expect(isNumber(123)).toBe(true);
      expect(isNumber(-456)).toBe(true);
      expect(isNumber(3.14)).toBe(true);
    });

    test('should return false for NaN', () => {
      expect(isNumber(NaN)).toBe(false);
    });

    test('should return false for non-numbers', () => {
      expect(isNumber('123')).toBe(false);
      expect(isNumber({ $gt: 0 })).toBe(false);
      expect(isNumber(null)).toBe(false);
    });
  });

  describe('validateInputTypes', () => {
    test('should validate correct input types', () => {
      const result = validateInputTypes({
        name: { value: 'John', type: 'string', required: true },
        age: { value: 25, type: 'number', required: true },
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject NoSQL injection attempts in required fields', () => {
      const result = validateInputTypes({
        phone: { value: { $gt: '' }, type: 'string', required: true },
        password: { value: 'validPassword', type: 'string', required: true },
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('phone must be a string');
    });

    test('should reject multiple invalid types', () => {
      const result = validateInputTypes({
        phone: { value: { $ne: null }, type: 'string', required: true },
        age: { value: '25', type: 'number', required: true },
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    test('should allow optional fields to be undefined', () => {
      const result = validateInputTypes({
        phone: { value: '1234567890', type: 'string', required: true },
        email: { value: undefined, type: 'string', required: false },
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject required fields that are missing', () => {
      const result = validateInputTypes({
        phone: { value: undefined, type: 'string', required: true },
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('phone is required');
    });
  });

  describe('validateAuthInputs', () => {
    test('should validate correct auth inputs', () => {
      const result = validateAuthInputs({
        phone: '01712345678',
        password: 'securePass123',
      });
      expect(result.valid).toBe(true);
    });

    test('should reject NoSQL injection in phone', () => {
      const result = validateAuthInputs({
        phone: { $gt: '' },
        password: 'securePass123',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('phone must be a string');
    });

    test('should reject NoSQL injection in password', () => {
      const result = validateAuthInputs({
        phone: '01712345678',
        password: { $ne: null },
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('password must be a string');
    });
  });

  describe('validateQueryParams', () => {
    test('should validate string query parameters', () => {
      const result = validateQueryParams(
        { search: 'tire', category: 'passenger' },
        ['search', 'category', 'brand']
      );
      expect(result.valid).toBe(true);
    });

    test('should reject NoSQL injection in query params', () => {
      const result = validateQueryParams(
        { search: { $regex: '.*' }, category: 'passenger' },
        ['search', 'category']
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('search must be a string');
    });

    test('should allow missing optional query params', () => {
      const result = validateQueryParams(
        { search: 'tire' },
        ['search', 'category', 'brand']
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('sanitizeInteger', () => {
    test('should sanitize valid integer strings', () => {
      expect(sanitizeInteger('10', 1)).toBe(10);
      expect(sanitizeInteger('0', 1)).toBe(0);
      expect(sanitizeInteger('-5', 1)).toBe(-5);
    });

    test('should return default for invalid inputs', () => {
      expect(sanitizeInteger('abc', 1)).toBe(1);
      expect(sanitizeInteger({ $gt: 0 }, 1)).toBe(1);
      expect(sanitizeInteger(null, 1)).toBe(1);
      expect(sanitizeInteger(undefined, 1)).toBe(1);
    });

    test('should handle numeric inputs', () => {
      expect(sanitizeInteger(42, 1)).toBe(42);
      expect(sanitizeInteger(0, 1)).toBe(0);
    });
  });

  describe('sanitizeString', () => {
    test('should sanitize valid strings', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
      expect(sanitizeString('test')).toBe('test');
    });

    test('should return empty string for NoSQL injection attempts', () => {
      expect(sanitizeString({ $gt: '' })).toBe('');
      expect(sanitizeString({ $ne: null })).toBe('');
    });

    test('should return empty string for non-strings', () => {
      expect(sanitizeString(123)).toBe('');
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString([])).toBe('');
    });
  });

  describe('Real-World Attack Scenarios', () => {
    test('should prevent login bypass with NoSQL injection', () => {
      // Attack: { phone: { $gt: "" }, password: { $gt: "" } }
      const result = validateAuthInputs({
        phone: { $gt: '' },
        password: { $gt: '' },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should prevent user enumeration with $ne operator', () => {
      const result = validateInputTypes({
        phone: { value: { $ne: null }, type: 'string', required: true },
      });
      expect(result.valid).toBe(false);
    });

    test('should prevent tier escalation with object injection', () => {
      const result = validateInputTypes({
        tier: { value: { $set: 'premium' }, type: 'string', required: true },
      });
      expect(result.valid).toBe(false);
    });

    test('should prevent regex DoS attacks', () => {
      const result = validateQueryParams(
        { search: { $regex: '(a+)+$' } },
        ['search']
      );
      expect(result.valid).toBe(false);
    });
  });
});
