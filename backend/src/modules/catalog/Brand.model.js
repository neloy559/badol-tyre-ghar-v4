'use strict';

const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema(
  {
    name:        { type: String, required: [true, 'Brand name is required.'], trim: true },
    slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    logo:        { type: String, default: '' },
    description: { type: String, default: '' },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

// slug index handled by unique: true in schema field
brandSchema.index({ isActive: 1 });

const Brand = mongoose.models.Brand || mongoose.model('Brand', brandSchema);
module.exports = Brand;

