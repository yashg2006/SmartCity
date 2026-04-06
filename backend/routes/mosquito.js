const express = require('express');
const router = express.Router();
const MosquitoReport = require('../models/MosquitoReport');
const SensorData = require('../models/SensorData');

// ─── Real ML Inference (Python ML Server) ──────────────────
// Calls the FastAPI server running the YOLOv8 model
async function runMosquitoML(imageBase64) {
    try {
        const mlServerUrl = process.env.ML_SERVER_URL || 'http://localhost:8000/predict';
        
        const response = await fetch(mlServerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageData: imageBase64 })
        });

        if (!response.ok) {
            throw new Error(`ML Server responded with ${response.status}`);
        }

        const data = await response.json();
        
        return { 
            result: data.mlResult || 'NOT_DETECTED', 
            confidence: data.confidence || 0 
        };
    } catch (err) {
        console.error('ML Server error, falling back to simulation:', err.message);
        // Fallback to a safe "not detected" if the server is down
        return { result: 'NOT_DETECTED', confidence: 0.5 };
    }
}

// ─── Risk Score Calculator ────────────────────────────────
async function calculateRiskScore(mlResult, mlConfidence, zone) {
    // Factor 1: ML detection score (35% weight)
    let mlScore = 0;
    if (mlResult === 'DETECTED') {
        mlScore = mlConfidence * 35;
    } else if (mlResult === 'POTENTIAL_RISK') {
        mlScore = mlConfidence * 15;
    } else {
        mlScore = (1 - mlConfidence) * 5; 
    }

    // Factor 2: Water stagnation from sensors (20% weight)
    let waterScore = 0;
    let waterStagnation = false;
    let gasLevel = 0;
    
    // Factor 3: Hardware Swarm Sensors (35% weight)
    // PIR Motion + Sound Buzzing + DHT11 Humidity/Temp
    let swarmScore = 0;
    let hardwareStats = {
        temp: 0,
        humidity: 0,
        sound: 0,
        motion: false
    };

    try {
        const latestSensor = await SensorData.findOne({ zone })
            .sort({ timestamp: -1 })
            .limit(1);

        if (latestSensor) {
            // Water logic
            if (latestSensor.waterStatus === 'OVERFLOW' ||
                (latestSensor.drainDistance != null && latestSensor.drainDistance < 5)) {
                waterScore = 20;
                waterStagnation = true;
            } else if (latestSensor.waterStatus === 'DRY') {
                waterScore = 10;
            }
            gasLevel = latestSensor.gasLevel || 0;

            // Swarm Logic (35% total)
            hardwareStats.temp = latestSensor.temperature || 0;
            hardwareStats.humidity = latestSensor.humidity || 0;
            hardwareStats.sound = latestSensor.soundLevel || 0;
            hardwareStats.motion = latestSensor.motion || false;

            // Humidity (ideal > 70%)
            if (hardwareStats.humidity > 70) swarmScore += 10;
            else if (hardwareStats.humidity > 50) swarmScore += 5;

            // Temperature (ideal 25-35)
            if (hardwareStats.temp >= 25 && hardwareStats.temp <= 35) swarmScore += 5;

            // Sound (buzzing detection - dynamic threshold)
            if (hardwareStats.sound > 50) swarmScore += 10;

            // Motion (active swarm moving)
            if (hardwareStats.motion) swarmScore += 10;
        }
    } catch (err) {
        console.error('Sensor data fetch error:', err.message);
    }

    // Factor 4: Gas/environment levels (5% weight)
    const gasScore = Math.min(5, (gasLevel / 4095) * 5);

    // Factor 5: Historical reports in this zone (5% weight)
    let historyScore = 0;
    try {
        const recentCount = await MosquitoReport.countDocuments({
            zone,
            mlResult: { $in: ['DETECTED', 'POTENTIAL_RISK'] },
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        });
        historyScore = Math.min(5, (recentCount / 5) * 5);
    } catch (err) {
        console.error('History fetch error:', err.message);
    }

    const riskScore = Math.round(Math.min(100, mlScore + waterScore + swarmScore + gasScore + historyScore));

    return {
        riskScore,
        riskFactors: {
            mlScore: Math.round(mlScore * 10) / 10,
            waterScore: Math.round(waterScore * 10) / 10,
            swarmScore: Math.round(swarmScore * 10) / 10,
            gasScore: Math.round(gasScore * 10) / 10,
            historyScore: Math.round(historyScore * 10) / 10
        },
        waterStagnation,
        gasLevel,
        hardwareStats
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

        // Step 1: Run real ML inference
        const { result: mlResult, confidence } = await runMosquitoML(imageData);

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

// ─── GET /api/mosquito/latest-report ──────────────────────
// Returns the most recent analysis result for a zone (polled by ESP32 LCD)
router.get('/latest-report', async (req, res) => {
    try {
        const zone = req.query.zone || 'Sector 4A';
        const report = await MosquitoReport.findOne({ zone })
            .sort({ createdAt: -1 })
            .select('mlResult confidence riskScore createdAt');

        if (!report) {
            return res.status(404).json({ error: 'No reports found for this zone' });
        }

        res.json({
            success: true,
            mlResult: report.mlResult,
            confidence: report.confidence,
            riskScore: report.riskScore,
            timestamp: report.createdAt
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch latest report' });
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
