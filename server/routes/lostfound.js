const express = require('express');
const multer = require('multer');
const path = require('node:path');
const mongoose = require('mongoose');
const LostFound = require('../models/LostFound');
const { protect } = require('../middleware/auth');
const { emitRealtime } = require('../realtime');
const router = express.Router();

const ALLOWED_STATUSES = new Set(['lost', 'found', 'claimed', 'resolved']);
const REPORTABLE_STATUSES = new Set(['lost', 'found']);
const MODERATOR_ROLES = new Set(['admin', 'librarian']);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
    filename: (req, file, cb) => cb(null, `lostfound_${req.user._id}_${Date.now()}_${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`)
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 3 },
    fileFilter: (req, file, cb) => {
        if (/^image\/(jpeg|jpg|png|webp)$/i.test(file.mimetype)) return cb(null, true);
        cb(new Error('Only jpeg, png, or webp images are allowed'));
    }
});

function isModerator(user) {
    return MODERATOR_ROLES.has(user?.role);
}

function isObjectId(value) {
    return mongoose.Types.ObjectId.isValid(value);
}

function toSafeInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return fallback;
    return parsed;
}

function normalizeText(value, maxLen) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, maxLen);
}

function collectImagePaths(req) {
    return Array.isArray(req.files) ? req.files.map((f) => `/uploads/${f.filename}`) : [];
}

function parseExistingImages(images) {
    if (!images) return [];
    if (Array.isArray(images)) {
        return images
            .filter((img) => typeof img === 'string' && img.startsWith('/uploads/'))
            .map((img) => img.trim())
            .slice(0, 3);
    }
    if (typeof images === 'string') {
        try {
            const parsed = JSON.parse(images);
            return parseExistingImages(parsed);
        } catch {
            return [];
        }
    }
    return [];
}

function parseCreatePayload(req) {
    const body = req.body || {};
    const name = normalizeText(body.name, 120);
    const status = normalizeText(body.status, 20).toLowerCase();
    const location = normalizeText(body.location, 160);
    const description = normalizeText(body.description, 500);
    const icon = normalizeText(body.icon, 8) || '📦';
    const images = collectImagePaths(req);

    if (!name) return { error: 'Name is required' };
    if (!REPORTABLE_STATUSES.has(status)) return { error: 'Status must be either lost or found when reporting an item' };

    return {
        value: {
            name,
            status,
            location,
            description,
            icon,
            images,
            reportedBy: req.user._id
        }
    };
}

function parseUpdatePayload(req, currentItem) {
    const body = req.body || {};
    const payload = {};

    if (Object.hasOwn(body, 'name')) {
        const name = normalizeText(body.name, 120);
        if (!name) return { error: 'Name cannot be empty' };
        payload.name = name;
    }
    if (Object.hasOwn(body, 'location')) {
        payload.location = normalizeText(body.location, 160);
    }
    if (Object.hasOwn(body, 'description')) {
        payload.description = normalizeText(body.description, 500);
    }
    if (Object.hasOwn(body, 'icon')) {
        payload.icon = normalizeText(body.icon, 8) || currentItem.icon;
    }
    if (Object.hasOwn(body, 'status')) {
        const nextStatus = normalizeText(body.status, 20).toLowerCase();
        if (!ALLOWED_STATUSES.has(nextStatus)) return { error: 'Invalid status value' };
        payload.status = nextStatus;
    }

    const imagesProvided = Object.hasOwn(body, 'images');
    const keepImages = parseExistingImages(body.images);
    const newImages = collectImagePaths(req);
    if (imagesProvided || newImages.length) {
        payload.images = [...keepImages, ...newImages].slice(0, 3);
    }

    return { value: payload };
}

function applyStatusSideEffects(item, nextStatus, user) {
    item.status = nextStatus;
    if (nextStatus === 'claimed') {
        item.claimedBy = user._id;
        item.claimedAt = new Date();
    }
    if (nextStatus === 'resolved') {
        item.resolvedAt = new Date();
        if (!item.claimedBy) item.claimedBy = user._id;
        if (!item.claimedAt) item.claimedAt = new Date();
    }
    if (isModerator(user)) {
        item.moderatedBy = user._id;
        item.moderatedAt = new Date();
    }
}

function canTransitionStatus(item, nextStatus, user) {
    if (!ALLOWED_STATUSES.has(nextStatus)) return false;
    if (nextStatus === item.status) return true;
    if (isModerator(user)) return true;
    const owner = String(item.reportedBy) === String(user._id);
    if (!owner) return false;
    return nextStatus === 'claimed' || nextStatus === 'resolved';
}

