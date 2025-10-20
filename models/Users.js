const mongoose = require('mongoose')


const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' }
    ,
    // retoken stores the hashed refresh token for the current session (or null)
    retoken: { type: String, default: null }
},
    { timestamps: true }
)

module.exports = mongoose.model('User', userSchema, 'users')