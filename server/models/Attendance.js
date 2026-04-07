const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    subjectCode: { type: String, default: '' },
    date: { type: Date, required: true },
    status: { type: String, enum: ['present', 'absent'], required: true },
    time: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
