const express = require('express');
const AlumniEvent = require('../models/AlumniEvent');
const { protect, authorise } = require('../middleware/auth');
const router = express.Router();

// GET /api/alumni/events
router.get('/events', async (req, res) => {
    try {
        const events = await AlumniEvent.find().sort({ date: -1 }).populate('createdBy', 'name');
        res.json({ success: true, data: events });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/alumni/events (alumni only)
router.post('/events', protect, authorise('alumni'), async (req, res) => {
    try {
        const event = await AlumniEvent.create({ ...req.body, createdBy: req.user._id });
        res.status(201).json({ success: true, data: event });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/alumni/events/:id
router.delete('/events/:id', protect, authorise('alumni', 'admin'), async (req, res) => {
    try {
        await AlumniEvent.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Event deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
