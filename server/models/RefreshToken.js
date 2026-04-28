const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    jti: { type: String, required: true, unique: true, index: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    revoked: { type: Boolean, default: false, index: true },
    revokedAt: { type: Date },
    replacedByJti: { type: String, default: '' },
    createdByIp: { type: String, default: '' }
}, { timestamps: true });

// TTL index removes documents once expired.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
