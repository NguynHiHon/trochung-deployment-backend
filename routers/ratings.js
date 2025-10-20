const express = require('express');
const { verifyToken } = require('../middleware/middlewareControllers');
const { upsertRating, getPostRatingStats, getMyRatingForPost } = require('../controllers/ratingController');

const router = express.Router();

// Upsert rating cho 1 post (cần đăng nhập)
router.post('/post/:postId', verifyToken, upsertRating);

// Lấy thống kê rating cho post (public)
router.get('/post/:postId/stats', getPostRatingStats);

// Lấy rating của chính mình cho post (cần đăng nhập)
router.get('/post/:postId/me', verifyToken, getMyRatingForPost);

module.exports = router;


