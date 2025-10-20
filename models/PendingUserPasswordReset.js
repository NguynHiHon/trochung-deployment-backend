// backend/models/PendingUserPasswordReset.js

const mongoose = require('mongoose');

const pendingUserPasswordResetSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  verificationCode: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('PendingUserPasswordReset', pendingUserPasswordResetSchema);
