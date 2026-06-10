'use strict';

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Category name is required.'], trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    isActive:     { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// slug index handled by unique: true in schema field
categorySchema.index({ isActive: 1, displayOrder: 1 });

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
module.exports = Category;

