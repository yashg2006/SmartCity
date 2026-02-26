const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Seed mock leaderboard data if empty
const seed = async () => {
    const count = await User.countDocuments();
    if (count === 0) {
        await User.insertMany([
            { name: 'Arjun Sharma', area: 'Sector 4A', ecoCredits: 1840, reportsCount: 23, avatar: '🧑' },
            { name: 'Priya Nair', area: 'Sector 7B', ecoCredits: 1620, reportsCount: 18, avatar: '👩' },
            { name: 'Rahul Verma', area: 'Sector 2C', ecoCredits: 1420, reportsCount: 15, avatar: '👨' },
            { name: 'Sneha Patel', area: 'Sector 9D', ecoCredits: 1195, reportsCount: 12, avatar: '👩‍💼' },
            { name: 'Kiran Reddy', area: 'Sector 3F', ecoCredits: 980, reportsCount: 9, avatar: '🧑‍💻' },
            { name: 'Meera Iyer', area: 'Sector 1A', ecoCredits: 840, reportsCount: 8, avatar: '👩‍🔬' },
            { name: 'Devesh Kumar', area: 'Sector 6E', ecoCredits: 720, reportsCount: 7, avatar: '🧔' },
            { name: 'Akash Gupta', area: 'Sector 8G', ecoCredits: 610, reportsCount: 5, avatar: '👦' },
        ]);
        console.log('🌱 Seeded leaderboard data');
    }
};

seed();

// GET /api/users/leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        const users = await User.find().sort({ ecoCredits: -1 }).limit(10);
        res.json(users);
    } catch {
        // Return static fallback
        res.json([
            { name: 'Arjun Sharma', area: 'Sector 4A', ecoCredits: 1840, reportsCount: 23, avatar: '🧑', _id: '1' },
            { name: 'Priya Nair', area: 'Sector 7B', ecoCredits: 1620, reportsCount: 18, avatar: '👩', _id: '2' },
            { name: 'Rahul Verma', area: 'Sector 2C', ecoCredits: 1420, reportsCount: 15, avatar: '👨', _id: '3' },
            { name: 'Sneha Patel', area: 'Sector 9D', ecoCredits: 1195, reportsCount: 12, avatar: '👩‍💼', _id: '4' },
            { name: 'Kiran Reddy', area: 'Sector 3F', ecoCredits: 980, reportsCount: 9, avatar: '🧑‍💻', _id: '5' },
        ]);
    }
});

// POST /api/users/:id/credits — award eco-credits
router.post('/:id/credits', async (req, res) => {
    try {
        const { credits, reason } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $inc: { ecoCredits: credits || 50 } },
            { new: true }
        );
        res.json({ success: true, user, reason });
    } catch {
        res.json({ success: false, error: 'User not found' });
    }
});

module.exports = router;
