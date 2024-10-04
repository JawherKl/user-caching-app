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

// Rate limiting middleware
const rateLimit = (limit, windowInSeconds) => {
    return async (req, res, next) => {
        const clientIP = req.headers['x-forwarded-for'] 
        ? req.headers['x-forwarded-for'].split(',')[0]  // First IP in X-Forwarded-For is the real client IP
        : req.connection.remoteAddress;
        const key = `rate-limit:${clientIP}`;

        try {
            const requestCount = await redisClient.incr(key);

            if (requestCount === 1) {
                // Set expiration only on first request
                await redisClient.expire(key, windowInSeconds);
                console.log(`Key ${key} set with ${windowInSeconds} seconds expiration.`);
            }

            // Log current request count and TTL for debugging
            const ttl = await redisClient.ttl(key);
            console.log(`Key ${key} has ${requestCount} requests. TTL: ${ttl}`);

            if (requestCount > limit) {
                return res.status(429).json({
                    message: 'Rate limit exceeded. Try again later.',
                });
            }

            next(); // Allow the request to continue if under the limit
        } catch (error) {
            console.error('Error in rate limiting:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    };
};

module.exports = rateLimit;
