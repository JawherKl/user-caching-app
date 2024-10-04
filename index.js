const express = require('express');
const app = express();
app.use(express.json());

const { fetchPaginatedUsers, updateUser, getUser } = require('./db');
const { getFromCache, setToCache, invalidateCache } = require('./cache');

// API to fetch user profile
app.get('/user/:id', async (req, res) => {
    const userId = req.params.id;
    const cacheKey = `user:${userId}`;

    try {
        // Check if user data is cached in Redis
        const cachedUser = await getFromCache(cacheKey);

        if (cachedUser) {
            console.log('Cache hit');
            return res.json(cachedUser); // Return cached data
        }

        console.log('Cache miss');
        const result = getUser(userId);
        const user = (await result).rows[0];

        // Set result to Redis cache
        if (user) {
            await setToCache(cacheKey, user);
            console.log('Cache miss, fetching from PostgreSQL');
            res.json(user);
        } else {
            res.status(404).send('User not found');
        }
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Paginated user list endpoint
app.get('/users', async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const cacheKey = `users:page:${page}:limit:${limit}`;

    try {
        // Fetch from Redis cache
        const cachedUsers = await getFromCache(cacheKey);
        if (cachedUsers) {
            console.log('Cache hit');
            return res.json(cachedUsers);
        }

        // Fetch from PostgreSQL
        const users = await fetchPaginatedUsers(limit, offset);

        // Set result to Redis cache
        if (users) {
            await setToCache(cacheKey, users);
            console.log('Cache miss, fetching from PostgreSQL');
            return res.json(users);
        } else {
            res.status(404).send('Users not found');
        }
    } catch (error) {
        console.error('Error fetching paginated users:', error);
        return res.status(500).send('Error fetching users');
    }
});

// Update user profile and invalidate cache
app.put('/user/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email } = req.body;

    try {
        // Update user in PostgreSQL
        await updateUser(id, name, email);

        // Invalidate user list cache
        await invalidateCache('users:page:*');

        res.json({ id, name, email });
    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).send('Error updating user');
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
