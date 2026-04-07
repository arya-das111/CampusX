const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const router = express.Router();

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, department, year } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Name, email and password are required' });
        }
        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

        const user = await User.create({ name, email, password, role: role || 'student', department, year });
        const token = signToken(user._id);
        res.status(201).json({ success: true, data: { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const isMatch = await user.matchPassword(password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const token = signToken(user._id);
        res.json({ success: true, data: { token, user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, department: user.department } } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
    res.json({ success: true, data: req.user });
});

// PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
    try {
        const updates = req.body;
        delete updates.password; // don't allow password change here
        delete updates.role;
        const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
        res.json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
