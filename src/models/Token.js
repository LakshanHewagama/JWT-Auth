const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['refresh'], // Only refresh tokens are blacklisted
    required: true,
    default: 'refresh'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  blacklisted: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Index for automatic deletion of expired tokens
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for faster lookups
tokenSchema.index({ token: 1, blacklisted: 1 });
tokenSchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model('Token', tokenSchema);
