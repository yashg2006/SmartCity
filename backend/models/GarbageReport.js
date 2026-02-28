const mongoose = require('mongoose');

const GarbageReportSchema = new mongoose.Schema({
    imageData: { type: String, required: true },  // base64-encoded image
    location: { type: String, required: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['PENDING', 'ACKNOWLEDGED', 'RESOLVED'], default: 'PENDING' },
    reportedBy: { type: String, default: 'Citizen' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GarbageReport', GarbageReportSchema);
