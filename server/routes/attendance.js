const express = require('express');
const Attendance = require('../models/Attendance');
const { protect, authorise } = require('../middleware/auth');
const router = express.Router();

// POST /api/attendance/mark — mark attendance (admin/librarian)
router.post('/mark', protect, authorise('admin', 'librarian'), async (req, res) => {
    try {
        const { studentId, subject, subjectCode, date, status, time } = req.body;
        const rec = await Attendance.create({ student: studentId, subject, subjectCode, date, status, time });
        res.status(201).json({ success: true, data: rec });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/attendance/mark-bulk — mark attendance for multiple students
router.post('/mark-bulk', protect, authorise('admin', 'librarian'), async (req, res) => {
    try {
        const { records } = req.body; // [{studentId, subject, subjectCode, date, status, time}]
        const docs = records.map(r => ({ student: r.studentId, subject: r.subject, subjectCode: r.subjectCode, date: r.date, status: r.status, time: r.time }));
        const result = await Attendance.insertMany(docs);
        res.status(201).json({ success: true, data: result, count: result.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/attendance/me — student's own attendance
router.get('/me', protect, async (req, res) => {
    try {
        const records = await Attendance.find({ student: req.user._id }).sort({ date: -1 });
        res.json({ success: true, data: records });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/attendance/summary/me — student's percentage summary per subject
router.get('/summary/me', protect, async (req, res) => {
    try {
        const agg = await Attendance.aggregate([
            { $match: { student: req.user._id } },
            {
                $group: {
                    _id: '$subject',
                    total: { $sum: 1 },
                    present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } }
                }
            },
            {
                $project: {
                    subject: '$_id', total: 1, present: 1,
                    percentage: { $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 1] }
                }
            }
        ]);
        const overall = agg.reduce((a, b) => ({ t: a.t + b.total, p: a.p + b.present }), { t: 0, p: 0 });
        const overallPct = overall.t > 0 ? Math.round((overall.p / overall.t) * 100 * 10) / 10 : 0;
        res.json({ success: true, data: { subjects: agg, overall: overallPct } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/attendance/student/:id — admin view of a student's attendance
router.get('/student/:id', protect, authorise('admin'), async (req, res) => {
    try {
        const records = await Attendance.find({ student: req.params.id }).sort({ date: -1 });
        res.json({ success: true, data: records });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
