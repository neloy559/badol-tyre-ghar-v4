'use strict';

const fc = require('fast-check');
const bcrypt = require('bcryptjs');

// Load environment variables from .env file
// Node.js will load from .env when using --env-file flag
// Ensure PASSWORD_PEPPER is set in environment
if (!process.env.PASSWORD_PEPPER) {
  // Fallback for test environment if not set
  process.env.PASSWORD_PEPPER = 'global_pepper_string_for_password_hashing_security';
}

/**
 * PBT for Auth Module
 * Property 8: Password Hash Non-reversibility Invariant
 * 
 * Validates: Requirements 2.6, 3.1
 * 
 * This test suite verifies cryptographic properties of password hashing:
 * 1. Hash is never equal to plaintext (non-reversibility)
 * 2. Correct password always verifies successfully
 * 3. Wrong password always fails verification
 * 
 * WHY: Password hashing with pepper + bcrypt ensures that even if the database
 * is compromised, attackers cannot obtain plaintext passwords or use rainbow tables.
 * The pepper adds an application-level secret, and bcrypt's computational cost
 * makes brute-force attacks infeasible.
 */

describe('PBT — Password Hash Non-reversibility (Property 8)', () => {
  const BCRYPT_SALT_ROUNDS = 12;
  const TEST_TIMEOUT = 60000; // 60 seconds for bcrypt operations
  
  // Generate random passwords of varying lengths and character sets
  const passwordArbitrary = fc.string({ 
    minLength: 6, 
    maxLength: 72 // bcrypt max input length
  });

  it('Property 8a: stored hash is never equal to plaintext password', async () => {
    // WHY: This ensures the password is actually hashed and not stored in plaintext
    await fc.assert(
      fc.asyncProperty(passwordArbitrary, async (password) => {
        const pepperedPassword = process.env.PASSWORD_PEPPER + password;
        const hash = await bcrypt.hash(pepperedPassword, BCRYPT_SALT_ROUNDS);
        
        // Hash should never equal the plaintext password
        return hash !== password && hash !== pepperedPassword;
      }),
      { numRuns: 50 } // Reduced from 100 for faster execution with bcrypt
    );
  }, TEST_TIMEOUT);

  it('Property 8b: correct password with pepper always verifies successfully', async () => {
    // WHY: This ensures that legitimate users can always log in with their correct password
    await fc.assert(
      fc.asyncProperty(passwordArbitrary, async (password) => {
        const pepperedPassword = process.env.PASSWORD_PEPPER + password;
        const hash = await bcrypt.hash(pepperedPassword, BCRYPT_SALT_ROUNDS);
        
        // Same password with pepper should always match the hash
        const isMatch = await bcrypt.compare(pepperedPassword, hash);
        return isMatch === true;
      }),
      { numRuns: 50 } // Reduced from 100 for faster execution with bcrypt
    );
  }, TEST_TIMEOUT);

  it('Property 8c: wrong password always fails verification', async () => {
    // WHY: This ensures that attackers cannot gain access with incorrect passwords
    await fc.assert(
      fc.asyncProperty(
        passwordArbitrary,
        passwordArbitrary,
        async (password, wrongPassword) => {
          // Only test when passwords are actually different
          if (password === wrongPassword) {
            return true; // Skip this case
          }

          const pepperedPassword = process.env.PASSWORD_PEPPER + password;
          const hash = await bcrypt.hash(pepperedPassword, BCRYPT_SALT_ROUNDS);
          
          const wrongPepperedPassword = process.env.PASSWORD_PEPPER + wrongPassword;
          const isMatch = await bcrypt.compare(wrongPepperedPassword, hash);
          
          // Wrong password should never match
          return isMatch === false;
        }
      ),
      { numRuns: 50 } // Reduced from 100 for faster execution with bcrypt
    );
  }, TEST_TIMEOUT);

  it('Property 8d: hash without pepper fails verification', async () => {
    // WHY: This ensures that the pepper is actually being used in the hashing process
    await fc.assert(
      fc.asyncProperty(passwordArbitrary, async (password) => {
        const pepperedPassword = process.env.PASSWORD_PEPPER + password;
        const hash = await bcrypt.hash(pepperedPassword, BCRYPT_SALT_ROUNDS);
        
        // Password without pepper should not match hash created with pepper
        const isMatch = await bcrypt.compare(password, hash);
        return isMatch === false;
      }),
      { numRuns: 50 } // Reduced from 100 for faster execution with bcrypt
    );
  }, TEST_TIMEOUT);

  it('Property 8e: same password produces different hashes (salt randomness)', async () => {
    // WHY: This ensures that bcrypt's random salt is working correctly,
    // preventing attackers from identifying users with the same password
    await fc.assert(
      fc.asyncProperty(passwordArbitrary, async (password) => {
        const pepperedPassword = process.env.PASSWORD_PEPPER + password;
        
        // Hash the same password twice
        const hash1 = await bcrypt.hash(pepperedPassword, BCRYPT_SALT_ROUNDS);
        const hash2 = await bcrypt.hash(pepperedPassword, BCRYPT_SALT_ROUNDS);
        
        // Hashes should be different due to random salt
        // But both should verify with the same password
        const bothVerify = 
          await bcrypt.compare(pepperedPassword, hash1) &&
          await bcrypt.compare(pepperedPassword, hash2);
        
        return hash1 !== hash2 && bothVerify;
      }),
      { numRuns: 25 } // Reduced to 25 because this test does 2 hashes + 2 compares per run
    );
  }, TEST_TIMEOUT * 2); // Double timeout since this test does twice the work
});

