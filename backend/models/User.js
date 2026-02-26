const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    area: { type: String, required: true },
    ecoCredits: { type: Number, default: 0 },
    reportsCount: { type: Number, default: 0 },
    rank: { type: Number, default: 0 },
    avatar: { type: String, default: '🧑' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
