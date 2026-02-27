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

// ─── Virtual Node Network (Baseline data for scalability demo) ──
let virtualNetworkInterval;
let isVirtualNetworkEnabled = true;

function startVirtualNodeEmitter() {
    if (virtualNetworkInterval) clearInterval(virtualNetworkInterval);
    if (!isVirtualNetworkEnabled) return;

    const nodes = [
        { id: 'NODE-002', zone: 'Sector 7B', lat: 12.9785, lng: 77.6408 },
        { id: 'NODE-003', zone: 'Sector 2C', lat: 12.9352, lng: 77.6146 },
        { id: 'NODE-004', zone: 'Sector 9D', lat: 13.0012, lng: 77.5953 },
        { id: 'NODE-005', zone: 'Sector 3F', lat: 12.9565, lng: 77.7011 },
    ];

    virtualNetworkInterval = setInterval(() => {
        const node = nodes[Math.floor(Math.random() * nodes.length)];
        const payload = {
            nodeId: node.id,
            zone: node.zone,
            lat: node.lat,
            lng: node.lng,
            distance: parseFloat((Math.random() * 90 + 10).toFixed(1)),
            gasLevel: parseFloat((Math.random() * 2800 + 200).toFixed(0)),
            waterStatus: Math.random() > 0.8 ? 'OVERFLOW' : 'NORMAL',
            batteryLevel: parseFloat((Math.random() * 40 + 60).toFixed(1)),
            timestamp: new Date().toISOString(),
            isVirtual: true
        };
        io.emit('sensor:update', payload);
    }, 4000);
}

// System Control Routes
app.post('/api/systems/toggle-virtual', (req, res) => {
    isVirtualNetworkEnabled = !isVirtualNetworkEnabled;
    startVirtualNodeEmitter();
    console.log(`🔌 Virtual Network: ${isVirtualNetworkEnabled ? 'ENABLED' : 'DISABLED'}`);
    res.json({ enabled: isVirtualNetworkEnabled });
});

app.get('/api/systems/status', (req, res) => {
    res.json({ virtualNetwork: isVirtualNetworkEnabled });
});

startVirtualNodeEmitter();

// ─── Start Server ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`🚀 UrbanPulse Core: System Online (Port ${PORT})`);
    console.log(`📡 Virtual Node Network: INITIALIZED`);
});
