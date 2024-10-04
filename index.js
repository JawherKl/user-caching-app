const express = require('express');
const app = express();
app.use(express.json());

const { fetchPaginatedUsers, updateUser, getUser, searchUsers, createUser } = require('./db');
const { getFromCache, setToCache, invalidateCache } = require('./cache');
const rateLimit = require('./rateLimiter');

app.set('trust proxy', true);

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
app.get('/users', rateLimit(5, 900), async (req, res) => {
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

// Search users by name or email
app.get('/search-users', async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ message: 'Query parameter is required' });
    }

    const cacheKey = `users:search:${query}`;

    try {
        // Fetch from Redis cache
        const cachedUsers = await getFromCache(cacheKey);
        if (cachedUsers) {
            console.log('Cache hit for search');
            return res.json(cachedUsers);
        }

        // Search in PostgreSQL
        const users = await searchUsers(query);

        // Store result in Redis with a TTL of 1 hour
        await setToCache(cacheKey, users);
        console.log('Cache miss, fetching search results from PostgreSQL');

        return res.json(users);
    } catch (error) {
        console.error('Error searching users:', error);
        return res.status(500).send('Error searching users');
    }
});

// Create a new user
app.post('/users', async (req, res) => {
    const { name, email } = req.body;

    // Validate input
    if (!name || !email) {
        return res.status(400).json({ message: 'Name and email are required' });
    }

    try {
        // Create the new user in the database
        const newUser = await createUser(name, email);

        // Invalidate the cache for the user list
        await invalidateCache('users:page:*');

        // Return the created user
        res.status(201).json(newUser);
    } catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).send('Internal Server Error');
    }
});

// Apply rate limit to the user routes
app.use('/users', rateLimit(100, 900)); // 5 requests every 900 seconds (15 minutes)

// You can apply it to specific routes too
app.use('/search-users', rateLimit(50, 600)); // 50 requests every 10 minutes

// Error handling middleware for invalid routes
app.use((req, res, next) => {
    res.status(404).json({ message: 'Route not found' });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
