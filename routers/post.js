const express = require("express");
const multer = require('multer');
const path = require('path');
const { verifyToken } = require('../middleware/middlewareControllers');
const { createPost, listMyPosts, listByUser, getPostById, getPostByRoom,getAllRooms, getRoomById } = require('../controllers/postController');

const router = express.Router();

// multer tmp storage -> ./tmp (store files on disk before uploading)
const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, path.join(__dirname, '..', 'tmp')); },
    filename: function (req, file, cb) { cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname)); }
});

// file filter: allow only images and videos
const fileFilter = (req, file, cb) => {
    if (/^image\//.test(file.mimetype) || /^video\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image and video files are allowed'), false);
};

const upload = multer({ 
    storage,
    limits: { fileSize: 12 * 1024 * 1024 }, // 12MB per file
    fileFilter
});

// accept two fields: 'media' (images/videos) and 'contract' (contract images)
const uploadFields = upload.fields([
    { name: 'media', maxCount: 25 },
    { name: 'contract', maxCount: 5 }
]);

// Public routes - không cần authentication
router.get('/rooms', getAllRooms);
router.get('/rooms/:id', getRoomById);

// Protected routes - cần authentication
router.post('/', verifyToken, uploadFields, createPost);
// authenticated route to get current user's posts (dashboard)
router.get('/mine', verifyToken, listMyPosts);
// require authentication to list a user's posts (user must be authenticated)
router.get('/user/:userId', verifyToken, listByUser);
// public route to fetch a single post (with room details)
// changed path to be explicit to avoid collision with other routes
router.get('/postdetail/:id', getPostById);
// update a post (only owner or admin) - requires authentication
router.put('/:id', verifyToken, require('../controllers/postController').updatePost);
// public route to fetch post by room id (useful when frontend has only room._id)
router.get('/by-room/:roomId', getPostByRoom);

module.exports = router;
