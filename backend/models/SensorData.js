const mongoose = require('mongoose');

const SensorDataSchema = new mongoose.Schema({
    nodeId: { type: String, required: true, index: true },
    zone: { type: String, required: true },
    lat: { type: Number },
    lng: { type: Number },
    distance: { type: Number, required: true },  // cm — dustbin HC-SR04 (alert if < 8cm = full)
    drainDistance: { type: Number, default: null },   // cm — drainage HC-SR04 (alert if < 5cm = blocked)
    gasLevel: { type: Number, required: true },  // ADC raw — MQ6 gas sensor (alert if > 2200)
    waterStatus: { type: String, enum: ['NORMAL', 'OVERFLOW'], default: 'NORMAL' }, // digital P13
    batteryLevel: { type: Number, default: 100 },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SensorData', SensorDataSchema);
