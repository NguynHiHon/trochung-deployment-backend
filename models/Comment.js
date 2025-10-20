const mongoose = require('mongoose');

// Bình luận có thể threaded (trả lời nhau) qua parent
const CommentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  // Nội dung bình luận
  content: { type: String, required: true, maxlength: 2000 },
  // Cho phép threaded bằng parent comment (optional)
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  // Soft flags
  isEdited: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

// Index để truy vấn theo post và theo thread
CommentSchema.index({ post: 1, createdAt: -1 });
CommentSchema.index({ parent: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', CommentSchema, 'comments');


