const express = require('express');
const router = express.Router();
const SensorData = require('../models/SensorData');
const GarbageReport = require('../models/GarbageReport');

// POST /api/sensors/data — ESP32 sends data here
router.post('/data', async (req, res) => {
    try {
        const io = req.app.get('io');
        console.log('📥 Sensor Data Received:', req.body);
        const {
            nodeId, zone, distance, drainDistance, gasLevel, waterStatus, lat, lng, batteryLevel,
            dustbin, drainage, gas, waterLeak
        } = req.body;

        // Map incoming keys from Arduino code to dashboard format
        const finalDistance = dustbin !== undefined ? dustbin : (distance !== undefined ? distance : 0);
        const finalDrainDist = drainage !== undefined ? drainage : (drainDistance !== undefined ? drainDistance : null);
        const finalGas = gas !== undefined ? gas : (gasLevel !== undefined ? gasLevel : 0);

        // Water sensor logic:
        // waterLeak='YES' or waterStatus='OVERFLOW' → water overflowing
        // waterLeak='DRY' or waterStatus='DRY' → no water flow (pipe dry)
        // else → NORMAL (water flowing normally)
        let finalWater = 'NORMAL';
        if (waterLeak === 'YES' || waterStatus === 'OVERFLOW') {
            finalWater = 'OVERFLOW';
        } else if (waterLeak === 'DRY' || waterStatus === 'DRY') {
            finalWater = 'DRY';
        } else {
            finalWater = waterStatus || 'NORMAL';
        }

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

        // --- Alert Thresholds ---
        // Bin full: distance < 8cm (ultrasonic on lid, close = full)
        // Water dry: waterStatus DRY = no flow = potential blockage
        // Drain high water: drainDistance < 5cm = water very close to sensor = pipe nearly full
        const binFull = finalDistance > 0 && finalDistance < 8;
        const waterDry = finalWater === 'DRY';
        const drainHigh = finalDrainDist != null && finalDrainDist < 5;
        const waterOverflow = finalWater === 'OVERFLOW';

        if (binFull || waterDry || drainHigh || waterOverflow) {
            let alertType, message;
            if (waterOverflow) {
                alertType = 'WATER_OVERFLOW';
                message = `🌊 Water overflow at ${sensorPayload.zone}`;
            } else if (waterDry) {
                alertType = 'WATER_DRY';
                message = `⚠️ No water flow detected at ${sensorPayload.zone} — potential blockage`;
            } else if (drainHigh) {
                alertType = 'DRAIN_HIGH';
                message = `🚧 High water level in drainage at ${sensorPayload.zone}: ${finalDrainDist}cm from sensor`;
            } else {
                alertType = 'BIN_FULL';
                message = `🗑️ Dustbin nearly full at ${sensorPayload.zone}: only ${finalDistance}cm remaining`;
            }

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

// POST /api/sensors/report — citizen garbage image report
router.post('/report', async (req, res) => {
    try {
        const { imageData, location, description, reportedBy } = req.body;

        if (!imageData || !location) {
            return res.status(400).json({ error: 'Image and location are required' });
        }

        const report = new GarbageReport({
            imageData,
            location,
            description: description || '',
            reportedBy: reportedBy || 'Citizen',
            status: 'PENDING'
        });

        await report.save();

        // Notify municipal dashboard
        const io = req.app.get('io');
        io.emit('garbage:report', {
            _id: report._id,
            location: report.location,
            description: report.description,
            status: report.status,
            reportedBy: report.reportedBy,
            createdAt: report.createdAt
        });

        res.status(201).json({ success: true, reportId: report._id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit report' });
    }
});

// GET /api/sensors/reports — fetch all garbage reports
router.get('/reports', async (req, res) => {
    try {
        const reports = await GarbageReport.find().sort({ createdAt: -1 }).limit(50);
        // Don't send full image data in list view to save bandwidth
        const lightReports = reports.map(r => ({
            _id: r._id,
            location: r.location,
            description: r.description,
            status: r.status,
            reportedBy: r.reportedBy,
            createdAt: r.createdAt
        }));
        res.json(lightReports);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

module.exports = router;
