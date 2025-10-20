const mongoose = require('mongoose');

const FavoriteRoomSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Nếu phòng tồn tại trong DB thì lưu ref room
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  // Trường dự phòng cho dữ liệu mock (id từ frontend data.json)
  clientRoomId: { type: String }
}, { timestamps: true });

// Each user can favorite a given room only once
FavoriteRoomSchema.index({ user: 1, room: 1 }, { unique: true, partialFilterExpression: { room: { $exists: true } } });
FavoriteRoomSchema.index({ user: 1, clientRoomId: 1 }, { unique: true, partialFilterExpression: { clientRoomId: { $exists: true } } });

module.exports = mongoose.model('FavoriteRoom', FavoriteRoomSchema, 'favorite_rooms');


