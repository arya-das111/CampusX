const express = require('express');
const Book = require('../models/Book');
const Borrow = require('../models/Borrow');
const { emitRealtime } = require('../realtime');
const { protect, authorise } = require('../middleware/auth');
const router = express.Router();

// GET /api/books — list all, with optional search/filter
router.get('/', async (req, res) => {
    try {
        const { search, category, availability } = req.query;
        let query = {};
        if (search) {
            const re = new RegExp(search, 'i');
            query.$or = [{ title: re }, { author: re }, { isbn: re }, { tags: re }];
        }
        if (category) query.category = category;
        if (availability === 'available') query.available = { $gt: 0 };
        if (availability === 'limited') query.available = { $gt: 0, $lte: 2 };

        const books = await Book.find(query).sort({ title: 1 });
        res.json({ success: true, data: books, count: books.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/books/borrowed/me — my active borrows
router.get('/borrowed/me', protect, async (req, res) => {
    try {
        const borrows = await Borrow.find({ user: req.user._id, status: { $in: ['active', 'overdue'] } })
            .populate('book').sort({ dueDate: 1 });
        res.json({ success: true, data: borrows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/books/borrowed/active — all active borrows (librarian/admin)
router.get('/borrowed/active', protect, authorise('librarian', 'admin'), async (req, res) => {
    try {
        const borrows = await Borrow.find({ status: { $in: ['active', 'overdue'] } })
            .populate({ path: 'book', select: 'title author isbn category copies available location cover' })
            .populate({ path: 'user', select: 'name email department year role avatar' })
            .sort({ dueDate: 1, createdAt: -1 });

        res.json({ success: true, data: borrows, count: borrows.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/books/:id
router.get('/:id', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
        res.json({ success: true, data: book });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/books — create (librarian/admin)
router.post('/', protect, authorise('librarian', 'admin'), async (req, res) => {
    try {
        const book = await Book.create(req.body);
        emitRealtime('library:book:created', {
            book,
            createdBy: req.user?._id,
            timestamp: new Date().toISOString()
        });
        res.status(201).json({ success: true, data: book });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/books/:id — update (librarian/admin)
router.put('/:id', protect, authorise('librarian', 'admin'), async (req, res) => {
    try {
        const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
        emitRealtime('library:book:updated', {
            book,
            updatedBy: req.user?._id,
            timestamp: new Date().toISOString()
        });
        res.json({ success: true, data: book });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/books/:id (admin only)
router.delete('/:id', protect, authorise('admin'), async (req, res) => {
    try {
        await Book.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Book deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/books/:id/reserve — reserve a copy
router.post('/:id/reserve', protect, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
        if (book.available <= 0) return res.status(400).json({ success: false, message: 'No copies available' });

        // Check if already borrowed and not returned
        const existing = await Borrow.findOne({ user: req.user._id, book: book._id, status: 'active' });
        if (existing) return res.status(400).json({ success: false, message: 'You already have this book' });

        const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
        const borrow = await Borrow.create({ user: req.user._id, book: book._id, dueDate });
        book.available -= 1;
        await book.save();

        emitRealtime('library:book:reserved', {
            bookId: String(book._id),
            available: book.available,
            copies: book.copies,
            reservedBy: req.user?._id,
            borrowId: String(borrow._id),
            timestamp: new Date().toISOString()
        });

        res.status(201).json({ success: true, data: borrow });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/books/:id/return — return a book
router.post('/:id/return', protect, async (req, res) => {
    try {
        const borrow = await Borrow.findOne({ user: req.user._id, book: req.params.id, status: { $in: ['active', 'overdue'] } });
        if (!borrow) return res.status(404).json({ success: false, message: 'No active borrow found' });

        borrow.returnDate = new Date();
        borrow.status = 'returned';
        await borrow.save();

        const updatedBook = await Book.findByIdAndUpdate(req.params.id, { $inc: { available: 1 } }, { new: true });

        emitRealtime('library:book:returned', {
            bookId: String(req.params.id),
            available: updatedBook?.available,
            copies: updatedBook?.copies,
            returnedBy: req.user?._id,
            borrowId: String(borrow._id),
            timestamp: new Date().toISOString()
        });

        res.json({ success: true, data: borrow });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
