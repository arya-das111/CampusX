const mongoose = require('mongoose');

const lostFoundSchema = new mongoose.Schema({
    name: { type: String, required: true },
    status: { type: String, enum: ['lost', 'found'], required: true },
    location: { type: String, default: '' },
    icon: { type: String, default: '📦' },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('LostFound', lostFoundSchema);
