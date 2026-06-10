import { describe, it, expect } from 'vitest';
import { isValidBDPhone, getPasswordStrength } from '../../src/utils/validators';
import { formatPrice, timeAgo } from '../../src/utils/formatters';

describe('validators — isValidBDPhone', () => {
  it('should validate correct BD phone numbers', () => {
    expect(isValidBDPhone('01712345678')).toBe(true);
    expect(isValidBDPhone('01812345678')).toBe(true);
    expect(isValidBDPhone('01912345678')).toBe(true);
    expect(isValidBDPhone('01612345678')).toBe(true);
    expect(isValidBDPhone('01512345678')).toBe(true);
  });

  it('should reject invalid phone numbers', () => {
    expect(isValidBDPhone('1234')).toBe(false);
    expect(isValidBDPhone('02712345678')).toBe(false);
    expect(isValidBDPhone('0171234567')).toBe(false);
    expect(isValidBDPhone('017123456789')).toBe(false);
    expect(isValidBDPhone('')).toBe(false);
    expect(isValidBDPhone(null)).toBe(false);
    expect(isValidBDPhone(undefined)).toBe(false);
  });

  it('should reject non-string inputs', () => {
    expect(isValidBDPhone(1234567890)).toBe(false);
    expect(isValidBDPhone({})).toBe(false);
    expect(isValidBDPhone([])).toBe(false);
  });

  it('should handle whitespace', () => {
    expect(isValidBDPhone(' 01712345678 ')).toBe(false);
    expect(isValidBDPhone('017 1234 5678')).toBe(false);
  });
});

describe('validators — getPasswordStrength', () => {
  it('should return weak for short passwords', () => {
    expect(getPasswordStrength('abc')).toBe('weak');
    expect(getPasswordStrength('12345')).toBe('weak');
    expect(getPasswordStrength('pass')).toBe('weak');
  });

  it('should return medium for moderate passwords', () => {
    expect(getPasswordStrength('password123')).toBe('medium');
    expect(getPasswordStrength('test1234')).toBe('medium');
  });

  it('should return strong for complex passwords', () => {
    expect(getPasswordStrength('Abc123!@#Long')).toBe('strong');
    expect(getPasswordStrength('MyP@ssw0rd2024')).toBe('strong');
    expect(getPasswordStrength('Str0ng!Pass')).toBe('strong');
  });

  it('should never return below weak', () => {
    const result = getPasswordStrength('a');
    expect(['weak', 'medium', 'strong']).toContain(result);
  });

  it('should handle empty string', () => {
    const result = getPasswordStrength('');
    expect(['weak', 'medium', 'strong']).toContain(result);
  });

  it('should handle null/undefined gracefully', () => {
    const result1 = getPasswordStrength(null);
    const result2 = getPasswordStrength(undefined);
    expect(['weak', 'medium', 'strong']).toContain(result1);
    expect(['weak', 'medium', 'strong']).toContain(result2);
  });
});

describe('formatters — formatPrice', () => {
  it('should handle null', () => {
    expect(formatPrice(null)).toBe('—');
  });

  it('should handle undefined', () => {
    expect(formatPrice(undefined)).toBe('—');
  });

  it('should handle zero', () => {
    const result = formatPrice(0);
    expect(result).toContain('0');
  });

  it('should format number with thousand separator', () => {
    const result = formatPrice(1500);
    expect(result).toContain('1,500');
  });

  it('should format large numbers', () => {
    const result = formatPrice(1234567);
    expect(result).toContain('1,234,567');
  });

  it('should include currency symbol', () => {
    const result = formatPrice(1000);
    expect(result).toMatch(/৳|BDT/);
  });

  it('should handle decimal numbers', () => {
    const result = formatPrice(1500.50);
    expect(result).toBeDefined();
  });

  it('should handle negative numbers gracefully', () => {
    const result = formatPrice(-100);
    expect(result).toBeDefined();
  });
});

describe('formatters — timeAgo', () => {
  it('should return "just now" for recent timestamps', () => {
    const now = new Date();
    const result = timeAgo(now);
    expect(result).toContain('now');
  });

  it('should return minutes ago', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const result = timeAgo(fiveMinutesAgo);
    expect(result).toContain('minute');
  });

  it('should return hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const result = timeAgo(twoHoursAgo);
    expect(result).toContain('hour');
  });

  it('should return days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const result = timeAgo(threeDaysAgo);
    expect(result).toContain('day');
  });

  it('should handle invalid dates', () => {
    const result = timeAgo('invalid');
    expect(result).toBeDefined();
  });

  it('should handle null/undefined', () => {
    const result1 = timeAgo(null);
    const result2 = timeAgo(undefined);
    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
  });

  it('should handle string dates', () => {
    const dateString = new Date().toISOString();
    const result = timeAgo(dateString);
    expect(result).toBeDefined();
  });

  it('should handle future dates', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const result = timeAgo(tomorrow);
    expect(result).toBeDefined();
  });
});

describe('validators — edge cases', () => {
  it('should handle Bengali numerals in phone', () => {
    expect(isValidBDPhone('০১৭১২৩৪৫৬৭৮')).toBe(false);
  });

  it('should reject phone with country code', () => {
    expect(isValidBDPhone('+8801712345678')).toBe(false);
    expect(isValidBDPhone('8801712345678')).toBe(false);
  });
});

describe('formatters — edge cases', () => {
  it('formatPrice should handle very large numbers', () => {
    const result = formatPrice(999999999);
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it('formatPrice should handle very small decimals', () => {
    const result = formatPrice(0.01);
    expect(result).toBeDefined();
  });

  it('timeAgo should handle year-old dates', () => {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const result = timeAgo(oneYearAgo);
    expect(result).toContain('year');
  });
});
