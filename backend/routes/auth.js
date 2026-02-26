const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Inline auth user model (separate from citizen/leaderboard User)
const AuthUserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['citizen', 'municipal', 'admin'], default: 'citizen' },
    area: { type: String, default: 'General' },
    createdAt: { type: Date, default: Date.now }
});

const AuthUser = mongoose.models.AuthUser || mongoose.model('AuthUser', AuthUserSchema);

const JWT_SECRET = process.env.JWT_SECRET || 'urbanpulse_secret_key_change_in_prod';

// Seed default admin if none exist
const seed = async () => {
    try {
        const count = await AuthUser.countDocuments();
        if (count === 0) {
            const hashed = await bcrypt.hash('admin123', 10);
            await AuthUser.insertMany([
                { name: 'Admin User', email: 'admin@urbanpulse.gov', password: hashed, role: 'admin', area: 'HQ' },
                { name: 'Municipal Officer', email: 'officer@urbanpulse.gov', password: hashed, role: 'municipal', area: 'Sector 4A' },
                { name: 'Arjun Sharma', email: 'arjun@citizen.urbanpulse', password: hashed, role: 'citizen', area: 'Sector 4A' },
            ]);
            console.log('🌱 Seeded default auth users (password: admin123)');
        }
    } catch (e) { /* MongoDB may not be connected */ }
};
seed();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: 'Email and password are required' });

        const user = await AuthUser.findOne({ email: email.toLowerCase() });
        if (!user)
            return res.status(401).json({ error: 'Invalid credentials' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid)
            return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role, name: user.name },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role, area: user.area }
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, area, role } = req.body;
        if (!name || !email || !password)
            return res.status(400).json({ error: 'Name, email and password are required' });

        const existing = await AuthUser.findOne({ email: email.toLowerCase() });
        if (existing)
            return res.status(409).json({ error: 'Email already registered' });

        const hashed = await bcrypt.hash(password, 10);
        // Only allow citizen self-registration; municipal/admin set by admins
        const safeRole = role === 'municipal' || role === 'admin' ? 'citizen' : (role || 'citizen');
        const user = await AuthUser.create({ name, email, password: hashed, area: area || 'General', role: safeRole });

        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role, name: user.name },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.status(201).json({
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role, area: user.area }
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/auth/me — verify token & get current user
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer '))
            return res.status(401).json({ error: 'No token provided' });

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await AuthUser.findById(decoded.id).select('-password');
        if (!user) return res.status(401).json({ error: 'User not found' });

        res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, area: user.area } });
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});

module.exports = router;
