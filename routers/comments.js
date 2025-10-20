const express = require('express');
const { verifyToken } = require('../middleware/middlewareControllers');
const { createComment, getCommentsByPost, updateComment, deleteComment } = require('../controllers/commentController');

const router = express.Router();

// List theo post (public)
router.get('/post/:postId', getCommentsByPost);

// Tạo comment (cần đăng nhập)
router.post('/post/:postId', verifyToken, createComment);

// Sửa/Xoá comment (cần đăng nhập và là chủ comment hoặc admin)
router.put('/:id', verifyToken, updateComment);
router.delete('/:id', verifyToken, deleteComment);

module.exports = router;


