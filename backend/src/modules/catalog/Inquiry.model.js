'use strict';

const mongoose = require('mongoose');

const inquiryItemSchema = new mongoose.Schema(
  {
    productId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    variantSku: { type: String },
    quantity:   { type: Number, min: 1, default: 1 },
  },
  { _id: false }
);

const inquirySchema = new mongoose.Schema(
  {
    // null for guest/unauthenticated submissions
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    items: [inquiryItemSchema],
    status: {
      type: String,
      enum: ['inquired', 'replied', 'converted'],
      default: 'inquired',
    },
    // Pre-formatted WhatsApp message string, auto-generated on creation
    whatsappMessage: { type: String, default: '' },
    adminNote:       { type: String, default: '' },
  },
  { timestamps: true }
);

inquirySchema.index({ status: 1 });
inquirySchema.index({ createdAt: -1 });
inquirySchema.index({ user: 1 });

const Inquiry = mongoose.models.Inquiry || mongoose.model('Inquiry', inquirySchema);

module.exports = Inquiry;
