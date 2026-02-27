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
        const io = req.app.get('io');
        console.log('📥 Sensor Data Received:', req.body);
        const {
            nodeId, zone, distance, drainDistance, gasLevel, waterStatus, lat, lng, batteryLevel,
            dustbin, drainage, gas, waterLeak
        } = req.body;

        // Map incoming keys from user's custom Arduino code to dashboard format
        const finalDistance = dustbin !== undefined ? dustbin : (distance !== undefined ? distance : 0);
        const finalDrainDist = drainage !== undefined ? drainage : (drainDistance !== undefined ? drainDistance : null);
        const finalGas = gas !== undefined ? gas : (gasLevel !== undefined ? gasLevel : 0);
        const finalWater = waterLeak === 'YES' ? 'OVERFLOW' : (waterStatus || 'NORMAL');

        const sensorPayload = {
            nodeId: nodeId || 'NODE-001',
            zone: zone || 'Sector 4A',
            distance: finalDistance,
            drainDistance: finalDrainDist,
            gasLevel: finalGas,
            waterStatus: finalWater,
            lat: lat || 12.9716,
            lng: lng || 77.5946,
            batteryLevel: batteryLevel || 100,
            isHardware: true,
            timestamp: new Date().toISOString()
        };

        // Emit to all connected dashboard clients immediately
        io.emit('sensor:update', sensorPayload);

        // Save to DB if connected
        const data = new SensorData(sensorPayload);
        await data.save();

        // --- Alert Thresholds (tuned to real hardware) ---
        // Bin full: distance < 8cm  |  Drain blocked: drainDistance > 50cm
        // Gas critical: MQ6 raw > 2200  |  Water: sensor HIGH
        const binFull = distance > 0 && distance < 8;
        const drainBlock = drainDistance != null && drainDistance > 50;
        const gasCrit = gasLevel > 2200;
        const waterAlert = waterStatus === 'OVERFLOW';

        if (binFull || drainBlock || gasCrit || waterAlert) {
            const alertType = gasCrit ? 'GAS_CRITICAL' : waterAlert ? 'WATER_OVERFLOW' : binFull ? 'BIN_FULL' : 'DRAIN_BLOCKED';
            const message = gasCrit ? `☣️ Gas critical at ${zone}: ${gasLevel} ADC`
                : waterAlert ? `🌊 Water overflow at ${zone}`
                    : binFull ? `🗑️ Dustbin full at ${zone}: only ${distance}cm remaining`
                        : `🚧 Drainage critical at ${zone}: level exceeded 50cm (${drainDistance}cm)`;

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
        const filter = {};
        if (req.query.isHardware === 'true') {
            filter.isHardware = true;
        } else if (req.query.nodeId) {
            filter.nodeId = req.query.nodeId;
        }

        const data = await SensorData.find(filter).sort({ timestamp: -1 }).limit(50);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch sensor history' });
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

// GET /api/sensors/incidents — fetch active/dispatched incidents
router.get('/incidents', async (req, res) => {
    try {
        const Incident = require('../models/Incident');
        const incidents = await Incident.find({ status: { $ne: 'RESOLVED' } }).sort({ createdAt: -1 });
        res.json(incidents);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch incidents' });
    }
});

// POST /api/sensors/incidents/:id/dispatch — mark as dispatched
router.post('/incidents/:id/dispatch', async (req, res) => {
    try {
        const Incident = require('../models/Incident');
        const incident = await Incident.findByIdAndUpdate(
            req.params.id,
            { status: 'DISPATCHED', dispatchedAt: new Date() },
            { new: true }
        );
        const io = req.app.get('io');
        io.emit('incident:update', incident);
        res.json(incident);
    } catch (err) {
        res.status(500).json({ error: 'Failed to dispatch crew' });
    }
});

// POST /api/sensors/incidents/:id/resolve — mark as resolved
router.post('/incidents/:id/resolve', async (req, res) => {
    try {
        const Incident = require('../models/Incident');
        const incident = await Incident.findByIdAndUpdate(
            req.params.id,
            { status: 'RESOLVED', resolvedAt: new Date() },
            { new: true }
        );
        const io = req.app.get('io');
        io.emit('incident:update', incident);
        res.json(incident);
    } catch (err) {
        res.status(500).json({ error: 'Failed to resolve incident' });
    }
});

module.exports = router;
