const express = require('express');
const LostFound = require('../models/LostFound');
const { protect } = require('../middleware/auth');
const router = express.Router();

// GET /api/lostfound
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { status } : {};
        const items = await LostFound.find(query).sort({ createdAt: -1 }).populate('reportedBy', 'name');
        res.json({ success: true, data: items });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/lostfound — any logged-in user can report
router.post('/', protect, async (req, res) => {
    try {
        const item = await LostFound.create({ ...req.body, reportedBy: req.user._id });
        res.status(201).json({ success: true, data: item });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/lostfound/:id
router.delete('/:id', protect, async (req, res) => {
    try {
        await LostFound.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Item removed' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
