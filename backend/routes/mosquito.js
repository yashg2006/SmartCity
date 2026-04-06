const express = require('express');
const router = express.Router();
const MosquitoReport = require('../models/MosquitoReport');
const SensorData = require('../models/SensorData');

// ─── ML Simulation ────────────────────────────────────────
// In production, replace this with a real TensorFlow / ONNX model call.
// This simulates ML inference based on image analysis keywords.
function runMosquitoML(imageBase64) {
    // Simulate ML model inference
    // In real deployment: load a TensorFlow.js model or call a Python ML API
    const imageSize = imageBase64.length;
    const hash = imageBase64.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

    // Simulate varying confidence based on image characteristics
    const seed = (hash % 100) / 100;

    if (seed > 0.65) {
        return { result: 'DETECTED', confidence: 0.7 + (seed * 0.3) };
    } else if (seed > 0.35) {
        return { result: 'POTENTIAL_RISK', confidence: 0.4 + (seed * 0.25) };
    } else {
        return { result: 'NOT_DETECTED', confidence: 0.75 + (seed * 0.2) };
    }
}

// ─── Risk Score Calculator ────────────────────────────────
async function calculateRiskScore(mlResult, mlConfidence, zone) {
    // Factor 1: ML detection score (40% weight)
    let mlScore = 0;
    if (mlResult === 'DETECTED') {
        mlScore = mlConfidence * 40;
    } else if (mlResult === 'POTENTIAL_RISK') {
        mlScore = mlConfidence * 20;
    } else {
        mlScore = (1 - mlConfidence) * 10; // Low risk if NOT_DETECTED with low confidence
    }

    // Factor 2: Water stagnation from sensors (30% weight)
    let waterScore = 0;
    let waterStagnation = false;
    let gasLevel = 0;

    try {
        const latestSensor = await SensorData.findOne({ zone })
            .sort({ timestamp: -1 })
            .limit(1);

        if (latestSensor) {
            // Water stagnation: overflow or very low drainage distance = standing water
            if (latestSensor.waterStatus === 'OVERFLOW' ||
                (latestSensor.drainDistance != null && latestSensor.drainDistance < 5)) {
                waterScore = 30;
                waterStagnation = true;
            } else if (latestSensor.waterStatus === 'DRY') {
                // Dry drainage with recent overflow could indicate stagnant puddles
                waterScore = 15;
                waterStagnation = false;
            }
            gasLevel = latestSensor.gasLevel || 0;
        }
    } catch (err) {
        console.error('Sensor data fetch error:', err.message);
    }

    // Factor 3: Gas/environment levels (15% weight)
    // Higher gas readings can indicate decaying organic matter — mosquito-friendly
    const gasScore = Math.min(15, (gasLevel / 4095) * 15);

    // Factor 4: Historical reports in this zone (15% weight)
    let historyScore = 0;
    try {
        const recentCount = await MosquitoReport.countDocuments({
            zone,
            mlResult: { $in: ['DETECTED', 'POTENTIAL_RISK'] },
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // last 7 days
        });
        historyScore = Math.min(15, (recentCount / 10) * 15);
    } catch (err) {
        console.error('History fetch error:', err.message);
    }

    const riskScore = Math.round(Math.min(100, mlScore + waterScore + gasScore + historyScore));

    return {
        riskScore,
        riskFactors: {
            mlScore: Math.round(mlScore * 10) / 10,
            waterScore: Math.round(waterScore * 10) / 10,
            gasScore: Math.round(gasScore * 10) / 10,
            historyScore: Math.round(historyScore * 10) / 10
        },
        waterStagnation,
        gasLevel
    };
}

// ─── POST /api/mosquito/analyze ───────────────────────────
// Accept photo + location, run ML, compute risk, save report
router.post('/analyze', async (req, res) => {
    try {
        const { imageData, location, zone, reportedBy } = req.body;

        if (!imageData || !location) {
            return res.status(400).json({ error: 'Image and location are required' });
        }

        const finalZone = zone || 'Sector 4A';

        // Step 1: Run ML inference
        const { result: mlResult, confidence } = runMosquitoML(imageData);

        // Step 2: Calculate risk score using sensors + ML + history
        const riskData = await calculateRiskScore(mlResult, confidence, finalZone);

        // Step 3: Save report
        const report = new MosquitoReport({
            imageData,
            location: location.trim(),
            zone: finalZone,
            mlResult,
            confidence: Math.round(confidence * 100) / 100,
            riskScore: riskData.riskScore,
            riskFactors: riskData.riskFactors,
            waterStagnation: riskData.waterStagnation,
            gasLevel: riskData.gasLevel,
            reportedBy: reportedBy || 'Citizen',
            status: mlResult === 'DETECTED' ? 'VERIFIED' : 'PENDING'
        });

        await report.save();

        // Step 4: Emit via Socket.io
        const io = req.app.get('io');
        const emitData = {
            _id: report._id,
            location: report.location,
            zone: report.zone,
            mlResult: report.mlResult,
            confidence: report.confidence,
            riskScore: report.riskScore,
            riskFactors: report.riskFactors,
            waterStagnation: report.waterStagnation,
            reportedBy: report.reportedBy,
            status: report.status,
            createdAt: report.createdAt
        };
        io.emit('mosquito:report', emitData);

        // If high risk, emit alert
        if (riskData.riskScore > 60) {
            io.emit('sensor:alert', {
                alertType: 'MOSQUITO_RISK',
                zone: finalZone,
                message: `🦟 High mosquito breeding risk (${riskData.riskScore}/100) at ${finalZone}: ${mlResult}`,
                riskScore: riskData.riskScore
            });
        }

        res.status(201).json({
            success: true,
            analysis: {
                mlResult,
                confidence: Math.round(confidence * 100) / 100,
                riskScore: riskData.riskScore,
                riskFactors: riskData.riskFactors,
                waterStagnation: riskData.waterStagnation,
                status: report.status
            },
            reportId: report._id
        });

    } catch (err) {
        console.error('Mosquito analysis error:', err);
        res.status(500).json({ error: 'Analysis failed: ' + err.message });
    }
});

