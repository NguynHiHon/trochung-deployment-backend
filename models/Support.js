const mongoose = require('mongoose');

const supportSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    message: { type: String, required: true },
    status: { type: String, enum: ['open', 'in_progress', 'closed'], default: 'open' }
}, { timestamps: true });

module.exports = mongoose.model('Support', supportSchema, 'supports');


