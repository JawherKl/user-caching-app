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

// API to update user profile
app.put('/user/:id', async (req, res) => {
    const userId = req.params.id;
    const { name, email } = req.body;

    // Update PostgreSQL
    const result = await pgPool.query(
        'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
        [name, email, userId]
    );

    const updatedUser = result.rows[0];

    if (updatedUser) {
        // Invalidate the cached user data in Redis
        redisClient.del(`user:${userId}`);
        res.json(updatedUser);
    } else {
        res.status(404).send('User not found');
    }
});

// Start the server
const port = 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