// ─── GET /api/mosquito/reports ────────────────────────────
router.get('/reports', async (req, res) => {
    try {
        const reports = await MosquitoReport.find()
            .sort({ createdAt: -1 })
            .limit(50)
            .select('-imageData'); // Don't send full image in list view

        res.json(reports);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

// ─── GET /api/mosquito/risk-zones ─────────────────────────
// Aggregate risk scores per zone
router.get('/risk-zones', async (req, res) => {
    try {
        const zones = await MosquitoReport.aggregate([
            { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
            {
                $group: {
                    _id: '$zone',
                    avgRisk: { $avg: '$riskScore' },
                    maxRisk: { $max: '$riskScore' },
                    totalReports: { $sum: 1 },
                    detectedCount: {
                        $sum: { $cond: [{ $eq: ['$mlResult', 'DETECTED'] }, 1, 0] }
                    },
                    lastReport: { $max: '$createdAt' }
                }
            },
            { $sort: { avgRisk: -1 } }
        ]);

        res.json(zones.map(z => ({
            zone: z._id,
            avgRisk: Math.round(z.avgRisk),
            maxRisk: z.maxRisk,
            totalReports: z.totalReports,
            detectedCount: z.detectedCount,
            lastReport: z.lastReport
        })));
    } catch (err) {
        res.json([]);
    }
});

// ─── POST /api/mosquito/reports/:id/verify ────────────────
router.post('/reports/:id/verify', async (req, res) => {
    try {
        const report = await MosquitoReport.findByIdAndUpdate(
            req.params.id,
            { status: 'ACTION_TAKEN' },
            { new: true }
        ).select('-imageData');

        if (!report) return res.status(404).json({ error: 'Report not found' });

        const io = req.app.get('io');
        io.emit('mosquito:update', report);

        res.json(report);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update report' });
    }
});

// ─── POST /api/mosquito/environment ───────────────────────
// Accept environment sensor data from Arduino R4 WiFi
router.post('/environment', async (req, res) => {
    try {
        const {
            nodeId, zone, temperature, humidity, airQuality, gasLevel,
            motion, soundLevel, soundAlert, laserBroken,
            mosquitoRisk, riskLevel, lat, lng
        } = req.body;

        console.log('🦟 Mosquito Environment Data:', req.body);

        const envData = {
            nodeId: nodeId || 'MOSQUITO-NODE-01',
            zone: zone || 'Sector 4A',
            temperature: temperature || 0,
            humidity: humidity || 0,
            airQuality: airQuality || 0,
            gasLevel: gasLevel || 0,
            motion: motion || false,
            soundLevel: soundLevel || 0,
            soundAlert: soundAlert || false,
            laserBroken: laserBroken || false,
            mosquitoRisk: mosquitoRisk || 0,
            riskLevel: riskLevel || 'LOW',
            lat: lat || null,
            lng: lng || null,
            timestamp: new Date().toISOString()
        };

        // Emit live data to frontend via Socket.io
        const io = req.app.get('io');
        io.emit('mosquito:environment', envData);

        // If high risk, trigger an alert
        if (envData.mosquitoRisk > 60) {
            io.emit('sensor:alert', {
                alertType: 'MOSQUITO_RISK',
                zone: envData.zone,
                message: `🦟 High mosquito breeding risk (${envData.mosquitoRisk}/100) at ${envData.zone}: Temp=${envData.temperature}°C, Humidity=${envData.humidity}%`,
                riskScore: envData.mosquitoRisk,
                nodeId: envData.nodeId
            });
        }

        // Also store in the main sensor data collection for cross-referencing
        try {
            const SensorData = require('../models/SensorData');
            await SensorData.create({
                nodeId: envData.nodeId,
                zone: envData.zone,
                gasLevel: envData.airQuality,
                lat: envData.lat,
                lng: envData.lng,
                isHardware: true
            });
        } catch (dbErr) {
            console.error('Sensor save error:', dbErr.message);
        }

        res.status(201).json({ success: true, data: envData });

    } catch (err) {
        console.error('Environment data error:', err);
        res.status(500).json({ error: 'Failed to process environment data' });
    }
});

module.exports = router;
