const Post = require('./Post') || require('../models/Post');
const Room = require('./Room') || require('../models/Room');

// Admin utility: delete all posts
async function deleteAllPosts(req, res) {
	try {
		const result = await Post.deleteMany({});
		// unset post reference in rooms
		await Room.updateMany({}, { $unset: { post: "" } });
		return res.status(200).json({ success: true, deletedCount: result.deletedCount });
	} catch (err) {
		console.error('processhoan.deleteAllPosts error', err);
		return res.status(500).json({ success: false, message: 'Server error' });
	}
}

// Admin utility: delete all rooms
async function deleteAllRooms(req, res) {
	try {
		const result = await Room.deleteMany({});
		// unset room reference in posts
		await Post.updateMany({}, { $unset: { room: "" } });
		return res.status(200).json({ success: true, deletedCount: result.deletedCount });
	} catch (err) {
		console.error('processhoan.deleteAllRooms error', err);
		return res.status(500).json({ success: false, message: 'Server error' });
	}
}

module.exports = { deleteAllPosts, deleteAllRooms };

