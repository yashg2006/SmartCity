const express = require('express');
const router = express.Router();
const SensorData = require('../models/SensorData');

// POST /api/sensors/data — ESP32 sends data here
// Example Arduino/ESP32 code:
// HTTPClient http;
// http.begin("http://YOUR_SERVER_IP:5000/api/sensors/data");
// http.addHeader("Content-Type", "application/json");
// String payload = "{\"nodeId\":\"NODE-001\",\"zone\":\"Sector 4A\",\"distance\":" + String(distance) + ",\"gasLevel\":" + String(gasLevel) + ",\"waterStatus\":\"NORMAL\",\"lat\":12.9716,\"lng\":77.5946}";
// http.POST(payload);
router.post('/data', async (req, res) => {
    try {
        console.log('📥 Sensor Data Received:', req.body);
        const { nodeId, zone, distance, drainDistance, gasLevel, waterStatus, lat, lng, batteryLevel } = req.body;

        // More permissive validation for debugging
        const sensorPayload = {
            nodeId: nodeId || 'NODE-001',
            zone: zone || 'Unknown Zone',
            distance: distance !== undefined ? distance : 0,
            drainDistance: drainDistance !== undefined ? drainDistance : null,
            gasLevel: gasLevel !== undefined ? gasLevel : 0,
            waterStatus: waterStatus || 'NORMAL',
            lat: lat || null,
            lng: lng || null,
            batteryLevel: batteryLevel || 100,
            timestamp: new Date().toISOString()
        };

        // Emit to all connected dashboard clients immediately
        io.emit('sensor:update', sensorPayload);

        // Save to DB if connected
        const data = new SensorData(sensorPayload);
        await data.save();

        // --- Alert Thresholds (tuned to real hardware) ---
        // Bin full: distance < 8cm  |  Drain blocked: drainDistance < 5cm
        // Gas critical: MQ6 raw > 2200  |  Water: sensor HIGH
        const binFull = distance > 0 && distance < 8;
        const drainBlock = drainDistance != null && drainDistance > 0 && drainDistance < 5;
        const gasCrit = gasLevel > 2200;
        const waterAlert = waterStatus === 'OVERFLOW';

        if (binFull || drainBlock || gasCrit || waterAlert) {
            let alertType = gasCrit ? 'GAS_CRITICAL' : waterAlert ? 'WATER_OVERFLOW' : binFull ? 'BIN_FULL' : 'DRAIN_BLOCKED';
            let message = gasCrit ? `☣️ Gas critical at ${zone}: ${gasLevel} ADC`
                : waterAlert ? `🌊 Water overflow at ${zone}`
                    : binFull ? `🗑️ Dustbin full at ${zone}: only ${distance}cm remaining`
                        : `🚧 Drainage blocked at ${zone}: ${drainDistance}cm clearance`;

            io.emit('sensor:alert', { ...sensorPayload, alertType, message });
        }

        res.status(201).json({ success: true, data: sensorPayload });
    } catch (err) {
        // If MongoDB is not connected, still broadcast via socket
        const io = req.app.get('io');
        const sensorPayload = { ...req.body, timestamp: new Date().toISOString() };
        io.emit('sensor:update', sensorPayload);
        res.status(201).json({ success: true, data: sensorPayload, note: 'DB offline, data broadcast via socket' });
    }
});

// GET /api/sensors/latest — last 50 readings
router.get('/latest', async (req, res) => {
    try {
        const data = await SensorData.find().sort({ timestamp: -1 }).limit(50);
        res.json(data);
    } catch {
        res.json([]);
    }
});

// GET /api/sensors/nodes — unique nodes summary
router.get('/nodes', async (req, res) => {
    try {
        const nodes = await SensorData.aggregate([
            { $sort: { timestamp: -1 } },
            { $group: { _id: '$nodeId', latest: { $first: '$$ROOT' } } },
            { $replaceRoot: { newRoot: '$latest' } }
        ]);
        res.json(nodes);
    } catch {
        res.json([]);
    }
});

module.exports = router;
