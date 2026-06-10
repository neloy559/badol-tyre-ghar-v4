'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt    = require('jsonwebtoken');

const User         = require('../users/User.model');
const RefreshToken = require('./RefreshToken.model');

// -- Constants
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_MS     = 30 * 24 * 60 * 60 * 1000;
const BCRYPT_SALT_ROUNDS       = 12;
const PHONE_MIN_LENGTH         = 11;
const PASSWORD_MIN_LENGTH      = 6;
const COOKIE_NAME              = 'btg_refresh';

function validatePhoneAndPassword(phone, password) {
  if (!phone || typeof phone !== 'string' || phone.trim().length < PHONE_MIN_LENGTH) {
    throw { statusCode: 400, message: 'Phone number must be at least ' + PHONE_MIN_LENGTH + ' characters.' };
  }
  if (!password || typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    throw { statusCode: 400, message: 'Password must be at least ' + PASSWORD_MIN_LENGTH + ' characters.' };
  }
}

async function checkDuplicatePhone(phone) {
  const existingUser = await User.findOne({ phone: phone.trim(), isDeleted: false })
    .maxTimeMS(5000); // Security: Query timeout
  if (existingUser) {
    throw { statusCode: 409, message: 'An account with this phone number already exists.' };
  }
}

// Pepper prevents rainbow-table attacks even if DB is leaked without the env secret.
async function hashPassword(plainPassword) {
  const pepperedPassword = process.env.PASSWORD_PEPPER + plainPassword;
  return bcrypt.hash(pepperedPassword, BCRYPT_SALT_ROUNDS);
}

// SHA-256 hash stored instead of raw token -- if DB is compromised, attacker cannot reuse raw tokens.
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function buildRefreshCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure:   isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge:   REFRESH_TOKEN_TTL_MS,
    path:     '/',
  };
}

function getDeviceInfo(req) {
  return (req.headers['user-agent'] || '').substring(0, 200);
}

// Issues access JWT + refresh token pair. Raw refresh token delivered via cookie only.
async function issueTokenPair(res, userId, req) {
  const userRecord = await User.findById(userId)
    .select('-password')
    .maxTimeMS(5000); // Security: Query timeout
  if (!userRecord) {
    throw { statusCode: 404, message: 'User not found.' };
  }

  const jwtPayload = {
    userId:             userRecord._id,
    role:               userRecord.role,
    registrationStatus: userRecord.registrationStatus,
    tier:               userRecord.tier,
  };

  const accessToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });

  const rawRefreshToken  = crypto.randomBytes(64).toString('hex');
  const refreshTokenHash = hashToken(rawRefreshToken);
  const expiresAt        = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await RefreshToken.create({
    userId,
    tokenHash:  refreshTokenHash,
    deviceInfo: getDeviceInfo(req),
    expiresAt,
  });

  res.cookie(COOKIE_NAME, rawRefreshToken, buildRefreshCookieOptions());

  return { accessToken, user: userRecord };
}

async function registerCustomer({ name, phone, password }, res, req) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw { statusCode: 400, message: 'Name is required.' };
  }
  validatePhoneAndPassword(phone, password);
  await checkDuplicatePhone(phone);

  const hashedPassword = await hashPassword(password);
  const newUser = await User.create({
    phone:              phone.trim(),
    password:           hashedPassword,
    role:               'customer',
    registrationStatus: 'approved',
    isVerified:         true,
    profile: { name: name.trim() },
  });

  return issueTokenPair(res, newUser._id, req);
}

