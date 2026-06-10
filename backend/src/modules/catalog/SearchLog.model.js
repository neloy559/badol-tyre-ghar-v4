'use strict';

const mongoose = require('mongoose');

const searchLogSchema = new mongoose.Schema(
  {
    // Normalized search term (lowercase, trimmed)
    term: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    count:          { type: Number, default: 1, min: 0 },
    resultCount:    { type: Number, default: 0, min: 0 },
    lastSearchedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false, // using lastSearchedAt instead
  }
);

// term index handled by unique: true in schema field
searchLogSchema.index({ count: -1 });

const SearchLog = mongoose.models.SearchLog || mongoose.model('SearchLog', searchLogSchema);

module.exports = SearchLog;

