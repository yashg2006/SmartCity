const mongoose = require('mongoose');

const MosquitoReportSchema = new mongoose.Schema({
    imageData: { type: String, required: true },          // base64 photo from mobile
    location: { type: String, required: true },            // reported location text
    zone: { type: String, default: 'Sector 4A' },         // sector
    mlResult: {
        type: String,
        enum: ['DETECTED', 'NOT_DETECTED', 'POTENTIAL_RISK'],
        default: 'NOT_DETECTED'
    },
    confidence: { type: Number, default: 0, min: 0, max: 1 },   // ML confidence 0–1
    riskScore: { type: Number, default: 0, min: 0, max: 100 },  // combined risk score
    riskFactors: {
        mlScore: { type: Number, default: 0 },
        waterScore: { type: Number, default: 0 },
        gasScore: { type: Number, default: 0 },
        historyScore: { type: Number, default: 0 }
    },
    waterStagnation: { type: Boolean, default: false },
    gasLevel: { type: Number, default: 0 },
    reportedBy: { type: String, default: 'Citizen' },
    status: {
        type: String,
        enum: ['PENDING', 'VERIFIED', 'ACTION_TAKEN', 'RESOLVED'],
        default: 'PENDING'
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MosquitoReport', MosquitoReportSchema);
