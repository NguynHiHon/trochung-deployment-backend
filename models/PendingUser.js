
const mongoose = require('mongoose');

/** Lưu tạm đăng ký + mã xác minh, auto xoá bằng TTL khi hết hạn */
const PendingUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true },
    password: { type: String, required: true }, // đã hash
    verificationCode: { type: String, required: true },
    // TTL: khi expiresAt < now thì Mongo tự xoá document
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PendingUser', PendingUserSchema);
