// All pure functions — no side effects

export function isValidBDPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.trim();
  return /^01\d{9}$/.test(cleaned); // exactly 11 digits starting with 01
}

export function isValidPassword(password) {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 6;
}

export function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function getPasswordStrength(password) {
  if (!password || password.length < 6) return 'weak';
  const hasUpper   = /[A-Z]/.test(password);
  const hasNumber  = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*]/.test(password);
  const isLong     = password.length >= 10;
  const score = [hasUpper, hasNumber, hasSpecial, isLong].filter(Boolean).length;
  if (score <= 1) return 'weak';
  if (score <= 2) return 'medium';
  return 'strong';
}
