const mongoose = require('mongoose');

const lostFoundSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 120 },
    status: {
        type: String,
        enum: ['lost', 'found', 'claimed', 'resolved'],
        required: true,
        default: 'lost'
    },
    location: { type: String, default: '', trim: true, maxlength: 160 },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    icon: { type: String, default: '📦', trim: true, maxlength: 8 },
    images: [{ type: String }],
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    claimedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    moderatedAt: { type: Date, default: null },
}, { timestamps: true });

lostFoundSchema.index({ status: 1, createdAt: -1 });
lostFoundSchema.index({ reportedBy: 1, createdAt: -1 });
lostFoundSchema.index({ name: 'text', location: 'text', description: 'text' });

module.exports = mongoose.model('LostFound', lostFoundSchema);
