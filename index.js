const express = require('express');
const { Pool } = require('pg');
const redis = require('redis');

// Create an Express app
const app = express();
app.use(express.json());

// PostgreSQL setup
const pgPool = new Pool({
    user: 'test2',
    host: '172.20.0.18',
    database: 'userdb',
    password: 'test',
    port: 5432,
  });

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

// API to fetch user profile
app.get('/user/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        // Ensure Redis client is connected
        if (!redisClient.isOpen) {
            await redisClient.connect();
        }

        // Check if user data is cached in Redis
        const cachedUser = await redisClient.get(`user:${userId}`);

        if (cachedUser) {
            console.log('Cache hit');
            return res.json(JSON.parse(cachedUser)); // Return cached data
        }

        console.log('Cache miss');
        const result = await pgPool.query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = result.rows[0];

        if (user) {
            // Cache the user data in Redis for 1 hour (3600 seconds)
            await redisClient.setEx(`user:${userId}`, 3600, JSON.stringify(user));
            res.json(user);
        } else {
            res.status(404).send('User not found');
        }
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Paginated user list
app.get('/users', async (req, res) => {
    const { page = 1, limit = 10 } = req.query;  // Default values: page 1, limit 10
    const offset = (page - 1) * limit;

    try {
        // Check Redis cache
        const cacheKey = `users:page:${page}:limit:${limit}`;
        const cachedUsers = await redisClient.get(cacheKey);

        if (cachedUsers) {
            console.log('Cache hit');
            return res.json(JSON.parse(cachedUsers));
        }

        // Query PostgreSQL for paginated users
        const { rows: users } = await pgPool.query(
            'SELECT * FROM users ORDER BY id LIMIT $1 OFFSET $2',
            [limit, offset]
        );

        // Store in Redis with a TTL of 1 hour
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(users));

        console.log('Cache miss, fetching from PostgreSQL');
        return res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching users');
    }
});

// Invalidate user list cache on updates
app.put('/user/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email } = req.body;

    try {
        // Update user in PostgreSQL
        await pgPool.query(
            'UPDATE users SET name = $1, email = $2 WHERE id = $3',
            [name, email, id]
        );

        // Invalidate cache for all pages
        const keys = await redisClient.keys('users:page:*');
        if (keys.length > 0) {
            await redisClient.del(keys);
            console.log('User list cache invalidated');
        }

        res.json({ id, name, email });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating user');
    }
});

// Start the server
const port = 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
