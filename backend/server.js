const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const sensorRoutes = require('./routes/sensors');
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ─── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Database ────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smartcity';

mongoose
    .connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => {
        console.warn('⚠️  MongoDB not connected, using mock data mode:', err.message);
    });

// ─── Socket.io ───────────────────────────────────────────
io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
    });
});

// Make io available in routes
app.set('io', io);

// ─── Routes ──────────────────────────────────────────────
app.use('/api/sensors', sensorRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);


// ─── Health Check ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// ─── Mock Sensor Push (simulates ESP32 data in dev) ────────
let mockInterval;

function startMockSensorEmitter() {
    const nodes = [
        // NODE-001 (Sector 4A) is removed to show REAL hardware data exclusively
        { id: 'NODE-002', zone: 'Sector 7B', lat: 12.9785, lng: 77.6408 },
        { id: 'NODE-003', zone: 'Sector 2C', lat: 12.9352, lng: 77.6146 },
        { id: 'NODE-004', zone: 'Sector 9D', lat: 13.0012, lng: 77.5953 },
        { id: 'NODE-005', zone: 'Sector 3F', lat: 12.9565, lng: 77.7011 },
    ];

    mockInterval = setInterval(() => {
        const node = nodes[Math.floor(Math.random() * nodes.length)];
        const payload = {
            nodeId: node.id,
            zone: node.zone,
            lat: node.lat,
            lng: node.lng,
            distance: parseFloat((Math.random() * 90 + 10).toFixed(1)),  // cm — bin fill level
            gasLevel: parseFloat((Math.random() * 2800 + 200).toFixed(0)), // ppm
            waterStatus: Math.random() > 0.8 ? 'OVERFLOW' : 'NORMAL',
            batteryLevel: parseFloat((Math.random() * 40 + 60).toFixed(1)),
            timestamp: new Date().toISOString()
        };
        io.emit('sensor:update', payload);
    }, 3000);
}

startMockSensorEmitter();

// ─── Start Server ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`🚀 UrbanPulse API running on http://localhost:${PORT}`);
    console.log(`📡 Mock sensor emitter active (every 3s)`);
});
