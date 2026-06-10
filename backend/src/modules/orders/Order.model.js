'use strict';

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName:  { type: String, default: '' },
    variantSku:   { type: String, required: true },
    quantity:     { type: Number, min: 1, default: 1 },
    unitPrice:    { type: Number, default: 0 },   // price at time of order
    totalPrice:   { type: Number, default: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // Source inquiry
    inquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inquiry',
      default: null,
    },
    // Dealer / customer
    dealer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    dealerName:   { type: String, default: '' },
    dealerPhone:  { type: String, default: '' },

    items: [orderItemSchema],

    // Financials
    subtotal:   { type: Number, default: 0 },
    discount:   { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },

    // Order status lifecycle
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'delivered', 'cancelled'],
      default: 'pending',
    },

    // Payment
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid'],
      default: 'unpaid',
    },
    paymentMethod: { type: String, default: '' },  // cash, bkash, bank
    amountPaid:    { type: Number, default: 0 },

    adminNote: { type: String, default: '' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for common queries
orderSchema.index({ dealer: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ inquiryId: 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
module.exports = Order;
