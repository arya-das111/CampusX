const cron = require('node-cron');
const Attendance = require('../models/Attendance');

// Run every Monday at 6:00 AM — log attendance summary
cron.schedule('0 6 * * 1', async () => {
    try {
        const summary = await Attendance.aggregate([
            {
                $group: {
                    _id: '$student',
                    total: { $sum: 1 },
                    present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } }
                }
            },
            {
                $project: {
                    studentId: '$_id',
                    total: 1, present: 1,
                    percentage: { $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 1] }
                }
            }
        ]);
        console.log(`📊 Weekly attendance summary: ${summary.length} students processed`);
        // In production, you'd store this or send email notifications for students below 75%
        const lowAttendance = summary.filter(s => s.percentage < 75);
        if (lowAttendance.length > 0) {
            console.log(`⚠️  ${lowAttendance.length} students below 75% attendance threshold`);
        }
    } catch (err) {
        console.error('Attendance summary error:', err.message);
    }
});

console.log('📅 Cron: Weekly attendance summary scheduled (Monday 6 AM)');
