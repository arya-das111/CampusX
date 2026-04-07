const express = require('express');
const multer = require('multer');
const path = require('path');
const Resume = require('../models/Resume');
const { protect } = require('../middleware/auth');
const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
    filename: (req, file, cb) => cb(null, `${req.user._id}_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/resume/upload
router.post('/upload', protect, upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
        const resume = await Resume.create({
            user: req.user._id,
            fileName: req.file.originalname,
            filePath: req.file.path,
        });
        res.status(201).json({ success: true, data: resume });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/resume/:id/analysis — save ATS analysis results
router.put('/:id/analysis', protect, async (req, res) => {
    try {
        const { atsScore, analysisData } = req.body;
        const resume = await Resume.findByIdAndUpdate(req.params.id, { atsScore, analysisData }, { new: true });
        res.json({ success: true, data: resume });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/resume/me — student's resumes
router.get('/me', protect, async (req, res) => {
    try {
        const resumes = await Resume.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json({ success: true, data: resumes });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
