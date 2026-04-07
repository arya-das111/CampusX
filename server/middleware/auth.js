const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ success: false, message: 'Not authorised — no token' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Token invalid or expired' });
    }
};

// Role guard — usage: authorise('admin', 'librarian')
const authorise = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ success: false, message: `Role "${req.user.role}" is not authorised` });
    }
    next();
};

module.exports = { protect, authorise };
