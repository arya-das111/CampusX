const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: { type: String, required: true },
    isbn: { type: String, unique: true },
    category: { type: String, default: 'general' },
    tags: [String],
    copies: { type: Number, default: 1 },
    available: { type: Number, default: 1 },
    location: { type: String, default: '' },
    cover: { type: String, default: '📘' },
    description: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Book', bookSchema);
