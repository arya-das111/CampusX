const Redis = require('ioredis');

let redisClient;

const getRedisClient = () => {
    if (!process.env.REDIS_URL) {
        return null;
    }
    if (redisClient) {
        return redisClient;
    }

    redisClient = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableReadyCheck: true
    });

    redisClient.on('error', (err) => {
        console.error('[redis] error:', err.message);
    });

    redisClient.connect().catch((err) => {
        console.error('[redis] connect failed, falling back to MongoDB:', err.message);
    });

    return redisClient;
};

module.exports = { getRedisClient };
