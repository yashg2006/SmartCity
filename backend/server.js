const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const sensorRoutes = require('./routes/sensors');
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const mosquitoRoutes = require('./routes/mosquito');

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ─── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
app.use('/api/mosquito', mosquitoRoutes);


// ─── Health Check ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// ─── Start Server ─────────────────────────────────────────
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 UrbanPulse Core: System Online (Port ${PORT} - Accessible on Network)`);
    console.log(`📡 Hardware Intake: ACTIVE (Expecting real ESP32 pulses)`);
});
