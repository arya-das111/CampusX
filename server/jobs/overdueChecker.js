const cron = require('node-cron');
const Borrow = require('../models/Borrow');

// Run every day at 8:00 AM — flag overdue books
cron.schedule('0 8 * * *', async () => {
    try {
        const now = new Date();
        const result = await Borrow.updateMany(
            { status: 'active', dueDate: { $lt: now } },
            { $set: { status: 'overdue' } }
        );
        if (result.modifiedCount > 0) {
            console.log(`⏰ Overdue checker: ${result.modifiedCount} borrows marked overdue`);
        }
    } catch (err) {
        console.error('Overdue checker error:', err.message);
    }
});

console.log('📅 Cron: Overdue book checker scheduled (daily 8 AM)');
