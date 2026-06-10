'use strict';
const mongoose = require('mongoose');
const Product = require('../src/modules/catalog/Product.model');
const User = require('../src/modules/users/User.model');
const AuditLog = require('../src/utils/AuditLog.model');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const productsByBrand = await Product.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$brand', count: { $sum: 1 } } },
      { $lookup: { from: 'brands', localField: '_id', foreignField: '_id', as: 'brand' } },
      { $unwind: '$brand' },
      { $project: { brand: '$brand.name', count: 1 } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    console.log('productsByBrand OK:', productsByBrand.length, 'items');

    const dealerReg = await User.aggregate([
      { $match: { role: 'dealer', createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    console.log('dealerReg OK:', dealerReg.length, 'items');

    const topProducts = await Product.find({ isDeleted: false })
      .sort({ viewCount: -1 })
      .limit(5)
      .select('name slug viewCount')
      .maxTimeMS(5000)
      .lean();
    console.log('topProducts OK:', topProducts.length, 'items');

    const activity = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('adminId', 'profile.name')
      .maxTimeMS(5000)
      .lean();
    console.log('activity OK:', activity.length, 'items');

    console.log('ALL ANALYTICS OK!');
  } catch (e) {
    console.error('ERROR:', e.message);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