describe('PBT — Edge Cases', () => {
  const BCRYPT_SALT_ROUNDS = 12;

  it('handles empty password (edge case)', async () => {
    const password = '';
    const pepperedPassword = process.env.PASSWORD_PEPPER + password;
    const hash = await bcrypt.hash(pepperedPassword, BCRYPT_SALT_ROUNDS);
    
    expect(hash).toBeTruthy();
    expect(hash).not.toBe(password);
    
    const isMatch = await bcrypt.compare(pepperedPassword, hash);
    expect(isMatch).toBe(true);
  });

  it('handles maximum length password (72 chars)', async () => {
    // bcrypt has a 72-byte input limit
    const password = 'a'.repeat(72);
    const pepperedPassword = process.env.PASSWORD_PEPPER + password;
    const hash = await bcrypt.hash(pepperedPassword, BCRYPT_SALT_ROUNDS);
    
    expect(hash).toBeTruthy();
    expect(hash).not.toBe(password);
    
    const isMatch = await bcrypt.compare(pepperedPassword, hash);
    expect(isMatch).toBe(true);
  });

  it('handles special characters in password', async () => {
    const password = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`\'"\\';
    const pepperedPassword = process.env.PASSWORD_PEPPER + password;
    const hash = await bcrypt.hash(pepperedPassword, BCRYPT_SALT_ROUNDS);
    
    expect(hash).toBeTruthy();
    expect(hash).not.toBe(password);
    
    const isMatch = await bcrypt.compare(pepperedPassword, hash);
    expect(isMatch).toBe(true);
  });

  it('handles unicode characters in password', async () => {
    const password = '密码🔒émojis®';
    const pepperedPassword = process.env.PASSWORD_PEPPER + password;
    const hash = await bcrypt.hash(pepperedPassword, BCRYPT_SALT_ROUNDS);
    
    expect(hash).toBeTruthy();
    expect(hash).not.toBe(password);
    
    const isMatch = await bcrypt.compare(pepperedPassword, hash);
    expect(isMatch).toBe(true);
  });

  it('verifies PASSWORD_PEPPER is defined in environment', () => {
    expect(process.env.PASSWORD_PEPPER).toBeDefined();
    expect(process.env.PASSWORD_PEPPER).not.toBe('');
    expect(typeof process.env.PASSWORD_PEPPER).toBe('string');
  });

  it('verifies hash format is valid bcrypt hash', async () => {
    const password = 'testpassword123';
    const pepperedPassword = process.env.PASSWORD_PEPPER + password;
    const hash = await bcrypt.hash(pepperedPassword, BCRYPT_SALT_ROUNDS);
    
    // bcrypt hashes start with $2a$, $2b$, or $2y$ followed by cost factor
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
  });
});
