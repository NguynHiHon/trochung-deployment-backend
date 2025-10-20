const Comment = require('../models/Comment');

// Tạo bình luận (có thể là reply nếu có parent)
exports.createComment = async (req, res) => {
  try {
    const userId = req.user?.id;
    let { postId } = req.params;
    const { content, parent } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Nội dung bình luận không được để trống' });
    }

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

    const comment = await Comment.create({ user: userId, post: postId, content: content.trim(), parent: parent || null });
    const populated = await comment.populate('user', 'username email');
    return res.status(201).json({ success: true, comment: populated });
  } catch (e) {
    console.error('createComment error:', e);
    return res.status(500).json({ success: false, message: 'Lỗi server khi tạo bình luận' });
  }
};

// Lấy danh sách comment theo post (kèm thread basic)
exports.getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Kiểm tra xem postId có phải ObjectId hợp lệ không
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      // Nếu không hợp lệ, trả về mảng rỗng thay vì lỗi
      return res.json({ success: true, comments: [] });
    }
    
    // Lấy toàn bộ comments của post, sắp xếp theo thời gian
    const list = await Comment.find({ post: postId, isDeleted: false })
      .sort({ createdAt: 1 })
      .populate('user', 'username email')
      .lean();

    // Dựng cây thread đơn giản theo parent
    const byId = new Map();
    list.forEach(c => { c.replies = []; byId.set(String(c._id), c); });
    const roots = [];
    list.forEach(c => {
      if (c.parent && byId.has(String(c.parent))) byId.get(String(c.parent)).replies.push(c);
      else roots.push(c);
    });

    return res.json({ success: true, comments: roots });
  } catch (e) {
    console.error('getCommentsByPost error:', e);
    return res.status(500).json({ success: false, message: 'Lỗi server khi lấy bình luận' });
  }
};

// Chỉnh sửa bình luận (chỉ chủ comment)
exports.updateComment = async (req, res) => {
  try {
    const { id } = req.params; // comment id
    const userId = req.user?.id;
    const { content } = req.body;
    const c = await Comment.findById(id);
    if (!c || c.isDeleted) return res.status(404).json({ success: false, message: 'Không tìm thấy bình luận' });
    if (String(c.user) !== String(userId)) return res.status(403).json({ success: false, message: 'Không có quyền sửa bình luận này' });
    c.content = String(content || '').trim();
    c.isEdited = true;
    await c.save();
    const populated = await c.populate('user', 'username email');
    return res.json({ success: true, comment: populated });
  } catch (e) {
    console.error('updateComment error:', e);
    return res.status(500).json({ success: false, message: 'Lỗi server khi sửa bình luận' });
  }
};

// Xoá mềm bình luận (chỉ chủ comment hoặc admin)
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params; // comment id
    const userId = req.user?.id;
    const c = await Comment.findById(id);
    if (!c || c.isDeleted) return res.status(404).json({ success: false, message: 'Không tìm thấy bình luận' });
    if (String(c.user) !== String(userId) && req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Không có quyền xoá' });
    c.isDeleted = true;
    await c.save();
    return res.json({ success: true });
  } catch (e) {
    console.error('deleteComment error:', e);
    return res.status(500).json({ success: false, message: 'Lỗi server khi xoá bình luận' });
  }
};