// GET /api/lostfound
router.get('/', async (req, res) => {
    try {
        const page = Math.max(toSafeInt(req.query.page, 1), 1);
        const limit = Math.min(Math.max(toSafeInt(req.query.limit, 20), 1), 100);
        const skip = (page - 1) * limit;
        const sortBy = normalizeText(req.query.sortBy || 'createdAt', 40);
        const sortOrder = normalizeText(req.query.sortOrder || 'desc', 4) === 'asc' ? 1 : -1;
        const query = {};

        if (req.query.status) {
            const status = normalizeText(req.query.status, 20).toLowerCase();
            if (!ALLOWED_STATUSES.has(status)) {
                return res.status(400).json({ success: false, message: 'Invalid status filter' });
            }
            query.status = status;
        }

        if (req.query.reportedBy) {
            if (!isObjectId(req.query.reportedBy)) {
                return res.status(400).json({ success: false, message: 'Invalid reportedBy value' });
            }
            query.reportedBy = req.query.reportedBy;
        }

        if (req.query.location) {
            query.location = { $regex: normalizeText(req.query.location, 160), $options: 'i' };
        }

        if (req.query.search) {
            const term = normalizeText(req.query.search, 100);
            query.$or = [
                { name: { $regex: term, $options: 'i' } },
                { location: { $regex: term, $options: 'i' } },
                { description: { $regex: term, $options: 'i' } }
            ];
        }

        const allowedSort = new Set(['createdAt', 'updatedAt', 'name', 'status']);
        const sortField = allowedSort.has(sortBy) ? sortBy : 'createdAt';

        const [items, total] = await Promise.all([
            LostFound.find(query)
                .sort({ [sortField]: sortOrder, _id: -1 })
                .skip(skip)
                .limit(limit)
                .populate('reportedBy', 'name role')
                .populate('claimedBy', 'name role'),
            LostFound.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: items,
            count: items.length,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(Math.ceil(total / limit), 1)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/lostfound/:id
router.get('/:id', async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid item id' });
        }

        const item = await LostFound.findById(req.params.id)
            .populate('reportedBy', 'name role email')
            .populate('claimedBy', 'name role email')
            .populate('moderatedBy', 'name role');

        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
        res.json({ success: true, data: item });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/lostfound — any logged-in user can report
router.post('/', protect, upload.array('images', 3), async (req, res) => {
    try {
        const parsed = parseCreatePayload(req);
        if (parsed.error) {
            return res.status(400).json({ success: false, message: parsed.error });
        }

        const item = await LostFound.create(parsed.value);
        const populated = await LostFound.findById(item._id)
            .populate('reportedBy', 'name role')
            .populate('claimedBy', 'name role');

        emitRealtime('lostfound:item:created', {
            item: populated,
            createdBy: req.user._id,
            timestamp: new Date().toISOString()
        });

        res.status(201).json({ success: true, data: populated });
    } catch (err) {
        if (err instanceof multer.MulterError || /Only jpeg, png, or webp images are allowed/.test(err.message)) {
            return res.status(400).json({ success: false, message: err.message });
        }
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/lostfound/:id
router.put('/:id', protect, upload.array('images', 3), async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid item id' });
        }

        const item = await LostFound.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

        const owner = String(item.reportedBy) === String(req.user._id);
        if (!owner && !isModerator(req.user)) {
            return res.status(403).json({ success: false, message: 'Not authorised to update this item' });
        }

        const parsed = parseUpdatePayload(req, item);
        if (parsed.error) {
            return res.status(400).json({ success: false, message: parsed.error });
        }

        if (parsed.value.status && !canTransitionStatus(item, parsed.value.status, req.user)) {
            return res.status(403).json({ success: false, message: 'Status transition not allowed' });
        }

        Object.assign(item, parsed.value);
        if (parsed.value.status) {
            applyStatusSideEffects(item, parsed.value.status, req.user);
        }
        if (isModerator(req.user)) {
            item.moderatedBy = req.user._id;
            item.moderatedAt = new Date();
        }

        await item.save();
        const populated = await LostFound.findById(item._id)
            .populate('reportedBy', 'name role')
            .populate('claimedBy', 'name role')
            .populate('moderatedBy', 'name role');

        emitRealtime('lostfound:item:updated', {
            item: populated,
            updatedBy: req.user._id,
            timestamp: new Date().toISOString()
        });

        res.json({ success: true, data: populated });
    } catch (err) {
        if (err instanceof multer.MulterError || /Only jpeg, png, or webp images are allowed/.test(err.message)) {
            return res.status(400).json({ success: false, message: err.message });
        }
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/lostfound/:id/status
router.patch('/:id/status', protect, async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid item id' });
        }

        const nextStatus = normalizeText(req.body?.status, 20).toLowerCase();
        if (!ALLOWED_STATUSES.has(nextStatus)) {
            return res.status(400).json({ success: false, message: 'Invalid status value' });
        }

        const item = await LostFound.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
        if (!canTransitionStatus(item, nextStatus, req.user)) {
            return res.status(403).json({ success: false, message: 'Status transition not allowed' });
        }

        applyStatusSideEffects(item, nextStatus, req.user);
        await item.save();

        const populated = await LostFound.findById(item._id)
            .populate('reportedBy', 'name role')
            .populate('claimedBy', 'name role')
            .populate('moderatedBy', 'name role');

        emitRealtime('lostfound:item:status_changed', {
            itemId: String(item._id),
            status: populated.status,
            changedBy: req.user._id,
            item: populated,
            timestamp: new Date().toISOString()
        });

        res.json({ success: true, data: populated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/lostfound/:id
router.delete('/:id', protect, async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid item id' });
        }

        const item = await LostFound.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

        const owner = String(item.reportedBy) === String(req.user._id);
        if (!owner && !isModerator(req.user)) {
            return res.status(403).json({ success: false, message: 'Not authorised to remove this item' });
        }

        await item.deleteOne();

        emitRealtime('lostfound:item:deleted', {
            itemId: req.params.id,
            deletedBy: req.user._id,
            timestamp: new Date().toISOString()
        });

        res.json({ success: true, message: 'Item removed' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || /Only jpeg, png, or webp images are allowed/.test(err.message)) {
        return res.status(400).json({ success: false, message: err.message });
    }
    return next(err);
});

module.exports = router;
