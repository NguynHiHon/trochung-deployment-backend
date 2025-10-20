# Backend Setup Guide

## Environment Variables

Tạo file `.env` trong thư mục `backend/` với nội dung sau:

```env
# Database
MONGO_URL=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/trochung?retryWrites=true&w=majority

# JWT
JWT_SECRET=your-jwt-secret-key-here
JWT_REFRESH_SECRET=your-jwt-refresh-secret-key-here

# Cloudinary Configuration
# Đăng ký tài khoản tại https://cloudinary.com/console
CLOUD_NAME=your-cloudinary-cloud-name
API_KEY=your-cloudinary-api-key
API_SECRET=your-cloudinary-api-secret

# Server
PORT=8000
NODE_ENV=development
```

## Cloudinary Setup

1. Đăng ký tài khoản tại [Cloudinary](https://cloudinary.com/console)
2. Lấy thông tin từ Dashboard:
   - Cloud Name
   - API Key  
   - API Secret
3. Cập nhật vào file `.env`

## Chạy Server

```bash
npm install
npm run dev
```

Server sẽ chạy tại `http://localhost:8000`
