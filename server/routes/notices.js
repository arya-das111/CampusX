const express = require('express');
const Notice = require('../models/Notice');
const { protect, authorise } = require('../middleware/auth');
const router = express.Router();

// GET /api/notices
router.get('/', async (req, res) => {
    try {
        const { category } = req.query;
        const query = category ? { category } : {};
        const notices = await Notice.find(query).sort({ createdAt: -1 }).populate('createdBy', 'name');
        res.json({ success: true, data: notices });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/notices (admin)
router.post('/', protect, authorise('admin'), async (req, res) => {
    try {
        const notice = await Notice.create({ ...req.body, createdBy: req.user._id });
        res.status(201).json({ success: true, data: notice });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/notices/:id (admin)
router.put('/:id', protect, authorise('admin'), async (req, res) => {
    try {
        const notice = await Notice.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!notice) return res.status(404).json({ success: false, message: 'Notice not found' });
        res.json({ success: true, data: notice });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/notices/:id (admin)
router.delete('/:id', protect, authorise('admin'), async (req, res) => {
    try {
        await Notice.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Notice deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
