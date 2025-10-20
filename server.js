// server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cloudinary = require('cloudinary').v2;

const authRouter = require('./routers/auth');
const userRouter = require('./routers/user');
const userInfoRouter = require('./routers/userInfo');
const postRouter = require('./routers/post');
const favoriteRouter = require('./routers/favorite');
const supportRouter = require('./routers/support');
const commentsRouter = require('./routers/comments');
const ratingsRouter = require('./routers/ratings');
const cloudinaryRouter = require('./routers/cloudinary');

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME || 'demo',
  api_key: process.env.API_KEY || 'demo',
  api_secret: process.env.API_SECRET || 'demo'
});

const app = express();



const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow tools like curl
    if (Array.isArray(frontendUrl) ? frontendUrl.includes(origin) : origin === frontendUrl) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE'],
  allowedHeaders: ['Content-Type','Authorization','token']
}));

const mongoUrl = process.env.MONGO_URL;
console.log("Attempting to connect to:",
  mongoUrl ? mongoUrl.replace(/:[^:@]*@/, ":****@") : "undefined"
);

mongoose.connect(process.env.MONGO_URL, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => console.log("✅ Connected to MongoDB successfully"))
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error.message);
    console.log("\n🔧 Troubleshooting steps:");
    console.log("1. Check IP whitelist in MongoDB Atlas");
    console.log("2. Verify username/password");
    console.log("3. Make sure cluster is running");
  });

// ===================== Middleware =====================


app.use(cookieParser());
app.use(express.json());

// Public folder cho ảnh/video nếu lưu local
app.use('/uploads', express.static('uploads'));

// Debug request
app.use((req, res, next) => {
  console.log(`🔥 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/user-info', userInfoRouter);
app.use('/api/posts', postRouter); // ✅ API đăng bài
app.use('/api/favorites', favoriteRouter);
app.use('/api/support', supportRouter);
app.use('/api/cloudinary', cloudinaryRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/ratings', ratingsRouter);

// ensure tmp folder exists for multer
const fs = require('fs');
const tmpDir = './tmp';
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
