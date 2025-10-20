const mongoose = require('mongoose');

// Mỗi user chỉ được đánh giá 1 lần cho mỗi post
const RatingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  // 1-5 sao
  stars: { type: Number, min: 1, max: 5, required: true },
  // Optional review text đi kèm
  review: { type: String, maxlength: 1000 }
}, { timestamps: true });

// Unique constraint: 1 user per post
RatingSchema.index({ user: 1, post: 1 }, { unique: true });

module.exports = mongoose.model('Rating', RatingSchema, 'ratings');


