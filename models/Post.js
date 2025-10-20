const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
    // Minimal post: only metadata for listing
    title: { type: String, required: true, maxlength: 150 },
    postType: { type: String, default: 'room_rental' },
    overviewDescription: { type: String, maxlength: 500 },
    // Liên kết User
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Liên kết tới UserInfos (nếu bài đăng muốn tham chiếu profile/preference)
    userInfo: { type: mongoose.Schema.Types.ObjectId, ref: 'UserInfos', default: null },

    // (userInfo removed — user identity is available via `user` field; preferences can be stored in post if needed)

    // Liên kết Room (1-1)
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
    // Phân loại tin: svip, vip, normal
    postTier: {
        type: String,
        enum: ["svip", "outstand", "normal"],
        default: "normal"
    },

    // Trạng thái
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    }
}, { timestamps: true });

module.exports = mongoose.model("Post", PostSchema);
