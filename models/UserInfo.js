const mongoose = require('mongoose');

const userInfoSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        unique: true 
    },
    
    // Thông tin cá nhân cơ bản
    fullName: { 
        type: String, 
        required: true,
        trim: true 
    },
    
    avatar: { 
        type: String, 
        default: null // URL của ảnh avatar
    },
    
    age: { 
        type: Number, 
        min: 18, 
        max: 100,
        required: true 
    },
    
    gender: { 
        type: String, 
        enum: ['Nam', 'Nữ', 'Khác'], 
        required: true 
    },
    
    profession: { 
        type: String, 
        required: true,
        trim: true
    },
    
    // Sở thích (mảng các string)
    interests: [{
        type: String,
        trim: true
    }],
    
    // Thói quen (mảng các string)  
    habits: [{
        type: String,
        trim: true
    }],
    
    // Những điều không thích (mảng các string)
    dislikes: [{
        type: String,
        trim: true
    }],
    
    // Thông tin bổ sung
    bio: { 
        type: String, 
        maxlength: 500,
        default: '' 
    },
    
    // Thông tin liên hệ
    phoneNumber: { 
        type: String, 
        trim: true 
    },
    

    
    isProfileComplete: { 
        type: Boolean, 
        default: false 
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('UserInfos', userInfoSchema, 'user_infos');