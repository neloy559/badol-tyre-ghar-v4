/**
 * Create Admin User
 * Usage: node --env-file=.env scripts/create-admin.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/modules/users/User.model');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/btg-v4';

async function createAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Connected\n');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ phone: '01700000000' });
    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists!');
      console.log('   Phone: 01700000000');
      console.log('   Password: admin123\n');
      await mongoose.disconnect();
      process.exit(0);
    }
    
    // Create admin user
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    const admin = new User({
      name: 'Admin User',
      phone: '01700000000',
      email: 'admin@btg.com',
      password: 'admin123', // This will be hashed by the model's pre-save hook
      role: 'admin',
      isApproved: true,
      dealerInfo: {
        shopName: 'BTG Admin',
        businessAddress: 'Head Office, Dhaka',
        tier: 'platinum',
      },
    });
    
    await admin.save();
    
    console.log('✅ Admin user created successfully!\n');
    console.log('📱 Phone: 01700000000');
    console.log('🔑 Password: admin123');
    console.log('👤 Role: admin');
    console.log('💎 Tier: platinum\n');
    console.log('🌐 Login at: http://localhost:5173/login\n');
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createAdmin();
