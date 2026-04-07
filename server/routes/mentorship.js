const express = require('express');
const MentorRequest = require('../models/MentorRequest');
const User = require('../models/User');
const { protect, authorise } = require('../middleware/auth');
const router = express.Router();

// GET /api/mentorship/mentors — list alumni/mentor users
router.get('/mentors', async (req, res) => {
    try {
        const { area } = req.query;
        const query = { role: 'alumni' };
        const mentors = await User.find(query).select('name email skills department avatar');
        res.json({ success: true, data: mentors });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/mentorship/request — student requests mentorship
router.post('/request', protect, async (req, res) => {
    try {
        const { mentorId, message, area } = req.body;
        const existing = await MentorRequest.findOne({ student: req.user._id, mentor: mentorId, status: 'pending' });
        if (existing) return res.status(400).json({ success: false, message: 'Request already pending' });

        const mr = await MentorRequest.create({ student: req.user._id, mentor: mentorId, message, area });
        res.status(201).json({ success: true, data: mr });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/mentorship/my-requests — student's sent requests
router.get('/my-requests', protect, async (req, res) => {
    try {
        const reqs = await MentorRequest.find({ student: req.user._id }).populate('mentor', 'name email skills');
        res.json({ success: true, data: reqs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/mentorship/incoming — mentor's received requests
router.get('/incoming', protect, authorise('alumni'), async (req, res) => {
    try {
        const reqs = await MentorRequest.find({ mentor: req.user._id }).populate('student', 'name email department year');
        res.json({ success: true, data: reqs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/mentorship/:id/respond — accept/reject
router.put('/:id/respond', protect, authorise('alumni'), async (req, res) => {
    try {
        const { status } = req.body;
        if (!['accepted', 'rejected'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
        const mr = await MentorRequest.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json({ success: true, data: mr });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
