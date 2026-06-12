'use strict';

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: [true, 'Phone number is required.'],
      unique: true,
      trim: true,
    },
    // bcrypt hash (select: false — never returned in queries by default)
    password: {
      type: String,
      required: [true, 'Password is required.'],
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'editor', 'dealer', 'customer'],
      default: 'customer',
    },
    // Used for dealer onboarding flow
    registrationStatus: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
      default: 'approved', // customers are auto-approved; dealers start as pending
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    // Dealer tier — only relevant when role === 'dealer'
    tier: {
      type: String,
      enum: ['standard', 'silver', 'gold', 'platinum'],
      default: 'standard',
    },
    // Extra discount % on top of tier discount (admin-configurable per dealer)
    discountMultiplier: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    profile: {
      name: { type: String, default: '' },
      // Dealer-specific fields
      businessName: { type: String, default: '' },
      ownerName:    { type: String, default: '' },
      address:      { type: String, default: '' },
      avatar:       { type: String, default: '' }, // Cloudinary URL
    },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────
// SECURITY & PERFORMANCE: Indexes prevent slow queries that can be exploited for DoS attacks

// phone: Unique index for login queries (primary authentication field)
// Used in: POST /auth/login, POST /auth/register
// phone index handled by unique: true in schema field

// role + registrationStatus: Compound index for admin queries
// Used in: GET /admin/dealers (filtering by role and approval status)
userSchema.index({ role: 1, registrationStatus: 1 });

// isDeleted: Index for soft-delete filtering
// Used in: All user queries to exclude deleted users
userSchema.index({ isDeleted: 1 });

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;

