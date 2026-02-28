const mongoose = require('mongoose');

const SensorDataSchema = new mongoose.Schema({
    nodeId: { type: String, required: true, index: true },
    zone: { type: String, required: true },
    lat: { type: Number },
    lng: { type: Number },
    distance: { type: Number, default: 0 },  // cm — dustbin HC-SR04 (alert if < 8cm = full)
    drainDistance: { type: Number, default: null },   // cm — drainage HC-SR04 (distance to water surface)
    gasLevel: { type: Number, default: 0 },  // ADC raw — MQ6 gas sensor (optional)
    waterStatus: { type: String, enum: ['NORMAL', 'OVERFLOW', 'DRY'], default: 'NORMAL' }, // water sensor: NORMAL=flowing, DRY=no flow
    batteryLevel: { type: Number, default: 100 },
    isHardware: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SensorData', SensorDataSchema);
