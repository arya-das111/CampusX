const RefreshToken = require('../models/RefreshToken');
const { getRedisClient } = require('../config/redis');

const safeJsonParse = (text) => {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
};

const getExpirySeconds = (expiresAt) => {
    const ms = new Date(expiresAt).getTime() - Date.now();
    return Math.max(1, Math.floor(ms / 1000));
};

const jtiKey = (jti) => `rt:jti:${jti}`;
const hashKey = (tokenHash) => `rt:hash:${tokenHash}`;
const familyKey = (family) => `rt:family:${family}`;

const redisUp = (client) => client && (client.status === 'ready' || client.status === 'connect');

const logFallback = (scope, err) => {
    console.error(`[refreshTokenStore] ${scope} fallback:`, err.message);
};

const resolveJti = async (redis, tokenHash, jti) => {
    if (jti) return jti;
    if (!tokenHash) return null;
    return redis.get(hashKey(tokenHash));
};

const isValidTokenDoc = (tokenDoc, tokenHash) => {
    if (!tokenDoc) return false;
    if (tokenHash && tokenDoc.tokenHash !== tokenHash) return false;
    if (tokenDoc.revoked) return false;
    if (new Date(tokenDoc.expiresAt).getTime() <= Date.now()) return false;
    return true;
};

const markRevokedDoc = (parsed, revokedAt, options = {}) => {
    parsed.revoked = true;
    parsed.revokedAt = revokedAt;
    if (options.replacedByJti) parsed.replacedByJti = options.replacedByJti;
    return parsed;
};

const writeRevokedRedisDoc = async (redis, tokenJti, parsed) => {
    const ttl = getExpirySeconds(parsed.expiresAt);
    await redis.set(jtiKey(tokenJti), JSON.stringify(parsed), 'EX', ttl);
};

const touchHashTtl = async (redis, tokenHash) => {
    if (!tokenHash) return;
    const existingTtl = await redis.ttl(hashKey(tokenHash));
    if (existingTtl > 0) {
        await redis.expire(hashKey(tokenHash), existingTtl);
    }
};

const revokeFamilyInRedis = async (redis, family, revokedAt) => {
    const members = await redis.smembers(familyKey(family));
    for (const item of members) {
        const raw = await redis.get(jtiKey(item));
        const parsed = raw ? safeJsonParse(raw) : null;
        if (!parsed) continue;
        markRevokedDoc(parsed, revokedAt);
        await writeRevokedRedisDoc(redis, item, parsed);
    }
    return members.length;
};

const createToken = async (doc) => {
    const redis = getRedisClient();
    if (redisUp(redis)) {
        try {
            const ttl = getExpirySeconds(doc.expiresAt);
            await redis.set(jtiKey(doc.jti), JSON.stringify(doc), 'EX', ttl);
            await redis.set(hashKey(doc.tokenHash), doc.jti, 'EX', ttl);
            await redis.sadd(familyKey(doc.family), doc.jti);
            await redis.expire(familyKey(doc.family), ttl);
            return doc;
        } catch (err) {
            logFallback('redis create', err);
        }
    }
    return RefreshToken.create(doc);
};

const findValidToken = async ({ tokenHash, jti }) => {
    const redis = getRedisClient();
    if (redisUp(redis)) {
        try {
            const resolvedJti = await resolveJti(redis, tokenHash, jti);
            if (!resolvedJti) return null;

            const raw = await redis.get(jtiKey(resolvedJti));
            const tokenDoc = raw ? safeJsonParse(raw) : null;
            return isValidTokenDoc(tokenDoc, tokenHash) ? tokenDoc : null;
        } catch (err) {
            logFallback('redis find', err);
        }
    }

    const query = { revoked: false, expiresAt: { $gt: new Date() } };
    if (tokenHash) query.tokenHash = tokenHash;
    if (jti) query.jti = jti;
    return RefreshToken.findOne(query);
};

const revokeToken = async (record, options = {}) => {
    if (!record) return null;
    const revokedAt = new Date();
    const tokenJti = record.jti;
    const tokenHash = record.tokenHash;

    const redis = getRedisClient();
    if (redisUp(redis)) {
        try {
            const raw = await redis.get(jtiKey(tokenJti));
            const parsed = raw ? safeJsonParse(raw) : null;
            if (parsed) {
                markRevokedDoc(parsed, revokedAt, options);
                await writeRevokedRedisDoc(redis, tokenJti, parsed);
            }

            await touchHashTtl(redis, tokenHash);
            return parsed || { ...record, revoked: true, revokedAt };
        } catch (err) {
            logFallback('redis revoke', err);
        }
    }

    return RefreshToken.findOneAndUpdate(
        { jti: tokenJti },
        { $set: { revoked: true, revokedAt, ...(options.replacedByJti ? { replacedByJti: options.replacedByJti } : {}) } },
        { new: true }
    );
};

const revokeFamily = async (family) => {
    const revokedAt = new Date();
    const redis = getRedisClient();

    if (redisUp(redis)) {
        try {
            return await revokeFamilyInRedis(redis, family, revokedAt);
        } catch (err) {
            logFallback('redis revokeFamily', err);
        }
    }

    const result = await RefreshToken.updateMany(
        { family, revoked: false },
        { $set: { revoked: true, revokedAt } }
    );
    return result.modifiedCount;
};

const revokeTokenByHash = async (tokenHash) => {
    const redis = getRedisClient();
    if (redisUp(redis)) {
        try {
            const tokenJti = await redis.get(hashKey(tokenHash));
            if (!tokenJti) return null;
            const raw = await redis.get(jtiKey(tokenJti));
            const parsed = raw ? safeJsonParse(raw) : null;
            if (!parsed) return null;
            return revokeToken(parsed);
        } catch (err) {
            logFallback('redis revokeByHash', err);
        }
    }

    const record = await RefreshToken.findOne({ tokenHash, revoked: false });
    return revokeToken(record);
};

module.exports = {
    createToken,
    findValidToken,
    revokeToken,
    revokeFamily,
    revokeTokenByHash
};
