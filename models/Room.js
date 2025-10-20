const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
    // Thông tin chi tiết phòng
    roomType: { type: String, required: true },       // Loại phòng: phòng đơn, căn hộ, ký túc xá...
    price: { type: Number, required: true },          // Giá
    unit: { type: String, default: "VND" },   // Đơn vị
    area: { type: Number, required: true },           // Diện tích (m²)
    // Địa chỉ / vị trí cụ thể của phòng
    province: { type: String, required: true },
    district: { type: String, required: true },
    ward: { type: String },
    address: { type: String, required: true },
    utilities: [String],                              // Tiện ích: wifi, điều hòa, bếp...
    // additionalCosts: chi phí phát sinh (ví dụ: giữ xe, internet) được gửi từ frontend
    additionalCosts: [
        {
            type: { type: String },
            frequency: { type: String }
        }
    ],
    images: [String],                                 // Link ảnh riêng của phòng
    videos: [String],                                 // Link video riêng
    contractImages: [String],                         // Link ảnh hợp đồng (lưu riêng)
    notes: { type: String },                          // Ghi chú khác

    // Liên kết tới bài Post
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },

    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }

}, { timestamps: true });

module.exports = mongoose.model("Room", RoomSchema);
