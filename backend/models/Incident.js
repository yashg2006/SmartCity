const mongoose = require('mongoose');

const IncidentSchema = new mongoose.Schema({
    nodeId: { type: String, required: true, index: true },
    type: { type: String, enum: ['BIN_FULL', 'DRAIN_BLOCKED', 'GAS_CRITICAL', 'WATER_OVERFLOW'], required: true },
    zone: { type: String, required: true },
    status: { type: String, enum: ['ACTIVE', 'DISPATCHED', 'RESOLVED'], default: 'ACTIVE' },
    details: { type: Object },
    createdAt: { type: Date, default: Date.now },
    dispatchedAt: { type: Date },
    resolvedAt: { type: Date }
});

module.exports = mongoose.model('Incident', IncidentSchema);
