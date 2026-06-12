/**
 * Create Admin User
 *
 * Usage:
 *   node --env-file=.env scripts/create-admin.js
 *
 * Set ADMIN_PHONE and ADMIN_PASSWORD in your .env before running,
 * or export them as environment variables:
 *
 *   ADMIN_PHONE=01XXXXXXXXX ADMIN_PASSWORD=yourpassword node --env-file=.env scripts/create-admin.js
 */

'use strict';

const mongoose = require('mongoose');
const User = require('../src/modules/users/User.model');

const MONGODB_URI  = process.env.MONGODB_URI;
const ADMIN_PHONE  = process.env.ADMIN_PHONE;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is required. Run with --env-file=.env or set the variable.');
  process.exit(1);
}
if (!ADMIN_PHONE || !ADMIN_PASSWORD) {
  console.error('❌ ADMIN_PHONE and ADMIN_PASSWORD are required environment variables.');
  process.exit(1);
}

async function createAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Connected\n');

    const existing = await User.findOne({ phone: ADMIN_PHONE });
    if (existing) {
      console.log('ℹ️  A user with this phone number already exists.');
      console.log('   Phone:', ADMIN_PHONE);
      await mongoose.disconnect();
      process.exit(0);
    }

    const admin = new User({
      phone:    ADMIN_PHONE,
      password: ADMIN_PASSWORD, // hashed by the model pre-save hook
      role:     'admin',
      registrationStatus: 'approved',
      profile: {
        name: 'Admin',
        businessName: 'Badol Tyre Ghar',
      },
    });

    await admin.save();

    console.log('✅ Admin user created successfully!');
    console.log('📱 Phone:', ADMIN_PHONE);
    console.log('👤 Role: admin\n');

    await mongoose.disconnect();
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createAdmin();
