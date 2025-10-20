const Rating = require('../models/Rating');

// Tạo/cập nhật rating (1 user chỉ 1 lần cho mỗi post)
exports.upsertRating = async (req, res) => {
  try {
    const userId = req.user?.id;
    let { postId } = req.params;
    const { stars, review } = req.body;
    const s = Number(stars);
    if (!s || s < 1 || s > 5) return res.status(400).json({ success: false, message: 'Số sao không hợp lệ (1-5)' });

    // Nếu postId không phải ObjectId hợp lệ, tạo Post ảo từ Room
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      const Room = require('../models/Room');
      const Post = require('../models/Post');
      
      // Tìm room theo id
      const room = await Room.findById(postId);
      if (!room) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy phòng trọ' });
      }
      
      // Nếu room đã có post thì dùng, không thì tạo mới
      if (room.post) {
        postId = room.post;
      } else {
        // Tạo Post mới cho room này
        const newPost = await Post.create({
          title: 'Bài đăng tự động',
          postType: 'room_rental',
          user: room.user,
          overviewDescription: 'Bài đăng được tạo tự động',
          room: room._id,
          status: 'approved'
        });
        room.post = newPost._id;
        await room.save();
        postId = newPost._id;
      }
    }

    const doc = await Rating.findOneAndUpdate(
      { user: userId, post: postId },
      { $set: { stars: s, review: review || '' } },
      { new: true, upsert: true }
    );
    return res.status(201).json({ success: true, rating: doc });
  } catch (e) {
    console.error('upsertRating error:', e);
    return res.status(500).json({ success: false, message: 'Lỗi server khi lưu đánh giá' });
  }
};

// Lấy rating trung bình + số lượng cho 1 post
exports.getPostRatingStats = async (req, res) => {
  try {
    const { postId } = req.params;
    let matchId;
    try {
      matchId = require('mongoose').Types.ObjectId.createFromHexString(postId);
    } catch (_) {
      // Nếu không phải ObjectId hợp lệ, trả về 0 thay vì lỗi
      return res.json({ success: true, stats: { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } } });
    }
    const [faceted] = await Rating.aggregate([
      { $match: { post: matchId } },
      { $facet: {
          perStar: [ { $group: { _id: '$stars', count: { $sum: 1 } } } ],
          overall: [ { $group: { _id: null, avg: { $avg: '$stars' }, count: { $sum: 1 } } } ]
      } }
    ]);
    const overall = (faceted && faceted.overall && faceted.overall[0]) || { avg: 0, count: 0 };
    const perStarArray = (faceted && faceted.perStar) || [];
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    perStarArray.forEach(row => { const s = Number(row._id); if (distribution[s] !== undefined) distribution[s] = row.count; });
    return res.json({ success: true, stats: { average: overall.avg || 0, count: overall.count || 0, distribution } });
  } catch (e) {
    console.error('getPostRatingStats error:', e);
    return res.status(500).json({ success: false, message: 'Lỗi server khi lấy thống kê đánh giá' });
  }
};

// Lấy rating của chính user cho post (để prefill UI)
exports.getMyRatingForPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id;
    const r = await Rating.findOne({ post: postId, user: userId });
    return res.json({ success: true, rating: r });
  } catch (e) {
    console.error('getMyRatingForPost error:', e);
    return res.status(500).json({ success: false });
  }
};