async function registerDealer({ businessName, ownerName, phone, address, password }, res, req) {
  if (!businessName || typeof businessName !== 'string' || !businessName.trim()) {
    throw { statusCode: 400, message: 'Business name is required.' };
  }
  if (!ownerName || typeof ownerName !== 'string' || !ownerName.trim()) {
    throw { statusCode: 400, message: 'Owner name is required.' };
  }
  if (!address || typeof address !== 'string' || !address.trim()) {
    throw { statusCode: 400, message: 'Business address is required.' };
  }
  validatePhoneAndPassword(phone, password);
  await checkDuplicatePhone(phone);

  const hashedPassword = await hashPassword(password);
  const newDealer = await User.create({
    phone:              phone.trim(),
    password:           hashedPassword,
    role:               'dealer',
    registrationStatus: 'pending',
    isVerified:         false,
    profile: {
      businessName: businessName.trim(),
      ownerName:    ownerName.trim(),
      address:      address.trim(),
    },
  });

  // Fire-and-forget -- notification failure must never block the registration response.
  require('../notifications/notifications.service')
    .createNotificationForAllAdmins({
      type:    'dealer_application',
      title:   'New Dealer Application',
      message: businessName.trim() + ' (' + ownerName.trim() + ') has applied for a dealer account.',
      link:    '/admin/dealers/' + newDealer._id,
    })
    .catch(err => console.warn('[auth] notification error:', err.message));

  return issueTokenPair(res, newDealer._id, req);
}

async function login({ phone, password }, res, req) {
  validatePhoneAndPassword(phone, password);

  // +password re-selects the field excluded by schema default.
  const foundUser = await User.findOne({ phone: phone.trim() })
    .select('+password')
    .maxTimeMS(5000); // Security: Query timeout

  if (!foundUser) {
    // Generic message prevents user enumeration.
    throw { statusCode: 401, message: 'Invalid credentials.' };
  }
  if (foundUser.isDeleted) {
    throw { statusCode: 403, message: 'This account has been deactivated.' };
  }
  if (foundUser.registrationStatus === 'pending') {
    throw { statusCode: 403, message: 'Your dealer application is pending approval.' };
  }
  if (foundUser.registrationStatus === 'rejected') {
    throw { statusCode: 403, message: 'Your dealer application was rejected.' };
  }

  const pepperedPassword  = process.env.PASSWORD_PEPPER + password;
  const isPasswordCorrect = await bcrypt.compare(pepperedPassword, foundUser.password);

  if (!isPasswordCorrect) {
    throw { statusCode: 401, message: 'Invalid credentials.' };
  }

  return issueTokenPair(res, foundUser._id, req);
}

// Revoked token reuse = theft detection: revoke ALL sessions for that user.
async function refreshToken(rawToken, res, req) {
  if (!rawToken) {
    throw { statusCode: 401, message: 'Refresh token missing.' };
  }

  const tokenHash   = hashToken(rawToken);
  const storedToken = await RefreshToken.findOne({ tokenHash })
    .maxTimeMS(5000); // Security: Query timeout

  if (!storedToken) {
    throw { statusCode: 401, message: 'Invalid refresh token.' };
  }
  if (storedToken.isRevoked) {
    // Revoked token reuse means the token was stolen -- revoke all user sessions.
    await RefreshToken.updateMany({ userId: storedToken.userId }, { isRevoked: true });
    throw { statusCode: 401, message: 'Token reuse detected. All sessions have been revoked.' };
  }
  if (new Date() > storedToken.expiresAt) {
    throw { statusCode: 401, message: 'Refresh token expired. Please log in again.' };
  }

  // Revoke old token before issuing new one (rotation prevents replay attacks).
  storedToken.isRevoked = true;
  await storedToken.save();

  return issueTokenPair(res, storedToken.userId, req);
}

async function logout(rawToken, res) {
  if (rawToken) {
    const tokenHash = hashToken(rawToken);
    await RefreshToken.findOneAndUpdate({ tokenHash }, { isRevoked: true });
  }
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

async function getMe(userId) {
  const currentUser = await User.findById(userId)
    .select('-password')
    .maxTimeMS(5000); // Security: Query timeout
  if (!currentUser) {
    throw { statusCode: 404, message: 'User not found.' };
  }
  return currentUser;
}

module.exports = { registerCustomer, registerDealer, login, refreshToken, logout, getMe };