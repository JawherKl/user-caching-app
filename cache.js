const redis = require('redis');
const redisClient = redis.createClient({
    host: '172.28.0.2',
    port: 6379
});


// Properly connect Redis client
redisClient.connect().catch(console.error);

// Connect Redis client
redisClient.on('connect', () => {
    console.log('Connected to Redis');
});

// Error handling for Redis
redisClient.on('error', (err) => {
    console.error('Redis error:', err);
});

// Fetch data from cache
async function getFromCache(key) {
    try {
        const cachedData = await redisClient.get(key);
        return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
        console.error('Error fetching from Redis cache:', error);
        throw error;
    }
}

// Set data to cache with expiration
async function setToCache(key, data, ttl = 3600) {
    try {
        await redisClient.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
        console.error('Error setting to Redis cache:', error);
        throw error;
    }
}

// Invalidate cache by keys
async function invalidateCache(pattern) {
    try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(keys);
            console.log('Cache invalidated for keys:', keys);
        }
    } catch (error) {
        console.error('Error invalidating Redis cache:', error);
        throw error;
    }
}

module.exports = {
    getFromCache,
    setToCache,
    invalidateCache
};
