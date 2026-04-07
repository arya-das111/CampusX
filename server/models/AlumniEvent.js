const mongoose = require('mongoose');

const alumniEventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    date: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('AlumniEvent', alumniEventSchema);
