const express = require('express');
const FavoriteRoom = require('../models/FavoriteRoom');
const Room = require('../models/Room');
const { verifyToken } = require('../middleware/middlewareControllers');

const router = express.Router();

// Get current user's favorites (with room info)
router.get('/', verifyToken, async (req, res) => {
  try {
    const list = await FavoriteRoom.find({ user: req.user.id })
      .populate({ path: 'room' })
      .sort({ createdAt: -1 });
    res.json({ success: true, favorites: list });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch favorites' });
  }
});

// Add favorite
router.post('/:roomId', verifyToken, async (req, res) => {
  try {
    const roomId = req.params.roomId;
    let query;
    let toSet;
    // Nếu roomId là ObjectId hợp lệ và tìm thấy trong DB → lưu ref room
    if (roomId.match(/^[a-fA-F0-9]{24}$/)) {
      const room = await Room.findById(roomId);
      if (room) {
        query = { user: req.user.id, room: room._id };
        toSet = { user: req.user.id, room: room._id };
      }
    }
    // Nếu không có room trong DB, fallback lưu clientRoomId (id từ mock JSON)
    if (!query) {
      query = { user: req.user.id, clientRoomId: roomId };
      toSet = { user: req.user.id, clientRoomId: roomId };
    }
    const fav = await FavoriteRoom.findOneAndUpdate(query, { $setOnInsert: toSet }, { new: true, upsert: true });
    res.json({ success: true, favorite: fav });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(200).json({ success: true, message: 'Already favorited' });
    }
    res.status(500).json({ success: false, message: 'Failed to add favorite' });
  }
});

// Remove favorite
router.delete('/:roomId', verifyToken, async (req, res) => {
  try {
    const roomId = req.params.roomId;
    if (roomId.match(/^[a-fA-F0-9]{24}$/)) {
      const byRef = await FavoriteRoom.findOneAndDelete({ user: req.user.id, room: roomId });
      if (byRef) return res.json({ success: true });
    }
    await FavoriteRoom.findOneAndDelete({ user: req.user.id, clientRoomId: roomId });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to remove favorite' });
  }
});

// Count for a user (optional)
router.get('/count/me', verifyToken, async (req, res) => {
  try {
    const count = await FavoriteRoom.countDocuments({ user: req.user.id });
    res.json({ success: true, count });
  } catch (e) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;


